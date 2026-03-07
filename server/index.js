const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { generateTokens, verifyRefreshToken, authMiddleware } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// =========== SECURITY HELPERS ===========

// Simple In-Memory Rate Limiter
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 mins
const MAX_ATTEMPTS = 5;

function rateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || [];

    // Filter old attempts
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

    recentAttempts.push(now);
    loginAttempts.set(ip, recentAttempts);
    next();
}

// Input Sanitization
function validateAuth(req, res, next) {
    const { email, password } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    next();
}

// Polyline encoding/decoding for GPS compression
function encodePolyline(points) {
    let lastLat = 0;
    let lastLng = 0;
    let result = '';

    function encode(value) {
        let v = value < 0 ? ~(value << 1) : value << 1;
        while (v >= 0x20) {
            result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
            v >>= 5;
        }
        result += String.fromCharCode(v + 63);
    }

    for (const point of points) {
        const lat = Math.round(point.latitude * 1e5);
        const lng = Math.round(point.longitude * 1e5);
        encode(lat - lastLat);
        encode(lng - lastLng);
        lastLat = lat;
        lastLng = lng;
    }
    return result;
}

function decodePolyline(str) {
    if (!str) return [];
    let index = 0, lat = 0, lng = 0, result = [];
    while (index < str.length) {
        let b, shift = 0, result_val = 0;
        do {
            b = str.charCodeAt(index++) - 63;
            result_val |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result_val & 1) ? ~(result_val >> 1) : (result_val >> 1));
        lat += dlat;
        shift = 0;
        result_val = 0;
        do {
            b = str.charCodeAt(index++) - 63;
            result_val |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result_val & 1) ? ~(result_val >> 1) : (result_val >> 1));
        lng += dlng;
        result.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return result;
}

