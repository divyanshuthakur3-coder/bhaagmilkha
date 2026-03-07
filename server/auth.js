const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'runtracker-local-dev-secret-key-2024';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'runtracker-refresh-local-dev-secret-key-2024';

function generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken };
}

function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (err) {
        return null;
    }
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = { generateTokens, verifyRefreshToken, authMiddleware, JWT_SECRET };
