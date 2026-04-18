const express = require('express');
const router = express.Router();
const pool = require('../db/index');

const SELECT_COMPOUND_BY_ID_SQL = `
    SELECT id, name, category, description, evidence_tier, source_url, created_at
    FROM compounds
    WHERE id = $1
`;

const SELECT_AILMENTS_FOR_COMPOUND_SQL = `
    SELECT a.id, a.name
    FROM ailments a
    JOIN compound_ailments ca ON a.id = ca.ailment_id
    WHERE ca.compound_id = $1
`;

function parseCompoundId(rawId) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

// GET /api/compounds/:id
router.get('/:id', async (req, res) => {
    const id = parseCompoundId(req.params.id);

    if (!id) {
        return res.status(400).json({ error: 'Invalid compound ID' });
    }

    try {
        const compoundResult = await pool.query(SELECT_COMPOUND_BY_ID_SQL, [id]);

        if (compoundResult.rows.length === 0) {
            return res.status(404).json({ error: 'Compound not found' });
        }

        const compound = compoundResult.rows[0];

        const ailmentsResult = await pool.query(SELECT_AILMENTS_FOR_COMPOUND_SQL, [id]);

        compound.ailments = ailmentsResult.rows;
        res.json(compound);
    } catch (err) {
        console.error('Compound fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch compound' });
    }
});

module.exports = router;