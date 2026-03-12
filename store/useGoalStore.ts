import { create } from 'zustand';
import { goalsApi } from '@/lib/api';
import { Goal, Run } from '@/lib/types';
import * as Notifications from 'expo-notifications';
import { GOAL_TYPES } from '@/constants/goalTypes';

function getISOWeekNumber(d: Date): number {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

interface GoalState {
    goals: Goal[];
    notifiedGoalIds: Set<string>;
    lastResetWeek: number;
    isLoading: boolean;
    error: string | null;

    fetchGoals: (signal?: AbortSignal) => Promise<void>;
    addGoal: (goal: Omit<Goal, 'id' | 'created_at'>) => Promise<void>;
    updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    deactivateGoal: (id: string) => Promise<void>;
    checkAndNotifyCompletion: (runs: Run[]) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
    goals: [],
    notifiedGoalIds: new Set<string>(),
    lastResetWeek: getISOWeekNumber(new Date()),
    isLoading: false,
    error: null,

    fetchGoals: async (signal?: AbortSignal) => {
        set({ isLoading: true, error: null });
        try {
            const data = await goalsApi.getAll(signal);
            const goals = (data as Goal[]) || [];
            set({ goals, isLoading: false });
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            set({ error: err.message, isLoading: false });
        }
    },

    addGoal: async (goalData) => {
        set({ isLoading: true, error: null });
        try {
            const data = await goalsApi.create(goalData);
            set((state) => ({
                goals: [data as Goal, ...state.goals],
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    updateGoal: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            await goalsApi.update(id, updates);
            set((state) => ({
                goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    deleteGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await goalsApi.delete(id);
            set((state) => ({
                goals: state.goals.filter((g) => g.id !== id),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    deactivateGoal: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await goalsApi.update(id, { is_active: false });
            set((state) => ({
                goals: state.goals.map((g) => (g.id === id ? { ...g, is_active: false } : g)),
                isLoading: false,
            }));
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    checkAndNotifyCompletion: async (runs) => {
        const { goals, notifiedGoalIds, lastResetWeek } = get();
        if (goals.length === 0 || runs.length === 0) return;

        const now = new Date();
        const currentWeek = getISOWeekNumber(now);

        // Reset notifiedGoalIds if we've entered a new week
        let activeNotified = notifiedGoalIds;
        if (currentWeek !== lastResetWeek) {
            activeNotified = new Set<string>();
            set({ notifiedGoalIds: activeNotified, lastResetWeek: currentWeek });
        }

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekRuns = runs.filter((r) => new Date(r.started_at) >= weekStart);
        const newNotified = new Set(activeNotified);

        for (const goal of goals) {
            if (!goal.is_active || newNotified.has(goal.id)) continue;

            let currentValue = 0;
            switch (goal.type) {
                case 'weekly_distance':
                    currentValue = thisWeekRuns.reduce((sum, r) => sum + r.distance_km, 0);
                    break;
                case 'weekly_time':
                    currentValue = thisWeekRuns.reduce((sum, r) => sum + r.duration_seconds / 3600, 0);
                    break;
                case 'weekly_run_count':
                    currentValue = thisWeekRuns.length;
                    break;
                case 'pace_target':
                    const bestPace = thisWeekRuns.reduce((best, r) => {
                        if (r.avg_pace_min_per_km > 0 && (best === 0 || r.avg_pace_min_per_km < best)) return r.avg_pace_min_per_km;
                        return best;
                    }, 0);
                    if (bestPace > 0 && bestPace <= goal.target_value) currentValue = goal.target_value;
                    break;
                case 'streak':
                    break;
            }

            if (currentValue >= goal.target_value) {
                newNotified.add(goal.id);
                const typeLabel = GOAL_TYPES.find(t => t.type === goal.type)?.label || 'Goal';
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Goal Complete! 🏆',
                        body: `You've reached your ${typeLabel} target of ${goal.target_value} ${GOAL_TYPES.find(t => t.type === goal.type)?.unit || ''}!`,
                        sound: true,
                    },
                    trigger: null,
                });
            }
        }
        set({ notifiedGoalIds: newNotified });
    },
}));
