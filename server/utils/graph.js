const db = require('../db');

const SELECT_INTERACTIONS_SQL = `
    SELECT compound_id, medication_id, severity, description
    FROM interactions
`;

/**
 * Loads direct compound-medication interaction edges from PostgreSQL.
 *
 * Shape:
 * - graph[compound_id] = [{ medication_id, severity, description }, ...]
 *
 * Run/test:
 * - Seed interaction rows with `node scripts/fetchNCCIH.js`.
 * - Call `GET /api/interactions?compound=<id>&medications=<ids>`.
 */
async function loadGraph() {
    const { rows } = await db.query(SELECT_INTERACTIONS_SQL);
    const graph = {};

    for (const row of rows) {
        if (!graph[row.compound_id]) graph[row.compound_id] = [];

        graph[row.compound_id].push({
            medication_id: row.medication_id,
            severity: row.severity,
            description: row.description
        });
    }

    return graph;
}

/**
 * Finds direct conflicts between one compound and a user's medications.
 *
 * The current interaction model stores direct edges only, so this function
 * intentionally avoids graph traversal and simply filters the compound's
 * neighbors. Results are sorted high-severity first for the UI.
 */
function findConflicts(compoundId, medicationIds, graph) {
    const neighbors = graph[compoundId] || [];
    const medicationIdSet = new Set(medicationIds.map(Number));
    const mostSevereByMedicationId = new Map();
    
    for (const node of neighbors) {
        if (!medicationIdSet.has(node.medication_id)) continue;
        
        const existing = mostSevereByMedicationId.get(node.medication_id);
        if (!existing || node.severity > existing.severity) {
            mostSevereByMedicationId.set(node.medication_id, node);
        }
    }
    
    const conflicts = [...mostSevereByMedicationId.values()];
    conflicts.sort((a, b) => b.severity - a.severity);
    return conflicts;
}

module.exports = { loadGraph, findConflicts };
