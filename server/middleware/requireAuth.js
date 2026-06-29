const jwt = require('jsonwebtoken');

/**
 * Middleware: requireAuth
 *
 * Verifies the Authorization header contains a valid Bearer token and
 * attaches the decoded token payload to `req.user`.
 */
function requireAuth(req, res, next) {
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

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
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
}

module.exports = requireAuth;
