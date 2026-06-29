// Authentication routes
// Requires: jsonwebtoken, bcrypt, express-validator
const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db/index');
const {
    issueTokenPair,
    revokeRefreshToken,
    rotateRefreshToken
} = require('../utils/tokens');

const router = express.Router();

const SALT_ROUNDS = 12;

if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Authentication tokens will fail.');
}

function sendValidationErrors(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return true;
    }

    return false;
}

function sendRefreshTokenFailure(res, result) {
    if (result.message === 'Server configuration error') {
        return res.status(500).json({ error: result.message });
    }

    return res.status(401).json({
        error: result.message,
        code: result.code
    });
}

const refreshTokenValidator = [
    body('refreshToken')
        .isString()
        .withMessage('refreshToken is required')
        .trim()
        .notEmpty()
        .withMessage('refreshToken is required')
];

// POST /api/auth/register
router.post('/register', [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
], async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    const { email, password } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existing = await client.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );

        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'An account with that email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await client.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
            [email, passwordHash]
        );

        const tokenPayload = await issueTokenPair(result.rows[0], client);
        if (!tokenPayload) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        await client.query('COMMIT');
        return res.status(201).json(tokenPayload);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Register error:', err.message);
        return res.status(500).json({ error: 'Registration failed' });
    } finally {
        client.release();
    }
});

// POST /api/auth/login
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    const { email, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT id, email, password_hash FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const tokenPayload = await issueTokenPair(user);
        if (!tokenPayload) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        return res.json(tokenPayload);
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', refreshTokenValidator, async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    try {
        const result = await rotateRefreshToken(req.body.refreshToken);

        if (!result.ok) {
            return sendRefreshTokenFailure(res, result);
        }

        return res.json({
            accessToken: result.accessToken,
            token: result.token,
            refreshToken: result.refreshToken,
            refreshTokenExpiresAt: result.refreshTokenExpiresAt,
            user: result.user
        });
    } catch (err) {
        console.error('Refresh token error:', err.message);
        return res.status(500).json({ error: 'Refresh failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', refreshTokenValidator, async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    try {
        const revoked = await revokeRefreshToken(req.body.refreshToken);

        if (!revoked) {
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }

        return res.json({ message: 'Logged out' });
    } catch (err) {
        console.error('Logout error:', err.message);
        return res.status(500).json({ error: 'Logout failed' });
    }
});

module.exports = router;
