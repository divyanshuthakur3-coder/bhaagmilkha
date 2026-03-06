import { create } from 'zustand';
import { auth } from '@/lib/api';
import { UserProfile } from '@/lib/types';

interface UserState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    fetchProfile: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    setProfile: (profile: UserProfile | null) => void;
    signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
    profile: null,
    isLoading: false,
    error: null,

    setProfile: (profile) => set({ profile }),

    fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
            const user = await auth.getUser();
            set({ profile: user as UserProfile, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false, profile: null });
        }
    },

    updateProfile: async (updates) => {
        const profile = get().profile;
        if (!profile) return;

        set({ isLoading: true, error: null });
        try {
            const updated = await auth.updateProfile(updates);
            set({ profile: updated as UserProfile, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    signOut: async () => {
        await auth.signOut();
        set({ profile: null, error: null });
    },
}));
