import { create } from 'zustand';
import { goalsApi } from '@/lib/api';
import { Goal, Run } from '@/lib/types';
import * as Notifications from 'expo-notifications';
import { GOAL_TYPES } from '@/constants/goalTypes';

interface GoalState {
    goals: Goal[];
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
    isLoading: false,
    error: null,

    fetchGoals: async (signal?: AbortSignal) => {
        set({ isLoading: true, error: null });
        try {
            const data = await goalsApi.getAll(signal);
            set({ goals: (data as Goal[]) || [], isLoading: false });
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
        try {
            await goalsApi.update(id, updates);
            set((state) => ({
                goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
            }));
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    deleteGoal: async (id) => {
        try {
            await goalsApi.delete(id);
            set((state) => ({
                goals: state.goals.filter((g) => g.id !== id),
            }));
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    deactivateGoal: async (id) => {
        try {
            await goalsApi.update(id, { is_active: false });
            set((state) => ({
                goals: state.goals.map((g) => (g.id === id ? { ...g, is_active: false } : g)),
            }));
        } catch (err: any) {
            set({ error: err.message });
        }
    },

    checkAndNotifyCompletion: async (runs) => {
        const { goals } = get();
        if (goals.length === 0 || runs.length === 0) return;

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekRuns = runs.filter((r) => new Date(r.started_at) >= weekStart);

        for (const goal of goals) {
            if (!goal.is_active) continue;

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
                    // Just check if today contributed to a milestone? 
                    // Streak is complex for "notification on completion". 
                    // Let's stick to the 100% ones first.
                    break;
            }

            if (currentValue >= goal.target_value) {
                const typeLabel = GOAL_TYPES.find(t => t.type === goal.type)?.label || 'Goal';
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Goal Complete! 🏆',
                        body: `You've reached your ${typeLabel} target of ${goal.target_value} ${GOAL_TYPES.find(t => t.type === goal.type)?.unit || ''}!`,
                        sound: true,
                    },
                    trigger: null, // immediate
                });
            }
        }
    },
}));
