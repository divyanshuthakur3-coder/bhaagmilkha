-- RunTracker Database Update Script (Production Fixes & Phase 9)
-- These commands should be run in your Hostinger phpMyAdmin or SQL console.
-- They are designed to be safe (using IF NOT EXISTS where possible).

-- 1. Create weekly_stats table (if not exists)
CREATE TABLE IF NOT EXISTS weekly_stats (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  week_start DATE NOT NULL,
  total_distance_km FLOAT DEFAULT 0,
  total_runs INT DEFAULT 0,
  total_duration_seconds INT DEFAULT 0,
  best_pace FLOAT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_weekly_user (user_id),
  UNIQUE KEY unique_user_week (user_id, week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add high-performance indices to existing tables
-- We use a procedure to check if the index exists before creating it (MySQL 5.7+ safety)
DROP PROCEDURE IF EXISTS AddIndexSafely;
DELIMITER //
CREATE PROCEDURE AddIndexSafely()
BEGIN
    -- Check for idx_runs_user_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'runs' AND index_name = 'idx_runs_user_date') THEN
        CREATE INDEX idx_runs_user_date ON runs(user_id, started_at DESC);
    END IF;

    -- Check for idx_shoes_user
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'shoes' AND index_name = 'idx_shoes_user') THEN
        CREATE INDEX idx_shoes_user ON shoes(user_id);
    END IF;

    -- Check for idx_goals_user
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'goals' AND index_name = 'idx_goals_user') THEN
        CREATE INDEX idx_goals_user ON goals(user_id);
    END IF;
END //
DELIMITER ;
CALL AddIndexSafely();
DROP PROCEDURE AddIndexSafely;

-- 3. Update Goals ENUM if necessary (Optional, might take time on large tables)
-- Note: MySQL doesn't have "ADD TO ENUM", so we redefine column. 
-- ONLY run this if you see errors adding 'weekly_run_count' goals.
-- ALTER TABLE goals MODIFY COLUMN type ENUM('weekly_distance', 'pace_target', 'streak', 'weekly_time', 'weekly_run_count') NOT NULL;
