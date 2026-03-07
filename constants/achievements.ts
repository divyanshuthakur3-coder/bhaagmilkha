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
    lastRunStartTime?: Date;
    lastRunElevationGain?: number;
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
    {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Finish a run before 7 AM',
        icon: '🌅',
        check: (s) => (s.lastRunStartTime?.getHours() ?? 12) < 7,
    },
    {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Finish a run after 9 PM',
        icon: '🦉',
        check: (s) => (s.lastRunStartTime?.getHours() ?? 0) >= 21,
    },
    {
        id: 'climber',
        title: 'Climber',
        description: 'Complete a run with elevation gain (> 20m)',
        icon: '🏔️',
        check: (s) => (s.lastRunElevationGain ?? 0) > 20,
    },
    {
        id: 'elite_climber',
        title: 'Elite Climber',
        description: 'Complete a run with > 100m elevation gain',
        icon: '⛰️',
        check: (s) => (s.lastRunElevationGain ?? 0) > 100,
    },
    {
        id: 'marathon',
        title: 'Marathoner',
        description: 'Complete a full marathon (42.2 km)',
        icon: '👑',
        check: (s) => (s.lastRunDistanceKm ?? 0) >= 42.195,
    },
    {
        id: 'weekend_warrior',
        title: 'Weekend Warrior',
        description: 'Complete a run on a weekend',
        icon: '⚔️',
        check: (s) => {
            const day = s.lastRunStartTime?.getDay();
            return day === 0 || day === 6;
        },
    },
    {
        id: 'streak_master',
        title: 'Streak Master',
        description: 'Maintain a 14-day running streak',
        icon: '🔥',
        check: (s) => s.longestStreakDays >= 14,
    },
    {
        id: 'thirty_runs',
        title: 'Persistent',
        description: 'Complete 30 runs',
        icon: '🛡️',
        check: (s) => s.totalRuns >= 30,
    },
    {
        id: 'hundred_runs',
        title: 'Elite Centurion',
        description: 'Complete 100 runs',
        icon: '🏛️',
        check: (s) => s.totalRuns >= 100,
    },
    {
        id: 'two_fifty_km',
        title: 'Kilometer Crusader',
        description: 'Run 250 km total',
        icon: '🛡️',
        check: (s) => s.totalDistanceKm >= 250,
    },
    {
        id: 'five_hundred_km',
        title: 'Global Traveler',
        description: 'Run 500 km total',
        icon: '🌎',
        check: (s) => s.totalDistanceKm >= 500,
    },
    {
        id: 'thousand_km',
        title: 'Earthbound',
        description: 'Run 1,000 km total',
        icon: '🚀',
        check: (s) => s.totalDistanceKm >= 1000,
    },
    {
        id: 'sprint_king',
        title: 'Sprint King',
        description: 'Achieve a pace under 4:15 min/km',
        icon: '🦅',
        check: (s) => s.bestPaceMinPerKm > 0 && s.bestPaceMinPerKm < 4.25,
    },
];
