const express = require('express');
const request = require('supertest');

/**
 * Integration tests for medication routes.
 *
 * GET /api/medications is public and untouched by auth/rate-limit changes.
 * GET/POST /api/medications/mine are authenticated - requireAuth is mocked
 * to a passthrough since its own behavior is covered in
 * tests/integration/auth.refresh.test.js.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/medications.test.js
 */

const mockState = {
    medications: [
        { id: 1, name: 'Warfarin', common_name: 'Warfarin' },
        { id: 2, name: 'Metformin', common_name: 'Metformin' }
    ],
    userMedications: [] // { user_id, medication_id }
};

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

async function mockHandleQuery(sql, params = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql === 'BEGIN' || normalizedSql === 'COMMIT' || normalizedSql === 'ROLLBACK') {
        return { rows: [] };
    }

    if (normalizedSql.startsWith('SELECT id, name, common_name FROM medications')) {
        return { rows: [...mockState.medications].sort((a, b) => a.name.localeCompare(b.name)) };
    }

    if (normalizedSql.startsWith('SELECT m.id, m.name, m.common_name')) {
        const [userId] = params;
        const rows = mockState.userMedications
            .filter((um) => um.user_id === userId)
            .map((um) => mockState.medications.find((m) => m.id === um.medication_id))
            .sort((a, b) => a.name.localeCompare(b.name));
        return { rows };
    }

    if (normalizedSql.startsWith('DELETE FROM user_medications WHERE user_id = $1')) {
        const [userId] = params;
        mockState.userMedications = mockState.userMedications.filter((um) => um.user_id !== userId);
        return { rows: [] };
    }

    if (normalizedSql.startsWith('INSERT INTO user_medications')) {
        const [userId, ...medicationIds] = params;
        for (const medicationId of medicationIds) {
            mockState.userMedications.push({ user_id: userId, medication_id: medicationId });
        }
        return { rows: [] };
    }

    throw new Error(`Unhandled SQL in medications test: ${normalizedSql}`);
}

const mockClient = { query: jest.fn(mockHandleQuery), release: jest.fn() };
const mockPool = {
    query: jest.fn(mockHandleQuery),
    connect: jest.fn(async () => mockClient)
};

// medications.js imports the db module via require('../db'), which resolves
// to the same file as '../db/index' used elsewhere - both paths resolve to
// db/index.js from routes/, so one jest.mock covers both call sites.
jest.mock('../../db/index', () => mockPool);
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
    req.user = { userId: req.headers['x-test-user-id'] ? Number(req.headers['x-test-user-id']) : 1 };
    next();
});

const medicationRoutes = require('../../routes/medications');

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/medications', medicationRoutes);
    return app;
}

beforeEach(() => {
    mockState.userMedications = [];
    mockPool.query.mockClear();
    mockPool.connect.mockClear();
});

describe('GET /api/medications (public)', () => {
    test('returns the catalog without requiring auth', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/medications');

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveLength(2);
    });
});

describe('GET /api/medications/mine', () => {
    test('returns an empty list for a user with no saved medications', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/medications/mine');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('response passes through the authenticated-route rate limiter', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/medications/mine');

        expect(res.headers['ratelimit-limit']).toBeDefined();
    });
});

describe('POST /api/medications/mine', () => {
    test('saves the provided medication list', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/medications/mine').send({ medication_ids: [1, 2] });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Medications saved', count: 2 });

        const mine = await request(app).get('/api/medications/mine');
        expect(mine.body).toHaveLength(2);
    });

    test('replaces rather than appends to the existing list', async () => {
        const app = createTestApp();
        await request(app).post('/api/medications/mine').send({ medication_ids: [1] });
        await request(app).post('/api/medications/mine').send({ medication_ids: [2] });

        const mine = await request(app).get('/api/medications/mine');
        expect(mine.body).toHaveLength(1);
        expect(mine.body[0].id).toBe(2);
    });

    test('de-duplicates repeated ids in the payload', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/medications/mine').send({ medication_ids: [1, 1, 2] });

        expect(res.body.count).toBe(2);
    });

    test('an empty array clears the saved list', async () => {
        const app = createTestApp();
        await request(app).post('/api/medications/mine').send({ medication_ids: [1] });
        const res = await request(app).post('/api/medications/mine').send({ medication_ids: [] });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Medications saved', count: 0 });

        const mine = await request(app).get('/api/medications/mine');
        expect(mine.body).toEqual([]);
    });

    test('rejects a non-array payload', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/medications/mine').send({ medication_ids: 'not-an-array' });

        expect(res.statusCode).toBe(400);
    });

    test('rejects non-positive-integer ids', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/medications/mine').send({ medication_ids: [1, -3] });

        expect(res.statusCode).toBe(400);
    });
});