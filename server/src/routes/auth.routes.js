const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { generateTokens, verifyRefreshToken, authMiddleware } = require('../../auth');
const { validate } = require('../middleware/validate.middleware');
const { loginSchema, signupSchema } = require('../models/validation');

const router = express.Router();

// Placeholder for rateLimit if needed, or imported
const rateLimit = (req, res, next) => next(); 

router.post('/signup', rateLimit, validate(signupSchema), async (req, res) => {
    try {
        const { email, password, name } = req.body;
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
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', rateLimit, validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
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
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, email, name, avatar_url, created_at, weekly_goal_km, preferred_unit, weight_kg, height_cm FROM users WHERE id = ?',
            [req.userId]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
