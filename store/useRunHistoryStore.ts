import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
import * as Notifications from 'expo-notifications';
import { runOnUI, runOnJS } from 'react-native-reanimated';
import { runsApi, achievementsApi, shoesApi } from '@/lib/api';
import { Run, Coordinate } from '@/lib/types';
import { douglasPeucker } from '@/lib/douglasPeucker';
import { enqueue } from '@/lib/offlineQueue';
import { ACHIEVEMENTS, AchievementCheckStats } from '@/constants/achievements';
import { calculateTRIMP, detectPersonalRecords } from '@/lib/performance';
import { calculateElevationGain } from '@/lib/paceCalculator';
import { useGoalStore } from './useGoalStore';

interface RunHistoryState {
    runs: Run[];
    isLoading: boolean;
    error: string | null;

    fetchRuns: (signal?: AbortSignal) => Promise<void>;
    saveRun: (run: Omit<Run, 'id'>) => Promise<{ run: Run; prs: string[] } | null>;
    deleteRun: (id: string) => Promise<void>;
    updateRun: (id: string, updates: Partial<Run>) => Promise<void>;
    getRunById: (id: string) => Run | undefined;
    getBestPace: (distanceKm: number) => number | null;
}

export const useRunHistoryStore = create<RunHistoryState>()(
    persist(
        (set, get) => ({
            runs: [],
            isLoading: false,
            error: null,

            fetchRuns: async (signal?: AbortSignal) => {
                set({ isLoading: true, error: null });
                try {
                    const data = await runsApi.getAll(signal);
                    set({ runs: (data as Run[]) || [], isLoading: false });
                } catch (err: any) {
                    if (err.name === 'AbortError') return;
                    set({ error: err.message, isLoading: false });
                }
            },

            saveRun: async (runData) => {
                set({ isLoading: true, error: null });
                try {
                    // Offload simplification to the UI thread via a Worklet
                    const simplifiedCoords = await new Promise<Coordinate[]>((resolve) => {
                        runOnUI(() => {
                            const result = douglasPeucker(runData.route_coordinates, 5);
                            runOnJS(resolve)(result);
                        })();
                    });

                    const runToSave = {
                        ...runData,
                        route_coordinates: simplifiedCoords,
                        elevation_gain: calculateElevationGain(runData.route_coordinates),
                    };

                    try {
                        const savedRun = await runsApi.save(runToSave);
                        set((state) => ({
                            runs: [savedRun as Run, ...state.runs],
                            isLoading: false,
                        }));

                        // Check achievements, goals, and shoe life after saving
                        const [earnedPrs] = await Promise.all([
                            detectPersonalRecords(savedRun as Run, get().runs),
                            checkAchievements(savedRun as Run, get().runs),
                            useGoalStore.getState().checkAndNotifyCompletion(get().runs),
                            checkShoeLife(savedRun as Run),
                        ]);
                        return { run: savedRun as Run, prs: earnedPrs as string[] };
                    } catch {
                        // Offline fallback — enqueue for later sync
                        enqueue({
                            table: 'runs',
                            type: 'insert',
                            data: runToSave,
                        });
                        const localRun = { ...runToSave, id: `local-${Date.now()}` } as Run;
                        set((state) => ({
                            runs: [localRun, ...state.runs],
                            isLoading: false,
                        }));
                        // Check goals even for local runs
                        useGoalStore.getState().checkAndNotifyCompletion(get().runs);
                        return { run: localRun, prs: [] }; // No PRs for local saves usually
                    }
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                    return null;
                }
            },

            deleteRun: async (id: string) => {
                set({ isLoading: true, error: null });
                try {
                    if (!id.startsWith('local-')) {
                        await runsApi.delete(id);
                    }
                    set((state) => ({
                        runs: state.runs.filter((r) => r.id !== id),
                        isLoading: false,
                    }));
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            updateRun: async (id, updates) => {
                set({ isLoading: true, error: null });
                try {
                    if (!id.startsWith('local-')) {
                        await runsApi.update(id, updates);
                    }
                    set((state) => ({
                        runs: state.runs.map((r) => (r.id === id ? { ...r, ...updates } : r)),
                        isLoading: false,
                    }));
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            getRunById: (id: string) => {
                return get().runs.find((r) => r.id === id);
            },

            getBestPace: (distanceKm: number) => {
                const runs = get().runs;
                const relevantRuns = runs.filter(r => r.distance_km >= distanceKm && r.avg_pace_min_per_km > 0);
                if (relevantRuns.length === 0) return null;
                return Math.min(...relevantRuns.map(r => r.avg_pace_min_per_km));
            },
        }),
        {
            name: 'run-history-storage',
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({ runs: state.runs }), // Only persist the runs list
        }
    )
);

// Check and award achievements
async function checkAchievements(lastRun: Run, allRuns: Run[]) {
    try {
        const existingData = await achievementsApi.getAll();
        const earnedBadges = new Set((existingData || []).map((a: any) => a.badge_type));

        const totalRuns = allRuns.length;
        const totalDistanceKm = allRuns.reduce((sum, r) => sum + r.distance_km, 0);
        const bestPace = allRuns.reduce((best, r) => {
            if (r.avg_pace_min_per_km > 0 && (best === 0 || r.avg_pace_min_per_km < best)) {
                return r.avg_pace_min_per_km;
            }
            return best;
        }, 0);
        const longestRunKm = Math.max(...allRuns.map((r) => r.distance_km), 0);

        const sortedDates = Array.from(
            new Set(allRuns.map((r) => new Date(r.started_at).toDateString()))
        ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        let streak = 1;
        let maxStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const diff = new Date(sortedDates[i - 1]).getTime() - new Date(sortedDates[i]).getTime();
            if (diff <= 86400000 * 1.5) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }

        const stats: AchievementCheckStats = {
            totalRuns,
            totalDistanceKm,
            bestPaceMinPerKm: bestPace,
            longestRunKm,
            longestStreakDays: sortedDates.length > 0 ? maxStreak : 0,
            lastRunDistanceKm: lastRun.distance_km,
            lastRunStartTime: new Date(lastRun.started_at),
            lastRunElevationGain: 0, // Simplified
        };

        for (const achievement of ACHIEVEMENTS) {
            if (earnedBadges.has(achievement.id)) continue;
            if (achievement.check(stats)) {
                await achievementsApi.create(achievement.id);
            }
        }
    } catch (err) {
        console.error('Achievement check failed:', err);
    }
}

/**
 * Check if the shoe used in the run is nearing its end of life.
 */
async function checkShoeLife(run: Run) {
    if (!run.shoe_id) return;

    try {
        // Fetch fresh shoe data since mileage was updated on the server
        const shoe = await shoesApi.getById(run.shoe_id);
        if (!shoe || !shoe.max_km) return;

        const usageRatio = shoe.total_km / shoe.max_km;

        if (usageRatio >= 1.0) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "👟 Shoe Retirement Alert",
                    body: `Your ${shoe.brand} ${shoe.name} has reached its limit (${shoe.total_km.toFixed(0)}km). Time for a new pair!`,
                    sound: true,
                },
                trigger: null,
            });
        } else if (usageRatio >= 0.9) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "⚠️ Shoe Life Warning",
                    body: `Your ${shoe.brand} ${shoe.name} is at 90% capacity. Consider getting a replacement soon.`,
                    sound: true,
                },
                trigger: null,
            });
        }
    } catch (err) {
        console.warn('Failed to check shoe life:', err);
    }
}
