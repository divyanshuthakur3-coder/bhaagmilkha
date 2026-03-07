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

/**
 * Finds a coordinate at a specific distance along a path.
 * If distance exceeds path, it returns the last point (or optionally projects).
 */
export function getPointAtDistance(coordinates: Coordinate[], targetDistance: number): Coordinate | null {
    if (coordinates.length === 0) return null;
    if (targetDistance <= 0) return coordinates[0];

    let currentDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        const segDist = distanceBetween(prev, curr);

        if (currentDistance + segDist >= targetDistance) {
            const fraction = (targetDistance - currentDistance) / segDist;
            return {
                lat: prev.lat + (curr.lat - prev.lat) * fraction,
                lng: prev.lng + (curr.lng - prev.lng) * fraction,
                timestamp: prev.timestamp + ((curr.timestamp - prev.timestamp) * fraction || 0),
            };
        }
        currentDistance += segDist;
    }

    // Ghost Leading Logic: If target is ahead of user, project along last heading
    if (coordinates.length >= 2 && targetDistance > currentDistance) {
        const last = coordinates[coordinates.length - 1];
        const prev = coordinates[coordinates.length - 2];
        const extraDist = targetDistance - currentDistance;
        const segDist = distanceBetween(prev, last);

        if (segDist > 0) {
            const fraction = extraDist / segDist;
            return {
                lat: last.lat + (last.lat - prev.lat) * fraction,
                lng: last.lng + (last.lng - prev.lng) * fraction,
                timestamp: Date.now()
            };
        }
    }

    return coordinates[coordinates.length - 1];
}
