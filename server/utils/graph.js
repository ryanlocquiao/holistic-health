const db = require('../db');

async function loadGraph() {
    const { rows } = await db.query(`
        SELECT compound_id, medication_id, severity, description FROM interactions
    `);

    const graph = {};
    for (const row of rows) {
        if (!graph[row.compound_id]) graph[row.compound_id] = [];

        graph[row.compound_id].push({
            medication_id: row.medication_id,
            severity: row.severity,
            description: row.description,
        });
    }

    return graph;
}

function findConflicts(compoundId, medicationIds, graph) {
    const neighbors = graph[compoundId] || [];
    const medSet = new Set(medicationIds.map(Number));
    const conflicts = [];
    const visited = new Set();

    const queue = [...neighbors];

    while (queue.length > 0) {
        const node = queue.shift();

        if (visited.has(node.medication_id)) continue;
        visited.add(node.medication_id);

        if (medSet.has(node.medication_id)) {
            conflicts.push(node);
        }
    }

    conflicts.sort((a, b) => b.severity - a.severity);
    return conflicts;
}

module.exports = { loadGraph, findConflicts };