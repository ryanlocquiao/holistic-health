const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { searchCompounds } = require('../utils/search');

// GET /api/search?q=insomnia
router.get('/', async (req, res) => {
    const query = req.query.q;

    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query parameter q is required' });
    }

    if (query.length > 200) {
        return res.status(400).json({ error: 'Query too long' });
    }

    try {
        // Fetch all compounds
        const compoundsResult = await pool.query(
            `SELECT id, name, category, description, evidence_tier, source_url FROM compounds`
        );
        const compounds = compoundsResult.rows;

        // Fetch all ailment links
        const ailmentsResult = await pool.query(
            `SELECT ca.compound_id, a.name FROM compound_ailments ca JOIN ailments a ON a.id = ca.ailment_id`
        );

        // Build the map: compound_id → [ailment names]
        const ailmentMap = {};
        for (const row of ailmentsResult.rows) {
            if (!ailmentMap[row.compound_id]) ailmentMap[row.compound_id] = [];
            ailmentMap[row.compound_id].push(row.name);
        }

        const results = searchCompounds(compounds, ailmentMap, query);
        res.json(results);
    } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/search/ailments - all available ailment categories
router.get('/ailments', async (req, res) => {
    try {
        const result = await pool.query(`SELECT id, name FROM ailments ORDER BY name`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ailments' });
    }
});

module.exports = router;