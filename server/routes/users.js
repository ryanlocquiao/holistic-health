const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const requireAuth = require('../middleware/requireAuth');

/**
 * GET /api/users/me
 *
 * Returns the authenticated user's public profile (id, email, created_at).
 */
router.get('/me', requireAuth, async (req, res) => {
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

module.exports = router;