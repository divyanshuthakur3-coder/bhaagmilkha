export type GoalType = 'weekly_distance' | 'pace_target' | 'streak' | 'weekly_time' | 'weekly_run_count';

export interface GoalTypeDef {
    type: GoalType;
    label: string;
    description: string;
    icon: any;
    unit: string;
    defaultTarget: number;
    minTarget: number;
    maxTarget: number;
    step: number;
}

export const GOAL_TYPES: GoalTypeDef[] = [
    {
        type: 'weekly_distance',
        label: 'Weekly Distance',
        description: 'Run a target distance each week',
        icon: 'footsteps',
        unit: 'km',
        defaultTarget: 20,
        minTarget: 1,
        maxTarget: 200,
        step: 1,
    },
    {
        type: 'pace_target',
        label: 'Pace Target',
        description: 'Achieve a target pace in any run',
        icon: 'stopwatch',
        unit: 'min/km',
        defaultTarget: 6,
        minTarget: 2,
        maxTarget: 15,
        step: 0.25,
    },
    {
        type: 'streak',
        label: 'Running Streak',
        description: 'Run for consecutive days',
        icon: 'flame',
        unit: 'days',
        defaultTarget: 7,
        minTarget: 2,
        maxTarget: 365,
        step: 1,
    },
    {
        type: 'weekly_time',
        label: 'Weekly Time',
        description: 'Total running time per week',
        icon: 'time',
        unit: 'hours',
        defaultTarget: 2,
        minTarget: 0.5,
        maxTarget: 100,
        step: 0.5,
    },
    {
        type: 'weekly_run_count',
        label: 'Run Frequency',
        description: 'Target number of runs per week',
        icon: 'walk',
        unit: 'runs',
        defaultTarget: 3,
        minTarget: 1,
        maxTarget: 7,
        step: 1,
    },
];
