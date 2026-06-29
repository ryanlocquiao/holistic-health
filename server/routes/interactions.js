const express = require('express');
const { loadGraph, findConflicts } = require('../utils/graph');

const router = express.Router();

/**
 * Interaction routes.
 *
 * Endpoint:
 * - GET /api/interactions?compound=<id>&medications=<id1>,<id2>
 *
 * Run/test:
 * - Seed interactions with `node scripts/fetchNCCIH.js`.
 * - Start the API with `npm start`.
 * - Call the endpoint with a known compound and saved medication IDs.
 */

function parsePositiveInteger(value) {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) return null;
    return parsedValue;
}

function parseMedicationIds(rawMedicationIds) {
    if (!rawMedicationIds) return [];

    const parsedIds = [];
    const tokens = String(rawMedicationIds)
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);

    for (const token of tokens) {
        const medicationId = parsePositiveInteger(token);
        if (!medicationId) return null;
        parsedIds.push(medicationId);
    }

    return parsedIds;
}

// GET /api/interactions?compound=1&medications=2,3
router.get('/', async (req, res) => {
    const compoundId = parsePositiveInteger(req.query.compound);
    const medicationIds = parseMedicationIds(req.query.medications);

    if (!compoundId) {
        return res.status(400).json({ error: 'compound query param required' });
    }

    if (!medicationIds) {
        return res.status(400).json({ error: 'medications must be a comma-separated list of positive IDs' });
    }

    try {
        const graph = await loadGraph();
        const conflicts = findConflicts(compoundId, medicationIds, graph);

        return res.json({ compound_id: compoundId, conflicts });
    } catch (err) {
        console.error('GET /api/interactions error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
