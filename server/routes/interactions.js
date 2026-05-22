const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { loadGraph, findConflicts } = require('../utils/graph');

// GET /api/interactions?compound=<id>&medications=<id1>, <id2>, ...
router.get('/', async (req, res) => {
    const compoundId = parseInt(req.query.compound);
    const medicationIds = (req.query.medications || '').split(',').map(Number).filter(Boolean);

    if (!compoundId) {
        return res.status(400).json({ error: 'compound query param required' });
    }

    try {
        const graph = await loadGraph();
        const conflicts = findConflicts(compoundId, medicationIds, graph);

        return res.json({ compound_id: compoundId, conflicts });
    } catch (err) {
        console.error('GET /api/interactions error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/users/medications
router.post('/users/medications', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const { medicationIds } = req.body;

    if (!Array.isArray(medicationIds)) {
        return res.status(400).json({ error: 'medication_ids musst be an array' });
    }

    try {
        await db.query(
            'DELETE FROM user_medications WHERE user_id = $1',
            [userId]
        );

        if (medication_ids.length > 0) {
            const values = medication_ids
                .map((medId, i) => `($1, $${i + 2})`)
                .join(', ');
            
            await db.query(
                `INSERT INTO user_medications (user_id, medication_id) VALUES ${values}`,
                [userId, ...medication_ids]
            );
        }

        return res.json({ message: 'Medications saved', count: medication_ids.length });
    } catch (err) {
        console.error('POST /api/users/medications error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/users/medications
router.get('/users/medications', requireAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        const { rows } = await db.query(`
            SELECT m.id, m.name, m.common_name
            FROM user_medications um
            JOIN medications m ON m.id = um.medication_id
            WHERE um.user_id = $1
            ORDER BY m.name ASC    
        `, [userId]);

        return res.json(rows);
    } catch (err) {
        console.error('GET /api/users/medications error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/medications
router.get('/medications', async (req, res) => {
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

module.exports = router;