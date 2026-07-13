const express = require('express');
const request = require('supertest');

/**
 * End-to-end tests for GET /api/interactions using the REAL utils/graph.js -
 * only the db layer is mocked. This proves the route and the contraindication
 * logic actually work together, complementing:
 *  - tests/integration/interactions.test.js (route validation, graph mocked)
 *  - tests/unit/graph.test.js (graph.js in isolation)
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/interactions.conflicts.test.js
 */

const mockRows = [
    { compound_id: 1, medication_id: 10, severity: 2, description: 'Moderate: increases sedation' },
    { compound_id: 1, medication_id: 11, severity: 4, description: 'Severe: raises bleeding risk' },
    { compound_id: 2, medication_id: 10, severity: 3, description: 'Moderate: reduces absorption' }
];

const mockDb = { query: jest.fn(async () => ({ rows: mockRows })) };
jest.mock('../../db/index', () => mockDb);

const interactionRoutes = require('../../routes/interactions');

function createTestApp() {
    const app = express();
    app.use('/api/interactions', interactionRoutes);
    return app;
}

describe('GET /api/interactions (real graph + conflict logic)', () => {
    test('returns matching interactions sorted by severity, most severe first', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=1&medications=10,11');

        expect(res.statusCode).toBe(200);
        expect(res.body.compound_id).toBe(1);
        expect(res.body.conflicts.map((c) => c.medication_id)).toEqual([11, 10]);
    });

    test('returns an empty conflicts array when none of the requested medications interact', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=1&medications=999');

        expect(res.statusCode).toBe(200);
        expect(res.body.conflicts).toEqual([]);
    });

    test('a compound with zero interaction rows returns an empty conflicts array, not an error', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=555&medications=10');

        expect(res.statusCode).toBe(200);
        expect(res.body.conflicts).toEqual([]);
    });

    test('interactions for one compound do not leak into another compound\'s results', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=2&medications=10,11');

        // compound 2 only has an edge to medication 10 in the mock data,
        // even though medication 11 conflicts with compound 1.
        expect(res.body.conflicts.map((c) => c.medication_id)).toEqual([10]);
    });
});