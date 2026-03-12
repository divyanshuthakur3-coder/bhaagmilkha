const express = require('express');
const { authMiddleware } = require('../../auth');
const db = require('../../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const [goals] = await db.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
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

module.exports = router;
