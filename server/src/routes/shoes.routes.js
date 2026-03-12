const express = require('express');
const { authMiddleware } = require('../../auth');
const db = require('../../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const [shoes] = await db.query('SELECT * FROM shoes WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC', [req.userId]);
        res.json(shoes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
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

module.exports = router;