function parseCoordinates(data) {
    if (!data) return [];
    if (typeof data !== 'string') return data;
    if (data.startsWith('[') || data.startsWith('{')) {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return decodePolyline(data);
}

const v1Router = express.Router();

// Helper to update weekly_stats
async function updateWeeklyStats(userId, dateStr, distance, duration, pace) {
    try {
        const date = new Date(dateStr);
        // Get Monday of that week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const mondayStr = monday.toISOString().split('T')[0];

        await db.query(`
            INSERT INTO weekly_stats (id, user_id, week_start, total_distance_km, total_runs, total_duration_seconds, best_pace)
            VALUES (UUID(), ?, ?, ?, 1, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_distance_km = total_distance_km + VALUES(total_distance_km),
                total_runs = total_runs + 1,
                total_duration_seconds = total_duration_seconds + VALUES(total_duration_seconds),
                best_pace = IF(best_pace IS NULL OR VALUES(best_pace) < best_pace, VALUES(best_pace), best_pace)
        `, [userId, mondayStr, distance, duration, pace]);
    } catch (err) {
        console.error('Weekly stats update error:', err);
    }
}

// =========== AUTH ROUTES ===========

// Sign Up
v1Router.post('/auth/signup', rateLimit, validateAuth, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
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

        const { accessToken, refreshToken } = generateTokens(id);
        const [users] = await db.query('SELECT id, email, name, avatar_url, created_at, weekly_goal_km, preferred_unit, weight_kg, height_cm FROM users WHERE id = ?', [id]);

        res.json({ token: accessToken, refreshToken, user: users[0] });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login
v1Router.post('/auth/login', rateLimit, async (req, res) => {
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

        const { accessToken, refreshToken } = generateTokens(user.id);
        delete user.password_hash;

        res.json({ token: accessToken, refreshToken, user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Refresh Token
v1Router.post('/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
        res.json({ token: accessToken, refreshToken: newRefreshToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user profile
v1Router.get('/auth/me', authMiddleware, async (req, res) => {
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
v1Router.put('/auth/profile', authMiddleware, async (req, res) => {
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
v1Router.post('/auth/change-password', authMiddleware, async (req, res) => {
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
v1Router.delete('/auth/account', authMiddleware, async (req, res) => {
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

// Get all runs for user (with optional pagination)
v1Router.get('/runs', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const [runs] = await db.query(
            'SELECT * FROM runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?',
            [req.userId, limit, offset]
        );
        // Parse JSON route_coordinates
        const parsed = runs.map(r => ({
            ...r,
            route_coordinates: parseCoordinates(r.route_coordinates),
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save a new run
v1Router.post('/runs', authMiddleware, async (req, res) => {
    try {
        const { name, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, route_coordinates, notes, shoe_id } = req.body;
        const id = uuidv4();

        const compressedCoords = Array.isArray(route_coordinates) ? encodePolyline(route_coordinates) : route_coordinates;

        await db.query(
            `INSERT INTO runs (id, user_id, name, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, route_coordinates, notes, shoe_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.userId, name, started_at, ended_at, distance_km, duration_seconds, avg_pace_min_per_km, calories_burned, compressedCoords, notes, shoe_id]
        );

        // Update shoe mileage if shoe_id is provided
        if (shoe_id) {
            await db.query('UPDATE shoes SET total_km = total_km + ? WHERE id = ? AND user_id = ?', [distance_km, shoe_id, req.userId]);
        }

        // Update weekly stats
        await updateWeeklyStats(req.userId, started_at, distance_km, duration_seconds, avg_pace_min_per_km);

        const [runs] = await db.query('SELECT * FROM runs WHERE id = ?', [id]);
        const run = runs[0];
        run.route_coordinates = parseCoordinates(run.route_coordinates);
        res.json(run);
    } catch (err) {
        console.error('Save run error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update run notes
v1Router.put('/runs/:id', authMiddleware, async (req, res) => {
    try {
        const { notes, name } = req.body;
        const fields = [];
        const values = [];

        if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(req.params.id, req.userId);
        await db.query(`UPDATE runs SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a run
v1Router.delete('/runs/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM runs WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== GOALS ROUTES ===========

v1Router.get('/goals', authMiddleware, async (req, res) => {
    try {
        const [goals] = await db.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

v1Router.post('/goals', authMiddleware, async (req, res) => {
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

v1Router.put('/goals/:id', authMiddleware, async (req, res) => {
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

v1Router.delete('/goals/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== ACHIEVEMENTS ROUTES ===========

v1Router.get('/achievements', authMiddleware, async (req, res) => {
    try {
        const [achievements] = await db.query('SELECT * FROM achievements WHERE user_id = ?', [req.userId]);
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

v1Router.post('/achievements', authMiddleware, async (req, res) => {
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

v1Router.get('/shoes', authMiddleware, async (req, res) => {
    try {
        const [shoes] = await db.query('SELECT * FROM shoes WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC', [req.userId]);
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

v1Router.get('/shoes/:id', authMiddleware, async (req, res) => {
    try {
        const [shoes] = await db.query('SELECT * FROM shoes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        if (shoes.length === 0) return res.status(404).json({ error: 'Shoe not found' });
        res.json(shoes[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

v1Router.post('/shoes', authMiddleware, async (req, res) => {
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

v1Router.patch('/shoes/:id', authMiddleware, async (req, res) => {
    try {
        const fields = [];
        const values = [];
        Object.entries(req.body).forEach(([key, value]) => {
            if (['name', 'brand', 'max_km', 'is_active', 'total_km'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        });

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

v1Router.put('/shoes/:id', authMiddleware, async (req, res) => {
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

v1Router.delete('/shoes/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM shoes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========== EXPORT ROUTES ===========

v1Router.get('/export/runs', authMiddleware, async (req, res) => {
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

v1Router.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        minVersion: '1.0.0', // Mandatory update below this version
        currentVersion: '1.0.0'
    });
});

v1Router.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

app.use('/v1', v1Router);
// Fallback for current clients (mount at root too) - OPTIONAL but safer for transition
app.use('/', v1Router);

// =========== START SERVER ===========

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RunTracker API server running at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

