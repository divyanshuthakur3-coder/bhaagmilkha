import { Run, Split, PreferredUnit } from './types';
import { formatPace } from './formatters';

export interface CoachInsight {
    title: string;
    message: string;
    type: 'praise' | 'correction' | 'neutral';
}

export function generateRunInsights(run: Run, unit: PreferredUnit = 'km'): CoachInsight[] {
    const insights: CoachInsight[] = [];
    const splits = run.splits || [];

    // Convert thresholds if using miles
    const varianceThreshold = unit === 'mi' ? 0.65 : 0.4; // 0.65 min/mi approx 0.4 min/km
    const consistencyThreshold = unit === 'mi' ? 0.5 : 0.3;
    const fastThreshold = unit === 'mi' ? 7.2 : 4.5; // ~7:15 min/mi approx 4:30 min/km

    if (splits.length < 2) {
        if (run.distance_km < (unit === 'mi' ? 1.6 : 1)) {
            insights.push({
                title: 'Great start!',
                message: `Every journey begins with a single step. Keep building consistency and try to run a full ${unit === 'mi' ? 'mile' : 'kilometer'} next time to start tracking your splits.`,
                type: 'neutral',
            });
        } else {
            const paceFormatted = formatPace(run.avg_pace_min_per_km, unit);
            insights.push({
                title: 'Solid effort',
                message: `You maintained an average pace of ${paceFormatted.replace(/\/.*/, '')} min/${unit}. Keep it up!`,
                type: 'neutral',
            });
        }
        return insights;
    }

    // Analyze splits
    let positiveSplit = false;
    let negativeSplit = false;

    // Pace is min/km in data, but we use the relative difference so unit scaling is handled by Thresholds
    const firstHalfPace = splits.slice(0, Math.floor(splits.length / 2)).reduce((acc, s) => acc + s.pace_min_per_km, 0) / Math.floor(splits.length / 2);
    const secondHalfPace = splits.slice(Math.floor(splits.length / 2)).reduce((acc, s) => acc + s.pace_min_per_km, 0) / Math.ceil(splits.length / 2);

    if (secondHalfPace > firstHalfPace + varianceThreshold) {
        positiveSplit = true;
    } else if (secondHalfPace < firstHalfPace - varianceThreshold) {
        negativeSplit = true;
    }

    let maxPace = splits[0].pace_min_per_km;
    let minPace = splits[0].pace_min_per_km;
    let slowestKm = splits[0].km;

    splits.forEach(s => {
        if (s.pace_min_per_km > maxPace) {
            maxPace = s.pace_min_per_km;
            slowestKm = s.km;
        }
        if (s.pace_min_per_km < minPace) minPace = s.pace_min_per_km;
    });

    if (maxPace - minPace < consistencyThreshold) {
        insights.push({
            title: 'Metronome Pacing ⏱️',
            message: "Incredible consistency! Your pace barely drifted. This is the hallmark of an experienced runner who knows their body well.",
            type: 'praise',
        });
    } else if (negativeSplit) {
        insights.push({
            title: 'Perfect Negative Split 🔥',
            message: "You finished faster than you started! This requires great discipline. Starting conservative and pushing the end is the best way to race.",
            type: 'praise',
        });
    } else if (positiveSplit) {
        insights.push({
            title: 'Watch Your Start 🐢',
            message: `You slowed down significantly by ${unit === 'mi' ? 'mile' : 'km'} ${slowestKm}. You might have started too fast. Next run, try to consciously hold back in the first ${unit === 'mi' ? 'mile' : 'kilometer'}.`,
            type: 'correction',
        });
    }

    // Check speed (using unit-aware threshold)
    const runPaceInternal = unit === 'mi' ? run.avg_pace_min_per_km * 1.609 : run.avg_pace_min_per_km;
    if (runPaceInternal < fastThreshold && run.distance_km >= 3) {
        insights.push({
            title: 'Flying High 🦅',
            message: "That's a very fast average pace for this distance. Make sure you follow this up with an easy recovery run tomorrow to prevent injury.",
            type: 'praise',
        });
    }

    // Check duration
    if (run.duration_seconds > 3600) {
        insights.push({
            title: 'Endurance Monster 🔋',
            message: "You were on your feet for over an hour! Focus on rehydrating and getting some protein in the next 30 minutes to aid recovery.",
            type: 'neutral',
        });
    }

    if (insights.length === 0) {
        const distLabel = unit === 'mi' ? (run.distance_km / 1.609).toFixed(1) : run.distance_km.toFixed(1);
        const paceFormatted = formatPace(run.avg_pace_min_per_km, unit).replace(/\/.*/, '');
        insights.push({
            title: 'Good Consistent Effort',
            message: `You knocked out ${distLabel}${unit} at ${paceFormatted} min/${unit}. Consider adding some interval workouts if you want to increase your speed!`,
            type: 'neutral',
        });
    }

    return insights;
}
