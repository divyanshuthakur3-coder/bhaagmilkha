import { create } from 'zustand';
import { goalsApi } from '@/lib/api';
import { Goal } from '@/lib/types';

interface GoalState {
    goals: Goal[];
    isLoading: boolean;
    error: string | null;

    fetchGoals: () => Promise<void>;
    addGoal: (goal: Omit<Goal, 'id' | 'created_at'>) => Promise<void>;
    updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    deactivateGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
    goals: [],
    isLoading: false,
    error: null,

    fetchGoals: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await goalsApi.getAll();
            set({ goals: (data as Goal[]) || [], isLoading: false });
        } catch (err: any) {
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
}));
