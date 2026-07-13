const mockDb = { query: jest.fn() };
jest.mock('../../db', () => mockDb);

const { loadGraph, findConflicts } = require('../../utils/graph');

/**
 * Unit tests for the contraindication engine.
 *
 * Note: the current model is direct-edge lookup (one row per compound-
 * medication pair), not multi-hop graph traversal - loadGraph groups flat
 * `interactions` rows by compound_id, and findConflicts filters/sorts a
 * single compound's neighbors. These tests are written against that actual
 * contract, not against BFS/multi-hop behavior.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/unit/graph.test.js
 */

beforeEach(() => {
    mockDb.query.mockClear();
});

describe('loadGraph', () => {
    test('groups interaction rows by compound_id', async () => {
        mockDb.query.mockResolvedValueOnce({
            rows: [
                { compound_id: 1, medication_id: 10, severity: 3, description: 'A' },
                { compound_id: 1, medication_id: 11, severity: 1, description: 'B' },
                { compound_id: 2, medication_id: 10, severity: 2, description: 'C' }
            ]
        });

        const graph = await loadGraph();

        expect(graph[1]).toEqual([
            { medication_id: 10, severity: 3, description: 'A' },
            { medication_id: 11, severity: 1, description: 'B' }
        ]);
        expect(graph[2]).toEqual([{ medication_id: 10, severity: 2, description: 'C' }]);
    });

    test('returns an empty object when there are no interaction rows', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const graph = await loadGraph();

        expect(graph).toEqual({});
    });
});

describe('findConflicts', () => {
    const graph = {
        1: [
            { medication_id: 10, severity: 2, description: 'Moderate: increases sedation' },
            { medication_id: 11, severity: 4, description: 'Severe: raises bleeding risk' },
            { medication_id: 12, severity: 1, description: 'Mild: minor absorption delay' }
        ]
    };

    test('returns an empty array for a compound with no interaction edges at all', () => {
        expect(findConflicts(999, [10], graph)).toEqual([]);
    });

    test('returns an empty array when the medication list is empty', () => {
        expect(findConflicts(1, [], graph)).toEqual([]);
    });

    test('filters to only medications the user actually takes', () => {
        const result = findConflicts(1, [10], graph);

        expect(result).toHaveLength(1);
        expect(result[0].medication_id).toBe(10);
    });

    test('ignores requested medication ids that have no edge to this compound', () => {
        const result = findConflicts(1, [10, 999], graph);

        expect(result.map((c) => c.medication_id)).toEqual([10]);
    });

    test('sorts results by severity, most severe first', () => {
        const result = findConflicts(1, [10, 11, 12], graph);

        expect(result.map((c) => c.severity)).toEqual([4, 2, 1]);
    });

    test('accepts medication ids as numeric strings (defensive Number coercion)', () => {
        const result = findConflicts(1, ['10', '11'], graph);

        expect(result.map((c) => c.medication_id).sort((a, b) => a - b)).toEqual([10, 11]);
    });

    // Documents current behavior rather than an intended contract - flagged
    // separately in the write-up. If `interactions` ever contains two rows
    // for the same (compound_id, medication_id) pair with different
    // severities, whichever appears first in `neighbors` wins - not
    // necessarily the more severe one. loadGraph's query also has no
    // ORDER BY, so "first" isn't guaranteed stable across queries either.
    test('when a medication_id appears twice for a compound, the first-encountered edge wins - not necessarily the more severe one', () => {
        const graphWithDuplicateEdge = {
            1: [
                { medication_id: 10, severity: 1, description: 'Mild version, listed first' },
                { medication_id: 10, severity: 4, description: 'Severe version, listed second' }
            ]
        };

        const result = findConflicts(1, [10], graphWithDuplicateEdge);

        expect(result).toHaveLength(1);
        expect(result[0].severity).toBe(1);
    });
});