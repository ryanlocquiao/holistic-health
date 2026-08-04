const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db/index');
const requireAuth = require('../middleware/requireAuth');
const { authenticatedLimiter } = require('../middleware/rateLimiters');

const SALT_ROUNDS = 12;

function sendValidationErrors(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return true;
    }

    return false;
}

/**
 * GET /api/users/me
 *
 * Returns the authenticated user's public profile (id, email, created_at).
 *
 * Run/test:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/users.test.js
 */
router.get('/me', requireAuth, authenticatedLimiter, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, email, created_at FROM users WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get user error', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/**
 * PATCH /api/users/password
 *
 * Changes the authenticated user's password after verifying their current
 * password. Password hashing stays aligned with registration: bcrypt with 12
 * salt rounds.
 *
 * Run/test:
 * - Start the API with `npm start`.
 * - PATCH this route with `{ currentPassword, newPassword }` and a Bearer
 *   access token, or use the dashboard Change Password form.
 */
router.patch('/password', requireAuth, authenticatedLimiter, [
    body('currentPassword')
        .isString()
        .withMessage('Current password is required')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isString()
        .withMessage('New password is required')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .custom((newPassword, { req }) => newPassword !== req.body.currentPassword)
        .withMessage('New password must be different from current password')
], async (req, res) => {
    if (sendValidationErrors(req, res)) return;

    const { currentPassword, newPassword } = req.body;

    try {
        const result = await pool.query(
            `SELECT id, password_hash FROM users WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const nextPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await pool.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [nextPasswordHash, req.user.userId]
        );

        return res.json({ message: 'Password updated' });
    } catch (err) {
        console.error('Change password error:', err.message);
        return res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
