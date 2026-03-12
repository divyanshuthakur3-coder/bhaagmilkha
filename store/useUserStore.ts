import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/lib/api';
import { UserProfile } from '@/lib/types';

interface UserState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    fetchProfile: (signal?: AbortSignal) => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    setProfile: (profile: UserProfile | null) => void;
    signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            profile: null,
            isLoading: false,
            error: null,

            setProfile: (profile) => set({ profile }),

            fetchProfile: async (signal?: AbortSignal) => {
                set({ isLoading: true, error: null });
                try {
                    const user = await auth.getUser(signal);
                    set({ profile: user as UserProfile, isLoading: false });
                } catch (err: any) {
                    if (err.name === 'AbortError') return;
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
                set({ isLoading: true, error: null });
                try {
                    await auth.signOut();
                    set({ profile: null, error: null, isLoading: false });
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ profile: state.profile }), // Only persist the profile
        }
    )
);
