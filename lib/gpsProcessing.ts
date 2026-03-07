import { Coordinate } from './types';
import { distanceBetween } from './haversine';

/**
 * 1D Kalman Filter for coordinate smoothing.
 */
export class KalmanFilter {
    private q: number; // process noise covariance
    private r: number; // measurement noise covariance
    private x: number; // value
    private p: number; // estimation error covariance
    private k: number; // kalman gain

    constructor(q: number = 0.001, r: number = 0.002, p: number = 1.0, initialValue: number = 0) {
        this.q = q;
        this.r = r;
        this.p = p;
        this.x = initialValue;
        this.k = 0;
    }

    filter(measurement: number): number {
        // Prediction update
        this.p = this.p + this.q;

        // Measurement update
        this.k = this.p / (this.p + this.r);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;

        return this.x;
    }

    reset(value: number) {
        this.x = value;
        this.p = 1.0;
    }
}

/**
 * Reject GPS outliers based on speed (reject > 12m/s or 43km/h).
 */
export function isOutlier(prev: Coordinate, curr: Coordinate): boolean {
    const distKm = distanceBetween(prev, curr);
    const timeHr = (curr.timestamp - prev.timestamp) / 3600000;
    if (timeHr <= 0) return true;

    const speedKmh = distKm / timeHr;
    return speedKmh > 43; // Reject anything faster than world-record sprint pace
}
