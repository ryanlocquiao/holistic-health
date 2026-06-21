const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { body, validationResult } = require('express-validator');

// GET /api/medications
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, common_name FROM medications ORDER BY name ASC'
        );
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/medications error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/medications/mine
router.get('/mine', requireAuth, async (req, res) => {  // ← fix 1: '.mine' → '/mine'
    try {
        const { rows } = await db.query(`
            SELECT m.id, m.name, m.common_name
            FROM user_medications um
            JOIN medications m ON m.id = um.medication_id
            WHERE um.user_id = $1
            ORDER BY m.name ASC    
        `, [req.user.userId]);
        return res.json(rows);
    } catch (err) {
        console.error('GET /api/medications/mine error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/medications/mine
router.post('/mine', requireAuth, [
    body('medication_ids')
        .isArray().withMessage('medication_ids must be an array.'),
    body('medication_ids.*')
        .isInt({ min: 1 }).withMessage('Each medication ID must be a positive integer.')
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { medication_ids } = req.body;

    try {
        await db.query('DELETE FROM user_medications WHERE user_id = $1', [req.user.userId]);

        if (medication_ids.length > 0) {
            const values = medication_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
            await db.query(`
                INSERT INTO user_medications (user_id, medication_id) VALUES ${values}
            `, [req.user.userId, ...medication_ids]);
        }

        return res.json({ message: 'Medications saved', count: medication_ids.length });
    } catch (err) {
        console.error('POST /api/medications/mine error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;