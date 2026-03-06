import { Coordinate } from './types';

/**
 * Perpendicular distance from a point to a line defined by start and end points.
 */
function perpendicularDistance(
    point: Coordinate,
    lineStart: Coordinate,
    lineEnd: Coordinate
): number {
    const dx = lineEnd.lng - lineStart.lng;
    const dy = lineEnd.lat - lineStart.lat;

    if (dx === 0 && dy === 0) {
        // lineStart and lineEnd are the same point
        const pdx = point.lng - lineStart.lng;
        const pdy = point.lat - lineStart.lat;
        return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) /
        (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    const nearestLng = lineStart.lng + clampedT * dx;
    const nearestLat = lineStart.lat + clampedT * dy;

    const distLng = point.lng - nearestLng;
    const distLat = point.lat - nearestLat;

    // Approximate conversion to meters (rough, sufficient for simplification)
    const latDegToM = 111320;
    const lngDegToM = 111320 * Math.cos((point.lat * Math.PI) / 180);

    return Math.sqrt(
        (distLat * latDegToM) * (distLat * latDegToM) +
        (distLng * lngDegToM) * (distLng * lngDegToM)
    );
}

/**
 * Douglas-Peucker algorithm for route simplification.
 * Reduces the number of GPS coordinates while preserving route shape.
 *
 * @param coordinates - Array of GPS coordinates
 * @param epsilon - Maximum allowable distance in meters (default: 5m)
 * @returns Simplified array of coordinates
 */
export function douglasPeucker(
    coordinates: Coordinate[],
    epsilon: number = 5
): Coordinate[] {
    if (coordinates.length <= 2) return coordinates;

    // Find the point with the maximum distance from the line
    let maxDist = 0;
    let maxIdx = 0;

    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];

    for (let i = 1; i < coordinates.length - 1; i++) {
        const dist = perpendicularDistance(coordinates[i], start, end);
        if (dist > maxDist) {
            maxDist = dist;
            maxIdx = i;
        }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDist > epsilon) {
        const left = douglasPeucker(coordinates.slice(0, maxIdx + 1), epsilon);
        const right = douglasPeucker(coordinates.slice(maxIdx), epsilon);

        // Combine results (remove duplicate point at the junction)
        return [...left.slice(0, -1), ...right];
    }

    // All points are within epsilon — keep only endpoints
    return [start, end];
}
