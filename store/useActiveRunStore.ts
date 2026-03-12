import { create } from 'zustand';
import { Coordinate, Split } from '@/lib/types';
import { totalDistance } from '@/lib/haversine';
import { calculatePace, calculateCurrentPace, calculateCalories } from '@/lib/paceCalculator';

interface ActiveRunState {
    isActive: boolean;
    isPaused: boolean;
    isAutoPaused: boolean;
    startTime: number | null;
    coordinates: Coordinate[];
    distance: number; // km
    duration: number; // seconds
    currentPace: number; // min/km
    avgPace: number; // min/km
    calories: number;
    splits: Split[]; // per-km splits
    lastSplitDistance: number; // km threshold for next split
    lastSplitTime: number; // time at last split

    // Warmup timer
    warmupCountdown: number; // seconds remaining, 0 = not active
    warmupActive: boolean;
    userWeightKg: number;

    startRun: () => void;
    pauseRun: () => void;
    resumeRun: () => void;
    stopRun: () => void;
    addCoordinate: (coord: Coordinate, unit?: 'km' | 'mi') => void;
    setAutoPaused: (paused: boolean) => void;
    updateDuration: (seconds: number) => void;
    setWarmup: (seconds: number) => void;
    tickWarmup: () => boolean; // returns true when warmup finishes
    setUserWeight: (kg: number) => void;

    // Ghost Runner
    ghostPace: number; // min/km
    isGhostEnabled: boolean;
    setGhostPace: (pace: number) => void;
    toggleGhost: (enabled: boolean) => void;

    reset: () => void;
}

const initialState = {
    isActive: false,
    isPaused: false,
    isAutoPaused: false,
    startTime: null as number | null,
    coordinates: [] as Coordinate[],
    distance: 0,
    duration: 0,
    currentPace: 0,
    avgPace: 0,
    calories: 0,
    splits: [] as Split[],
    lastSplitDistance: 1, // first split at 1km
    lastSplitTime: 0,
    warmupCountdown: 0,
    warmupActive: false,
    ghostPace: 5.5, // Default 5:30 min/km
    isGhostEnabled: false,
    userWeightKg: 70,
};

export const useActiveRunStore = create<ActiveRunState>((set, get) => ({
    ...initialState,

    startRun: () => {
        set({
            isActive: true,
            isPaused: false,
            isAutoPaused: false,
            startTime: Date.now(),
            coordinates: [],
            distance: 0,
            duration: 0,
            currentPace: 0,
            avgPace: 0,
            calories: 0,
            splits: [],
            lastSplitDistance: 1,
            lastSplitTime: 0,
            warmupCountdown: 0,
            warmupActive: false,
        });
    },

    pauseRun: () => {
        set({ isPaused: true });
    },

    resumeRun: () => {
        set({ isPaused: false, isAutoPaused: false });
    },

    stopRun: () => {
        set({ isActive: false, isPaused: false, isAutoPaused: false });
    },

    setAutoPaused: (paused: boolean) => {
        set({ isAutoPaused: paused });
    },

    addCoordinate: (coord: Coordinate, preferredUnit: 'km' | 'mi' = 'km') => {
        const state = get();
        if (!state.isActive || state.isPaused || state.isAutoPaused) return;

        const newCoords = [...state.coordinates, coord];
        const dist = totalDistance(newCoords);
        const curPace = calculateCurrentPace(newCoords);
        const avgPace = calculatePace(dist, state.duration);

        // Unit-aware split interval (e.g. 1.0 km or 1.609 km)
        const splitInterval = preferredUnit === 'mi' ? 1.60934 : 1.0;

        let newSplits = state.splits;
        let newSplitDist = state.lastSplitDistance;
        let newSplitTime = state.lastSplitTime;

        if (dist >= state.lastSplitDistance * splitInterval) {
            const splitTime = state.duration - state.lastSplitTime;
            // splitPace is calculated relative to the splitInterval
            const splitPace = splitTime / 60 / splitInterval;
            newSplits = [
                ...state.splits,
                {
                    km: state.lastSplitDistance, // Position of the split (1st mile/km, 2nd, etc.)
                    time_seconds: splitTime,
                    pace_min_per_km: splitPace,
                },
            ];
            newSplitDist = state.lastSplitDistance + 1;
            newSplitTime = state.duration;
        }

        set({
            coordinates: newCoords,
            distance: dist,
            currentPace: curPace,
            avgPace: avgPace,
            splits: newSplits,
            lastSplitDistance: newSplitDist,
            lastSplitTime: newSplitTime,
        });
    },

    updateDuration: (seconds: number) => {
        const state = get();
        const avgPace = calculatePace(state.distance, seconds);
        const cal = calculateCalories(seconds, state.userWeightKg || 70);
        set({ duration: seconds, avgPace, calories: cal });
    },

    setUserWeight: (kg: number) => set({ userWeightKg: kg }),

    setWarmup: (seconds: number) => {
        set({ warmupCountdown: seconds, warmupActive: seconds > 0 });
    },

    tickWarmup: () => {
        const state = get();
        if (!state.warmupActive) return false;
        const next = state.warmupCountdown - 1;
        if (next <= 0) {
            set({ warmupCountdown: 0, warmupActive: false });
            return true; // warmup finished
        }
        set({ warmupCountdown: next });
        return false;
    },

    setGhostPace: (pace: number) => set({ ghostPace: pace }),
    toggleGhost: (enabled: boolean) => set({ isGhostEnabled: enabled }),

    reset: () => {
        set(initialState);
    },
}));
