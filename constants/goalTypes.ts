export type GoalType = 'weekly_distance' | 'pace_target' | 'streak';

export interface GoalTypeDef {
    type: GoalType;
    label: string;
    description: string;
    icon: string;
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
        icon: '📏',
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
        icon: '⏱️',
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
        icon: '🔥',
        unit: 'days',
        defaultTarget: 7,
        minTarget: 2,
        maxTarget: 365,
        step: 1,
    },
];
