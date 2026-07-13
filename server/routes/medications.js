const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/index');
const requireAuth = require('../middleware/requireAuth');
const { authenticatedLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

/**
 * Medication routes.
 *
 * Endpoints:
 * - GET /api/medications: public medication catalog for dashboard search.
 * - GET /api/medications/mine: authenticated user's saved medications.
 * - POST /api/medications/mine: replaces the authenticated user's saved list.
 *
 * Run/test:
 * - Seed medication data with `npm run seed:all` or `node scripts/fetchNCCIH.js`.
 * - Start the API with `npm start`.
 * - Log in through the client and add/remove medications in `/dashboard`.
 */

const SELECT_MEDICATIONS_SQL = `
    SELECT id, name, common_name
    FROM medications
    ORDER BY name ASC
`;

const SELECT_USER_MEDICATIONS_SQL = `
    SELECT m.id, m.name, m.common_name
    FROM user_medications um
    JOIN medications m ON m.id = um.medication_id
    WHERE um.user_id = $1
    ORDER BY m.name ASC
`;

const DELETE_USER_MEDICATIONS_SQL = 'DELETE FROM user_medications WHERE user_id = $1';

function getUniqueMedicationIds(medicationIds) {
    return [...new Set(medicationIds.map(Number))];
}

function buildInsertUserMedicationsSql(medicationCount) {
    const values = Array.from(
        { length: medicationCount },
        (_, index) => `($1, $${index + 2})`
    ).join(', ');

    return `INSERT INTO user_medications (user_id, medication_id) VALUES ${values}`;
}

// GET /api/medications
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query(SELECT_MEDICATIONS_SQL);
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/medications error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/medications/mine
router.get('/mine', requireAuth, authenticatedLimiter, async (req, res) => {
    try {
        const { rows } = await db.query(SELECT_USER_MEDICATIONS_SQL, [req.user.userId]);
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/medications/mine error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/medications/mine
router.post('/mine', requireAuth, authenticatedLimiter, [
    body('medication_ids')
        .isArray()
        .withMessage('medication_ids must be an array.'),
    body('medication_ids.*')
        .isInt({ min: 1 })
        .withMessage('Each medication ID must be a positive integer.')
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const medicationIds = getUniqueMedicationIds(req.body.medication_ids);
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        await client.query(DELETE_USER_MEDICATIONS_SQL, [req.user.userId]);

        if (medicationIds.length > 0) {
            await client.query(
                buildInsertUserMedicationsSql(medicationIds.length),
                [req.user.userId, ...medicationIds]
            );
        }

        await client.query('COMMIT');
        return res.json({ message: 'Medications saved', count: medicationIds.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /api/medications/mine error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
