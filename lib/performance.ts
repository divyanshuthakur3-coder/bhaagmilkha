import { Run, Coordinate } from './types';

/**
 * Personal Record (PR) distances in kilometers
 */
export const PR_DISTANCES = {
    '1K': 1,
    '5K': 5,
    '10K': 10,
    'HALF': 21.1,
    'FULL': 42.195,
};

export interface PersonalRecord {
    distanceLabel: string;
    timeSeconds: number;
    runId: string;
    date: string;
}

/**
 * Calculates Training Impulse (TRIMP) score for a run.
 * Simple version: intensity (pace-based) * duration.
 * MET for running is roughly 9.8. 
 * We use a relative intensity factor based on pace.
 */
export function calculateTRIMP(durationSeconds: number, avgPaceMinPerKm: number): number {
    if (durationSeconds === 0 || avgPaceMinPerKm === 0) return 0;

    // Intensity factor: faster is higher. 6:00 min/km = 1.0
    // 4:00 min/km = 1.5, 8:00 min/km = 0.75
    const intensity = 6 / avgPaceMinPerKm;
    const durationMinutes = durationSeconds / 60;

    return Math.round(durationMinutes * intensity);
}

/**
 * Detects if a new run set any personal records compared to history.
 */
export function detectPersonalRecords(newRun: Run, history: Run[]): string[] {
    const newPrs: string[] = [];
    const pastRuns = history.filter(r => r.id !== newRun.id);

    // 1. Check Distance PR (longest run)
    const longestPast = pastRuns.length > 0
        ? Math.max(...pastRuns.map(r => r.distance_km))
        : 0;

    if (newRun.distance_km > longestPast && newRun.distance_km > 0.5) {
        newPrs.push('Longest Run');
    }

    // 2. Check Time PRs for standard distances
    // Note: This is an approximation based on avg pace. 
    // In a future version, we could scan splits for best segments.
    Object.entries(PR_DISTANCES).forEach(([label, dist]) => {
        if (newRun.distance_km >= dist) {
            const newTime = newRun.avg_pace_min_per_km * dist * 60;

            const bestPastTime = pastRuns
                .filter(r => r.distance_km >= dist)
                .map(r => r.avg_pace_min_per_km * dist * 60);

            const recordPast = bestPastTime.length > 0 ? Math.min(...bestPastTime) : Infinity;

            if (newTime < recordPast) {
                newPrs.push(`Best ${label}`);
            }
        }
    });

    return newPrs;
}

/**
 * Compares a run against the average of the last 30 days.
 */
export function compareToAverage(run: Run, history: Run[]) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRuns = history.filter(r =>
        r.id !== run.id &&
        new Date(r.started_at) > thirtyDaysAgo
    );

    if (recentRuns.length === 0) return null;

    const avgDistance = recentRuns.reduce((sum, r) => sum + r.distance_km, 0) / recentRuns.length;
    const avgPace = recentRuns.reduce((sum, r) => sum + r.avg_pace_min_per_km, 0) / recentRuns.length;

    return {
        distanceDiff: ((run.distance_km - avgDistance) / avgDistance) * 100,
        paceDiff: ((avgPace - run.avg_pace_min_per_km) / avgPace) * 100, // Positive means faster
    };
}
