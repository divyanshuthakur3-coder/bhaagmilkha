import { PreferredUnit } from './types';

const KM_TO_MI = 0.621371;
const MIN_PER_KM_TO_MIN_PER_MI = 1.60934;

/**
 * Format distance with unit conversion.
 */
export function formatDistance(km: number, unit: PreferredUnit = 'km'): string {
    if (unit === 'mi') {
        const mi = km * KM_TO_MI;
        return `${mi.toFixed(2)} mi`;
    }
    return `${km.toFixed(2)} km`;
}

/**
 * Format distance as a raw number (no unit label).
 */
export function formatDistanceValue(km: number, unit: PreferredUnit = 'km'): string {
    if (unit === 'mi') {
        return (km * KM_TO_MI).toFixed(2);
    }
    return km.toFixed(2);
}

/**
 * Get unit label.
 */
export function getDistanceUnit(unit: PreferredUnit = 'km'): string {
    return unit === 'mi' ? 'mi' : 'km';
}

/**
 * Format pace (min per km or min per mi).
 */
export function formatPace(minPerKm: number, unit: PreferredUnit = 'km'): string {
    if (minPerKm <= 0) return '--:--';

    let pace = minPerKm;
    if (unit === 'mi') {
        pace = minPerKm * MIN_PER_KM_TO_MIN_PER_MI;
    }

    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);

    // Fix: Handle rounding up to 60 seconds
    const finalMins = secs === 60 ? mins + 1 : mins;
    const finalSecs = secs === 60 ? 0 : secs;

    const unitLabel = unit === 'mi' ? '/mi' : '/km';
    return `${finalMins}:${finalSecs.toString().padStart(2, '0')}${unitLabel}`;
}

/**
 * Format pace value without unit.
 */
export function formatPaceValue(minPerKm: number, unit: PreferredUnit = 'km'): string {
    if (minPerKm <= 0) return '--:--';

    let pace = minPerKm;
    if (unit === 'mi') {
        pace = minPerKm * MIN_PER_KM_TO_MIN_PER_MI;
    }

    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);

    // Fix: Handle rounding up to 60 seconds
    const finalMins = secs === 60 ? mins + 1 : mins;
    const finalSecs = secs === 60 ? 0 : secs;

    return `${finalMins}:${finalSecs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS.
 */
export function formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format calories.
 */
export function formatCalories(cal: number): string {
    return `${Math.round(cal)} kcal`;
}

/**
 * Format date relatively (e.g., "Today", "Yesterday", "3 days ago") or as absolute date.
 */
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
}

/**
 * Format date with time.
 */
export function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Get time-based greeting.
 */
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

/**
 * Convert km to user's preferred unit (raw number).
 */
export function convertDistance(km: number, unit: PreferredUnit): number {
    return unit === 'mi' ? km * KM_TO_MI : km;
}

/**
 * Calculate Performance Score (0-100).
 * Based on distance, speed, and consistency.
 */
export function calculateRunScore(distanceKm: number, avgPaceMinKm: number, splits: { pace_min_per_km: number }[] = []): number {
    if (distanceKm <= 0 || avgPaceMinKm <= 0) return 0;

    // Base score for distance (e.g. 5K = 30 points, 21K = 50 points)
    const distScore = Math.min(50, Math.sqrt(distanceKm) * 10);

    // Speed score (5 min/km is decent, 4 min/km is very fast)
    // 6 min/km -> 20, 5 min/km -> 30, 4 min/km -> 45
    const speedScore = Math.max(0, Math.min(50, (10 - avgPaceMinKm) * 8));

    // Consistency score (optional bonus if we have splits)
    let bonus = 0;
    if (splits.length > 1) {
        const paces = splits.map(s => s.pace_min_per_km);
        const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
        const variance = paces.reduce((a, b) => a + (b - mean) ** 2, 0) / paces.length;
        const stdDev = Math.sqrt(variance);

        // Deduct points for high standard deviation (inconsistency)
        // stdDev of 0.1 min/km is very consistent. 1.0 is very inconsistent.
        bonus = Math.max(0, 10 - stdDev * 10);
    }

    const rawScore = distScore + speedScore + bonus;
    return Math.round(Math.min(100, Math.max(10, rawScore)));
}
