import { Coordinate } from './types';

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Calculate distance between two GPS coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculate total distance from an array of coordinates.
 * Returns distance in kilometers.
 */
export function totalDistance(coordinates: Coordinate[]): number {
    if (coordinates.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        total += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }

    return total;
}

/**
 * Calculate distance between two Coordinate objects.
 */
export function distanceBetween(a: Coordinate, b: Coordinate): number {
    return haversineDistance(a.lat, a.lng, b.lat, b.lng);
}
