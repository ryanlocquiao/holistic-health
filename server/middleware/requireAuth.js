const jwt = require('jsonwebtoken');
const pool = require('../db/index');

const SELECT_AUTH_USER_SQL = 'SELECT id FROM users WHERE id = $1';

/**
 * Middleware: requireAuth
 *
 * Verifies the Authorization header contains a valid Bearer token and
 * attaches the decoded token payload to `req.user`.
 *
 * It also confirms the user still exists. That keeps stale browser sessions
 * from reaching protected route inserts with an old `userId`, which would
 * otherwise fail with a foreign-key error after a database reset or account
 * cleanup.
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authorization token required',
            code: 'AUTH_TOKEN_MISSING'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Access token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        console.warn('Token verification failed', err.message);
        return res.status(401).json({
            error: 'Invalid access token',
            code: 'TOKEN_INVALID'
        });
    }

    if (!Number.isInteger(decoded.userId) || decoded.userId <= 0) {
        return res.status(401).json({
            error: 'Invalid access token',
            code: 'TOKEN_INVALID'
        });
    }

    try {
        const userResult = await pool.query(SELECT_AUTH_USER_SQL, [decoded.userId]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Authenticated user no longer exists. Please log in again.',
                code: 'AUTH_USER_NOT_FOUND'
            });
        }
    } catch (err) {
        console.error('Auth user lookup failed:', err.message);
        return res.status(500).json({ error: 'Failed to verify authenticated user' });
    }

    req.user = decoded;
    return next();
}

module.exports = requireAuth;
