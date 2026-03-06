const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { generateToken, authMiddleware } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// =========== AUTH ROUTES ===========

// Sign Up
app.post('/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const id = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        await db.query(
            `INSERT INTO users (id, email, password_hash, name, weekly_goal_km, preferred_unit, weight_kg)
       VALUES (?, ?, ?, ?, 20, 'km', 70)`,
            [id, email, passwordHash, name]
        );

        const token = generateToken(id);
        const [users] = await db.query('SELECT id, email, name, avatar_url, created_at, weekly_goal_km, preferred_unit, weight_kg, height_cm FROM users WHERE id = ?', [id]);

        res.json({ token, user: users[0] });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user.id);
        delete user.password_hash;

        res.json({ token, user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get current user profile
app.get('/auth/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, email, name, avatar_url, created_at, weekly_goal_km, preferred_unit, weight_kg, height_cm FROM users WHERE id = ?',
            [req.userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user profile
app.put('/auth/profile', authMiddleware, async (req, res) => {
    try {
        const { name, weekly_goal_km, preferred_unit, weight_kg, height_cm, avatar_url } = req.body;
        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (weekly_goal_km !== undefined) { fields.push('weekly_goal_km = ?'); values.push(weekly_goal_km); }
        if (preferred_unit !== undefined) { fields.push('preferred_unit = ?'); values.push(preferred_unit); }
        if (weight_kg !== undefined) { fields.push('weight_kg = ?'); values.push(weight_kg); }
        if (height_cm !== undefined) { fields.push('height_cm = ?'); values.push(height_cm); }
        if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url); }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.userId);
        await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        const [users] = await db.query(
            'SELECT id, email, name, avatar_url, created_at, weekly_goal_km, preferred_unit, weight_kg, height_cm FROM users WHERE id = ?',
            [req.userId]
        );
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change Password
app.post('/auth/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.userId]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Account
app.delete('/auth/account', authMiddleware, async (req, res) => {
    try {
        // Delete all user data in order
        await db.query('DELETE FROM achievements WHERE user_id = ?', [req.userId]);
        await db.query('DELETE FROM goals WHERE user_id = ?', [req.userId]);
        await db.query('DELETE FROM runs WHERE user_id = ?', [req.userId]);
        await db.query('DELETE FROM users WHERE id = ?', [req.userId]);

        res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =========== RUNS ROUTES ===========

// Get all runs for user
app.get('/runs', authMiddleware, async (req, res) => {
    try {
        const [runs] = await db.query(
            'SELECT * FROM runs WHERE user_id = ? ORDER BY started_at DESC',
            [req.userId]
        );
        // Parse JSON route_coordinates
        const parsed = runs.map(r => ({
            ...r,
            route_coordinates: typeof r.route_coordinates === 'string'
                ? JSON.parse(r.route_coordinates)
                : r.route_coordinates || [],
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save a new run
app.post('/runs', authMiddleware, async (req, res) => {
    try {
        const { started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, route_coordinates, notes } = req.body;
        const id = uuidv4();

        await db.query(
            `INSERT INTO runs (id, user_id, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, route_coordinates, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.userId, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, JSON.stringify(route_coordinates || []), notes]
        );

        const [runs] = await db.query('SELECT * FROM runs WHERE id = ?', [id]);
        const run = runs[0];
        run.route_coordinates = typeof run.route_coordinates === 'string' ? JSON.parse(run.route_coordinates) : run.route_coordinates || [];
        res.json(run);
    } catch (err) {
        console.error('Save run error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update run notes
app.put('/runs/:id', authMiddleware, async (req, res) => {
    try {
        const { notes } = req.body;
        await db.query('UPDATE runs SET notes = ? WHERE id = ? AND user_id = ?', [notes, req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a run
app.delete('/runs/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM runs WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== GOALS ROUTES ===========

app.get('/goals', authMiddleware, async (req, res) => {
    try {
        const [goals] = await db.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/goals', authMiddleware, async (req, res) => {
    try {
        const { type, target_value, deadline, is_active } = req.body;
        const id = uuidv4();
        await db.query(
            'INSERT INTO goals (id, user_id, type, target_value, deadline, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.userId, type, target_value, deadline || null, is_active !== false]
        );
        const [goals] = await db.query('SELECT * FROM goals WHERE id = ?', [id]);
        res.json(goals[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/goals/:id', authMiddleware, async (req, res) => {
    try {
        const { is_active, target_value, deadline } = req.body;
        const fields = [];
        const values = [];
        if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
        if (target_value !== undefined) { fields.push('target_value = ?'); values.push(target_value); }
        if (deadline !== undefined) { fields.push('deadline = ?'); values.push(deadline); }

        if (fields.length > 0) {
            values.push(req.params.id, req.userId);
            await db.query(`UPDATE goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/goals/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== ACHIEVEMENTS ROUTES ===========

app.get('/achievements', authMiddleware, async (req, res) => {
    try {
        const [achievements] = await db.query('SELECT * FROM achievements WHERE user_id = ?', [req.userId]);
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/achievements', authMiddleware, async (req, res) => {
    try {
        const { badge_type } = req.body;
        const id = uuidv4();
        await db.query(
            'INSERT IGNORE INTO achievements (id, user_id, badge_type) VALUES (?, ?, ?)',
            [id, req.userId, badge_type]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== SHOES ROUTES ===========

app.get('/shoes', authMiddleware, async (req, res) => {
    try {
        const [shoes] = await db.query('SELECT * FROM shoes WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.json(shoes);
    } catch (err) {
        // Auto-create table if it doesn't exist
        if (err.code === 'ER_NO_SUCH_TABLE') {
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
                    INDEX idx_shoes_user (user_id)
                )
            `);
            res.json([]);
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.post('/shoes', authMiddleware, async (req, res) => {
    try {
        const { name, brand, max_km } = req.body;
        const id = uuidv4();
        await db.query(
            'INSERT INTO shoes (id, user_id, name, brand, max_km) VALUES (?, ?, ?, ?, ?)',
            [id, req.userId, name, brand || '', max_km || 800]
        );
        const [shoes] = await db.query('SELECT * FROM shoes WHERE id = ?', [id]);
        res.json(shoes[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/shoes/:id', authMiddleware, async (req, res) => {
    try {
        const { name, brand, max_km, is_active, total_km } = req.body;
        const fields = [];
        const values = [];
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (brand !== undefined) { fields.push('brand = ?'); values.push(brand); }
        if (max_km !== undefined) { fields.push('max_km = ?'); values.push(max_km); }
        if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
        if (total_km !== undefined) { fields.push('total_km = ?'); values.push(total_km); }

        if (fields.length > 0) {
            values.push(req.params.id, req.userId);
            await db.query(`UPDATE shoes SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
        }
        const [shoes] = await db.query('SELECT * FROM shoes WHERE id = ?', [req.params.id]);
        res.json(shoes[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/shoes/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM shoes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== EXPORT ROUTES ===========

app.get('/export/runs', authMiddleware, async (req, res) => {
    try {
        const [runs] = await db.query(
            'SELECT started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, notes FROM runs WHERE user_id = ? ORDER BY started_at DESC',
            [req.userId]
        );

        // Generate CSV
        const headers = ['Date', 'Distance (km)', 'Duration (min)', 'Avg Pace (min/km)', 'Calories', 'Notes'];
        const rows = runs.map(r => [
            new Date(r.started_at).toISOString().split('T')[0],
            r.distance_km.toFixed(2),
            (r.duration_seconds / 60).toFixed(1),
            r.avg_pace_min_per_km ? r.avg_pace_min_per_km.toFixed(2) : '',
            r.calories_burned || '',
            (r.notes || '').replace(/,/g, ';'),
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=runtracker_runs.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== HEALTH CHECK & VERSION ===========

app.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        minVersion: '1.0.0', // Mandatory update below this version
        currentVersion: '1.0.0'
    });
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

// =========== START SERVER ===========

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RunTracker API server running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

