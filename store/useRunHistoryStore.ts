import { create } from 'zustand';
import { runsApi, achievementsApi } from '@/lib/api';
import { Run } from '@/lib/types';
import { douglasPeucker } from '@/lib/douglasPeucker';
import { enqueue } from '@/lib/offlineQueue';
import { ACHIEVEMENTS, AchievementCheckStats } from '@/constants/achievements';

interface RunHistoryState {
    runs: Run[];
    isLoading: boolean;
    error: string | null;

    fetchRuns: () => Promise<void>;
    saveRun: (run: Omit<Run, 'id'>) => Promise<Run | null>;
    deleteRun: (id: string) => Promise<void>;
    updateRunNotes: (id: string, notes: string) => Promise<void>;
    getRunById: (id: string) => Run | undefined;
}

export const useRunHistoryStore = create<RunHistoryState>((set, get) => ({
    runs: [],
    isLoading: false,
    error: null,

    fetchRuns: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await runsApi.getAll();
            set({ runs: (data as Run[]) || [], isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    saveRun: async (runData) => {
        set({ isLoading: true, error: null });
        try {
            // Simplify route before saving
            const simplifiedCoords = douglasPeucker(runData.route_coordinates, 5);

            const runToSave = {
                ...runData,
                route_coordinates: simplifiedCoords,
            };

            try {
                const savedRun = await runsApi.save(runToSave);
                set((state) => ({
                    runs: [savedRun as Run, ...state.runs],
                    isLoading: false,
                }));

                // Check achievements after saving
                await checkAchievements(savedRun as Run, get().runs);
                return savedRun as Run;
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
                return localRun;
            }
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            return null;
        }
    },

    deleteRun: async (id: string) => {
        try {
            if (!id.startsWith('local-')) {
                await runsApi.delete(id);
            }
            set((state) => ({
                runs: state.runs.filter((r) => r.id !== id),
            }));
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    updateRunNotes: async (id: string, notes: string) => {
        try {
            if (!id.startsWith('local-')) {
                await runsApi.updateNotes(id, notes);
            }
            set((state) => ({
                runs: state.runs.map((r) => (r.id === id ? { ...r, notes } : r)),
            }));
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    getRunById: (id: string) => {
        return get().runs.find((r) => r.id === id);
    },
}));

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
