import { useMemo } from 'react';
import { Run, Goal } from '@/lib/types';

interface GoalProgress {
    goal: Goal;
    currentValue: number;
    targetValue: number;
    percentage: number;
    isCompleted: boolean;
    displayLabel: string;
}

/**
 * Calculate progress for each active goal based on runs this week.
 */
export function useGoalProgress(goals: Goal[], runs: Run[]): GoalProgress[] {
    return useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekRuns = runs.filter(
            (r) => new Date(r.started_at) >= weekStart
        );

        return goals
            .filter((g) => g.is_active)
            .map((goal) => {
                let currentValue = 0;
                let displayLabel = '';

                switch (goal.type) {
                    case 'weekly_distance': {
                        currentValue = thisWeekRuns.reduce((sum, r) => sum + r.distance_km, 0);
                        displayLabel = `${currentValue.toFixed(1)} / ${goal.target_value} km`;
                        break;
                    }
                    case 'pace_target': {
                        // Best pace achieved this week
                        const bestPace = thisWeekRuns.reduce((best, r) => {
                            if (r.avg_pace_min_per_km > 0 && (best === 0 || r.avg_pace_min_per_km < best)) {
                                return r.avg_pace_min_per_km;
                            }
                            return best;
                        }, 0);
                        currentValue = bestPace > 0 ? bestPace : goal.target_value;
                        const isAchieved = bestPace > 0 && bestPace <= goal.target_value;
                        displayLabel = isAchieved
                            ? `${bestPace.toFixed(1)} min/km ✓`
                            : `Best: ${bestPace > 0 ? bestPace.toFixed(1) : '--'} / Target: ${goal.target_value} min/km`;
                        // For pace, lower is better — invert percentage
                        const pacePercent = bestPace > 0
                            ? Math.min(100, (goal.target_value / bestPace) * 100)
                            : 0;
                        return {
                            goal,
                            currentValue,
                            targetValue: goal.target_value,
                            percentage: pacePercent,
                            isCompleted: isAchieved,
                            displayLabel,
                        };
                    }
                    case 'streak': {
                        // Count consecutive days with at least 1 run
                        const runDates = new Set(
                            runs.map((r) => new Date(r.started_at).toDateString())
                        );
                        let streak = 0;
                        const today = new Date();
                        for (let i = 0; i < 365; i++) {
                            const checkDate = new Date(today);
                            checkDate.setDate(today.getDate() - i);
                            if (runDates.has(checkDate.toDateString())) {
                                streak++;
                            } else if (i > 0) {
                                break;
                            }
                        }
                        currentValue = streak;
                        displayLabel = `${streak} / ${goal.target_value} days`;
                        break;
                    }
                    case 'weekly_time': {
                        currentValue = thisWeekRuns.reduce((sum, r) => sum + r.duration_seconds / 3600, 0);
                        displayLabel = `${currentValue.toFixed(1)} / ${goal.target_value} hrs`;
                        break;
                    }
                    case 'weekly_run_count': {
                        currentValue = thisWeekRuns.length;
                        displayLabel = `${currentValue} / ${goal.target_value} runs`;
                        break;
                    }
                }

                const percentage = Math.min(100, (currentValue / goal.target_value) * 100);

                return {
                    goal,
                    currentValue,
                    targetValue: goal.target_value,
                    percentage,
                    isCompleted: percentage >= 100,
                    displayLabel,
                };
            });
    }, [goals, runs]);
}
