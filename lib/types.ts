// Database types matching schema

export type PreferredUnit = 'km' | 'mi';

export interface Coordinate {
    lat: number;
    lng: number;
    timestamp: number;
    speed?: number;
    altitude?: number;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
    weekly_goal_km: number;
    preferred_unit: PreferredUnit;
    weight_kg: number | null;
    height_cm: number | null;
}

export interface Split {
    km: number;
    time_seconds: number;
    pace_min_per_km: number;
}

export interface Run {
    id: string;
    user_id: string;
    name: string | null;
    started_at: string;
    ended_at: string;
    distance_km: number;
    duration_seconds: number;
    avg_pace_min_per_km: number;
    calories_burned: number;
    route_coordinates: Coordinate[];
    splits?: Split[];
    steps?: number;
    shoe_id?: string | null;
    weather?: string | null;
    notes: string | null;
}

export interface Goal {
    id: string;
    user_id: string;
    type: 'weekly_distance' | 'pace_target' | 'streak' | 'weekly_time' | 'weekly_run_count';
    target_value: number;
    deadline: string | null;
    is_active: boolean;
    created_at: string;
}

export interface Achievement {
    id: string;
    user_id: string;
    badge_type: string;
    earned_at: string;
}

export interface WeeklyStat {
    id: string;
    user_id: string;
    week_start: string;
    total_distance_km: number;
    total_runs: number;
    total_duration_seconds: number;
    best_pace: number | null;
}

// Shoe Tracker
export interface Shoe {
    id: string;
    user_id: string;
    name: string;
    brand: string;
    total_km: number;
    max_km: number;
    is_active: boolean;
    created_at: string;
}

// Training Plans
export type PlanDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TrainingDay {
    day: number; // 1-7 (Mon-Sun)
    type: 'easy' | 'tempo' | 'interval' | 'long' | 'rest' | 'cross';
    description: string;
    distance_km?: number;
    duration_min?: number;
}

export interface TrainingWeek {
    week: number;
    label: string;
    days: TrainingDay[];
}

export interface TrainingPlan {
    id: string;
    name: string;
    description: string;
    difficulty: PlanDifficulty;
    duration_weeks: number;
    icon: string;
    weeks: TrainingWeek[];
}

// Interval Workout
export interface IntervalStep {
    type: 'warmup' | 'work' | 'rest' | 'cooldown';
    duration_seconds: number;
    label: string;
}

export interface IntervalWorkout {
    id: string;
    name: string;
    description: string;
    icon: string;
    steps: IntervalStep[];
    total_duration_seconds: number;
}


