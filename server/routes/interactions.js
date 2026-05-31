const express = require('express');
const router = express.Router();
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

module.exports = router;