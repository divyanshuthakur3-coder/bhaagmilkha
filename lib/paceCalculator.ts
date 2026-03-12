import { Coordinate } from './types';
import { haversineDistance } from './haversine';

/**
 * Calculate pace in minutes per kilometer.
 */
export function calculatePace(distanceKm: number, durationSeconds: number): number {
    if (distanceKm <= 0) return 0;
    return durationSeconds / 60 / distanceKm;
}

/**
 * Calculate current pace from the most recent coordinates (last ~10 seconds).
 * Uses the most recent coords to estimate instantaneous pace.
 */
export function calculateCurrentPace(coordinates: Coordinate[], windowMs: number = 10000): number {
    if (coordinates.length < 2) return 0;

    const now = coordinates[coordinates.length - 1].timestamp;
    const windowStart = now - windowMs;

    // Find coordinates within the time window
    const recentCoords = coordinates.filter((c) => c.timestamp >= windowStart);
    if (recentCoords.length < 2) return 0;

    let distance = 0;
    for (let i = 1; i < recentCoords.length; i++) {
        distance += haversineDistance(
            recentCoords[i - 1].lat,
            recentCoords[i - 1].lng,
            recentCoords[i].lat,
            recentCoords[i].lng
        );
    }

    const elapsedMs = recentCoords[recentCoords.length - 1].timestamp - recentCoords[0].timestamp;
    if (distance <= 0 || elapsedMs <= 0) return 0;

    const elapsedMin = elapsedMs / 1000 / 60;
    return elapsedMin / distance; // min per km
}

/**
 * Calculate calories burned using MET-based formula.
 * MET for running ≈ 9.8 (moderate running ~6 min/km)
 * Formula: Calories = MET × weight_kg × duration_hours
 */
export function calculateCalories(
    durationSeconds: number,
    weightKg: number = 70
): number {
    const MET = 9.8;
    const durationHours = durationSeconds / 3600;
    return Math.round(MET * weightKg * durationHours);
}

/**
 * Calculate speed in m/s from two consecutive coordinates.
 */
export function calculateSpeed(a: Coordinate, b: Coordinate): number {
    const distanceKm = haversineDistance(a.lat, a.lng, b.lat, b.lng);
    const distanceM = distanceKm * 1000;
    const timeDiffS = (b.timestamp - a.timestamp) / 1000;
    if (timeDiffS <= 0) return 0;
    return distanceM / timeDiffS;
}

/**
 * Calculate cumulative elevation gain in meters.
 * Only counts upward movements > 2m to filter sensor noise.
 */
export function calculateElevationGain(coordinates: Coordinate[]): number {
    if (coordinates.length < 2) return 0;

    let totalGain = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];

        if (prev.altitude !== undefined && curr.altitude !== undefined) {
            const diff = curr.altitude - prev.altitude;
            if (diff > 2) { // 2m threshold to filter altitude sensor jitter
                totalGain += diff;
            }
        }
    }

    return Math.round(totalGain);
}
