import { achievementsApi } from '@/lib/api';
import { Run } from '@/lib/types';
import { ACHIEVEMENTS, AchievementCheckStats } from '@/constants/achievements';

/**
 * Checks all achievements against the current runs and awards any new ones.
 * Called automatically after a run is saved.
 */
export async function checkAndAwardAchievements(lastRun: Run, allRuns: Run[]): Promise<void> {
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

        // Calculate streak
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
            lastRunElevationGain: 0,
        };

        for (const achievement of ACHIEVEMENTS) {
            if (earnedBadges.has(achievement.id)) continue;
            if (achievement.check(stats)) {
                try {
                    await achievementsApi.create(achievement.id);
                } catch {
                    // Ignore duplicate errors
                }
            }
        }
    } catch (err) {
        console.error('Achievement check failed:', err);
    }
}
