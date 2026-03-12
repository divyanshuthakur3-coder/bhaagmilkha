const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/auth.routes');
const runsRoutes = require('./src/routes/runs.routes');
const goalsRoutes = require('./src/routes/goals.routes');
const shoesRoutes = require('./src/routes/shoes.routes');
const achievementsRoutes = require('./src/routes/achievements.routes');
const systemRoutes = require('./src/routes/system.routes');
const { runMigrations } = require('./src/services/migration.service');

const app = express();
// Run DB migrations on startup
runMigrations();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// Mount modular routes
app.use('/v1/auth', authRoutes);
app.use('/v1/runs', runsRoutes);
app.use('/v1/goals', goalsRoutes);
app.use('/v1/shoes', shoesRoutes);
app.use('/v1/achievements', achievementsRoutes);
app.use('/v1', systemRoutes);

// Fallback for root
app.use('/', systemRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RunTracker API server running at http://localhost:${PORT}`);
});
