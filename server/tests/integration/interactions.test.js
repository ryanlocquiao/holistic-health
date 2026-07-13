const express = require('express');
const request = require('supertest');

/**
 * Integration tests for the interactions route.
 *
 * These cover parameter parsing/validation only, which is fully owned by
 * routes/interactions.js. The actual conflict-detection logic lives in
 * utils/graph.js (loadGraph/findConflicts), which wasn't part of this
 * upload - it's mocked generically here so these tests can run, but the
 * "does it find the right conflicts" behavior still needs its own test file
 * once that source is available.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/interactions.test.js
 */

jest.mock('../../utils/graph', () => ({
    loadGraph: jest.fn(async () => ({})),
    findConflicts: jest.fn(() => [])
}));

const interactionRoutes = require('../../routes/interactions');
const { loadGraph, findConflicts } = require('../../utils/graph');

function createTestApp() {
    const app = express();
    app.use('/api/interactions', interactionRoutes);
    return app;
}

beforeEach(() => {
    loadGraph.mockClear();
    findConflicts.mockClear();
});

describe('GET /api/interactions validation', () => {
    test('requires a compound query param', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?medications=1,2');

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'compound query param required' });
    });

    test('rejects a non-numeric compound id', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=abc');

        expect(res.statusCode).toBe(400);
    });

    test('rejects a zero or negative compound id', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=0');

        expect(res.statusCode).toBe(400);
    });

    test('rejects a malformed medications list', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=1&medications=2,abc');

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'medications must be a comma-separated list of positive IDs' });
    });

    test('treats a missing medications param as an empty list', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=1');

        expect(res.statusCode).toBe(200);
        expect(findConflicts).toHaveBeenCalledWith(1, [], {});
    });

    test('parses a comma-separated medications list into integers', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=1&medications=2,3');

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ compound_id: 1 });
        expect(findConflicts).toHaveBeenCalledWith(1, [2, 3], {});
    });

    test('returns 500 if loadGraph rejects', async () => {
        loadGraph.mockRejectedValueOnce(new Error('graph unavailable'));
        const app = createTestApp();
        const res = await request(app).get('/api/interactions?compound=1');

        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: 'Internal server error' });
    });
});