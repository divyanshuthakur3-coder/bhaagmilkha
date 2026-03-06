import { Run, Split } from './types';

export interface CoachInsight {
    title: string;
    message: string;
    type: 'praise' | 'correction' | 'neutral';
}

export function generateRunInsights(run: Run): CoachInsight[] {
    const insights: CoachInsight[] = [];
    const splits = run.splits || [];

    if (splits.length < 2) {
        if (run.distance_km < 1) {
            insights.push({
                title: 'Great start!',
                message: "Every journey begins with a single step. Keep building consistency and try to run a full kilometer next time to start tracking your splits.",
                type: 'neutral',
            });
        } else {
            insights.push({
                title: 'Solid effort',
                message: `You maintained an average pace of ${run.avg_pace_min_per_km.toFixed(1)} min/km. Keep it up!`,
                type: 'neutral',
            });
        }
        return insights;
    }

    // Analyze splits
    let isConsistent = true;
    let positiveSplit = false; // Pace gets slower (higher min/km)
    let negativeSplit = false; // Pace gets faster (lower min/km)

    const firstHalfPace = splits.slice(0, Math.floor(splits.length / 2)).reduce((acc, s) => acc + s.pace_min_per_km, 0) / Math.floor(splits.length / 2);
    const secondHalfPace = splits.slice(Math.floor(splits.length / 2)).reduce((acc, s) => acc + s.pace_min_per_km, 0) / Math.ceil(splits.length / 2);

    // Variance threshold: 0.5 min/km difference
    if (secondHalfPace > firstHalfPace + 0.4) {
        positiveSplit = true;
        isConsistent = false;
    } else if (secondHalfPace < firstHalfPace - 0.4) {
        negativeSplit = true;
        isConsistent = false;
    }

    // Look for a significant drop-off
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

    if (maxPace - minPace < 0.3) {
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
            message: `You slowed down significantly by km ${slowestKm}. You might have started too fast. Next run, try to consciously hold back in the first kilometer.`,
            type: 'correction',
        });
    }

    // Check speed
    if (run.avg_pace_min_per_km < 4.5 && run.distance_km >= 3) {
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

    // Fallback if no specific insight generated
    if (insights.length === 0) {
        insights.push({
            title: 'Good Consistent Effort',
            message: `You knocked out ${run.distance_km.toFixed(1)}km at ${run.avg_pace_min_per_km.toFixed(1)} min/km. Consider adding some interval workouts if you want to increase your speed!`,
            type: 'neutral',
        });
    }

    return insights;
}
