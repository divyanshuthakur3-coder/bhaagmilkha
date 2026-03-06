export interface AchievementDef {
    id: string;
    title: string;
    description: string;
    icon: string;
    check: (stats: AchievementCheckStats) => boolean;
}

export interface AchievementCheckStats {
    totalRuns: number;
    totalDistanceKm: number;
    bestPaceMinPerKm: number;
    longestRunKm: number;
    longestStreakDays: number;
    lastRunDistanceKm?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    {
        id: 'first_run',
        title: 'First Steps',
        description: 'Complete your first run',
        icon: '🏃',
        check: (s) => s.totalRuns >= 1,
    },
    {
        id: 'five_runs',
        title: '5 Runs Club',
        description: 'Complete 5 runs',
        icon: '🎯',
        check: (s) => s.totalRuns >= 5,
    },
    {
        id: 'ten_runs',
        title: '10 Runs Club',
        description: 'Complete 10 runs',
        icon: '🔥',
        check: (s) => s.totalRuns >= 10,
    },
    {
        id: 'fifty_runs',
        title: '50 Runs Club',
        description: 'Complete 50 runs',
        icon: '💎',
        check: (s) => s.totalRuns >= 50,
    },
    {
        id: 'five_k',
        title: '5K Finisher',
        description: 'Complete a 5K run',
        icon: '🏅',
        check: (s) => (s.lastRunDistanceKm ?? 0) >= 5,
    },
    {
        id: 'ten_k',
        title: '10K Finisher',
        description: 'Complete a 10K run',
        icon: '🥇',
        check: (s) => (s.lastRunDistanceKm ?? 0) >= 10,
    },
    {
        id: 'half_marathon',
        title: 'Half Marathon',
        description: 'Complete a half marathon (21.1 km)',
        icon: '🏆',
        check: (s) => (s.lastRunDistanceKm ?? 0) >= 21.1,
    },
    {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Achieve a pace under 5 min/km',
        icon: '⚡',
        check: (s) => s.bestPaceMinPerKm > 0 && s.bestPaceMinPerKm < 5,
    },
    {
        id: 'consistent',
        title: 'Consistent',
        description: 'Maintain a 7-day running streak',
        icon: '📅',
        check: (s) => s.longestStreakDays >= 7,
    },
    {
        id: 'century',
        title: 'Century Club',
        description: 'Run 100 km total',
        icon: '💯',
        check: (s) => s.totalDistanceKm >= 100,
    },
];
