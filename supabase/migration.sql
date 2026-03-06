-- RunTracker Database Schema
-- Execute this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  weekly_goal_km FLOAT DEFAULT 20,
  preferred_unit TEXT DEFAULT 'km' CHECK (preferred_unit IN ('km', 'mi')),
  weight_kg FLOAT DEFAULT 70,
  height_cm FLOAT
);

-- Runs table
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  distance_km FLOAT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  avg_pace_min_per_km FLOAT NOT NULL DEFAULT 0,
  calories_burned INT NOT NULL DEFAULT 0,
  route_coordinates JSONB DEFAULT '[]',
  notes TEXT
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly_distance', 'pace_target', 'streak')),
  target_value FLOAT NOT NULL,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- Weekly stats table
CREATE TABLE IF NOT EXISTS weekly_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_distance_km FLOAT DEFAULT 0,
  total_runs INT DEFAULT 0,
  total_duration_seconds INT DEFAULT 0,
  best_pace FLOAT,
  UNIQUE(user_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_user_id ON weekly_stats(user_id);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_stats ENABLE ROW LEVEL SECURITY;

-- Users: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Runs: users can CRUD their own runs
CREATE POLICY "Users can view own runs" ON runs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own runs" ON runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own runs" ON runs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own runs" ON runs
  FOR DELETE USING (auth.uid() = user_id);

-- Goals: users can CRUD their own goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- Achievements: users can view/insert their own achievements
CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Weekly stats: users can view/manage their own stats
CREATE POLICY "Users can view own weekly stats" ON weekly_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly stats" ON weekly_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly stats" ON weekly_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable Realtime on weekly_stats
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_stats;
