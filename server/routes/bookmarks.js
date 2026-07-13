const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const requireAuth = require('../middleware/requireAuth');
const { authenticatedLimiter } = require('../middleware/rateLimiters');

/**
 * Bookmark routes.
 *
 * Endpoints:
 * - GET /api/bookmarks: list the authenticated user's saved compounds.
 * - POST /api/bookmarks: save a compound by ID.
 * - DELETE /api/bookmarks/:compoundId: remove a saved compound.
 *
 * Run/test:
 * - Start API with `npm start`.
 * - Log in through the UI and save/remove a remedy from its detail page.
 */

function parsePositiveInteger(value) {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) return null;
    return parsedValue;
}

// Can only access bookmarks if user has an account
router.use(requireAuth, authenticatedLimiter);

// GET /api/bookmarks
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id, c.name, c.category, c.description, c.evidence_tier, c.source_url, b.created_at AS bookmarked_at 
            FROM bookmarks b
            JOIN compounds c ON c.id = b.compound_id
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC`,
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get bookmarks error:', err.message);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

// POST /api/bookmarks
router.post('/', async (req, res) => {
    const compoundId = parsePositiveInteger(req.body.compoundId);
    if (!compoundId) {
        return res.status(400).json({ error: 'Valid compoundId required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO bookmarks (user_id, compound_id) VALUES ($1, $2) ON CONFLICT (user_id, compound_id) DO NOTHING RETURNING id`,
            [req.user.userId, compoundId]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Already bookmarked' });
        }

        res.status(201).json({ message: 'Bookmarked', id: result.rows[0].id });
    } catch (err) {
        console.error('Add bookmark error:', err.message);
        res.status(500).json({ error: 'Failed to add bookmark' });
    }
});

// DELETE /api/bookmarks/:compoundId
router.delete('/:compoundId', async (req, res) => {
    const compoundId = parsePositiveInteger(req.params.compoundId);
    if (!compoundId) {
        return res.status(400).json({ error: 'Valid compoundId required' });
    }

    try {
        const result = await pool.query(
            `DELETE FROM bookmarks WHERE user_id = $1 AND compound_id = $2 RETURNING id`,
            [req.user.userId, compoundId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bookmark not found' });
        }

        res.json({ message: 'Bookmark removed' });
    } catch (err) {
        console.error('Delete bookmark error:', err.message);
        res.status(500).json({ error: 'Failed to remove bookmark' });
    }
});

module.exports = router;
