const express = require('express');
const { authMiddleware } = require('../../auth');
const runsService = require('../services/runs.service');
const { validate } = require('../middleware/validate.middleware');
const { runSchema } = require('../models/validation');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const runs = await runsService.getAllRuns(req.userId, limit, offset);
        res.json(runs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authMiddleware, validate(runSchema), async (req, res) => {
    try {
        const run = await runsService.saveRun(req.userId, req.body);
        res.json(run);
    } catch (err) {
        console.error('Save run error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
