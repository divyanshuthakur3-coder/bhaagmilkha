import { calculatePace, calculateCalories } from '../lib/paceCalculator';
import { calculateTRIMP } from '../lib/performance';

describe('Pace & Performance Calculations', () => {
    test('calculatePace handles normal values', () => {
        // 10km in 60 mins = 6.0 min/km
        expect(calculatePace(10, 3600)).toBe(6.0);
        // 5km in 20 mins = 4.0 min/km
        expect(calculatePace(5, 1200)).toBe(4.0);
    });

    test('calculatePace handles zero distance', () => {
        expect(calculatePace(0, 3600)).toBe(0);
    });

    test('calculateCalories based on duration and weight', () => {
        // Mocked formula check: (seconds / 60) * (weight * MET / 60)
        // MET is 9.8 for running
        const weight = 70;
        const duration = 3600; // 1 hr
        const expected = (duration / 3600) * 70 * 9.8;
        expect(calculateCalories(duration, weight)).toBeCloseTo(expected, 0);
    });

    test('calculateTRIMP scales with intensity', () => {
        const duration = 3600; // 60 mins
        // 6:00 pace = intensity 1.0 -> load should be 60
        expect(calculateTRIMP(duration, 6)).toBe(60);
        // 3:00 pace = intensity 2.0 -> load should be 120
        expect(calculateTRIMP(duration, 3)).toBe(120);
        // 12:00 pace = intensity 0.5 -> load should be 30
        expect(calculateTRIMP(duration, 12)).toBe(30);
    });
});
