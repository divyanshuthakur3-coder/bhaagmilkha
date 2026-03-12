const express = require('express');
const { authMiddleware } = require('../../auth');
const db = require('../../db');

const router = express.Router();

router.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        minVersion: '1.0.0',
        currentVersion: '1.1.0'
    });
});

router.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

module.exports = router;
