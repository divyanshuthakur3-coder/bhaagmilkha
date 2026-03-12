const db = require('../../db');

/**
 * Handles database migrations and initial schema setup.
 */
async function runMigrations() {
    console.log('🔄 Running database migrations...');
    try {
        // Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                weekly_goal_km FLOAT DEFAULT 20,
                preferred_unit ENUM('km', 'mi') DEFAULT 'km',
                weight_kg FLOAT DEFAULT 70,
                height_cm FLOAT DEFAULT NULL
            )
        `);

        // Runs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS runs (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                name VARCHAR(255) DEFAULT NULL,
                started_at TIMESTAMP NOT NULL,
                ended_at TIMESTAMP NOT NULL,
                distance_km FLOAT NOT NULL DEFAULT 0,
                duration_seconds INT NOT NULL DEFAULT 0,
                avg_pace_min_per_km FLOAT NOT NULL DEFAULT 0,
                calories_burned INT NOT NULL DEFAULT 0,
                route_coordinates TEXT,
                notes TEXT,
                shoe_id VARCHAR(36) DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_runs_user (user_id),
                INDEX idx_runs_started (started_at DESC)
            )
        `);

        // Goals table
        await db.query(`
            CREATE TABLE IF NOT EXISTS goals (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                type ENUM('weekly_distance', 'pace_target', 'streak', 'weekly_time', 'weekly_run_count') NOT NULL,
                target_value FLOAT NOT NULL,
                deadline TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_goals_user (user_id)
            )
        `);

        // Achievements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                badge_type VARCHAR(100) NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_achievements_user (user_id),
                UNIQUE KEY unique_user_badge (user_id, badge_type)
            )
        `);

        // Weekly Stats table
        await db.query(`
            CREATE TABLE IF NOT EXISTS weekly_stats (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                week_start DATE NOT NULL,
                total_distance_km FLOAT DEFAULT 0,
                total_runs INT DEFAULT 0,
                total_duration_seconds INT DEFAULT 0,
                best_pace FLOAT DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_weekly_user (user_id),
                UNIQUE KEY unique_user_week (user_id, week_start)
            )
        `);

        // Shoes table
        await db.query(`
            CREATE TABLE IF NOT EXISTS shoes (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                name VARCHAR(100) NOT NULL,
                brand VARCHAR(100) DEFAULT '',
                total_km DECIMAL(10,2) DEFAULT 0,
                max_km DECIMAL(10,2) DEFAULT 800,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_shoes_user (user_id)
            )
        `);
        
        console.log('✅ Migrations completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
}

module.exports = { runMigrations };
