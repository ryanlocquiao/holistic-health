const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { searchCompounds } = require('../utils/search');

const MAX_QUERY_LENGTH = 200;

const SELECT_COMPOUNDS_SQL = `
    SELECT id, name, category, description, evidence_tier, source_url
    FROM compounds
`;

const SELECT_COMPOUND_AILMENTS_SQL = `
    SELECT ca.compound_id, a.name
    FROM compound_ailments ca
    JOIN ailments a ON a.id = ca.ailment_id
`;

function normalizeQueryInput(rawQuery) {
    if (typeof rawQuery !== 'string') return '';
    return rawQuery.trim();
}

function buildAilmentMap(rows) {
    const map = {};

    for (const row of rows) {
        if (!map[row.compound_id]) map[row.compound_id] = [];
        map[row.compound_id].push(row.name);
    }

    return map;
}

// GET /api/search?q=insomnia
router.get('/', async (req, res) => {
    const query = normalizeQueryInput(req.query.q);

    if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
    }

    if (query.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({ error: 'Query too long' });
    }

    try {
        const [compoundsResult, ailmentsResult] = await Promise.all([
            pool.query(SELECT_COMPOUNDS_SQL),
            pool.query(SELECT_COMPOUND_AILMENTS_SQL)
        ]);

        const compounds = compoundsResult.rows;
        const ailmentMap = buildAilmentMap(ailmentsResult.rows);

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
        const result = await pool.query('SELECT id, name FROM ailments ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ailments' });
    }
});

module.exports = router;