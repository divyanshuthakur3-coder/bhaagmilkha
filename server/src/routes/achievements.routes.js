const express = require('express');
const { authMiddleware } = require('../../auth');
const db = require('../../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const [achievements] = await db.query('SELECT * FROM achievements WHERE user_id = ?', [req.userId]);
        res.json(achievements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
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

module.exports = router;
