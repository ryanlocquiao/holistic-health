const express = require('express');
const request = require('supertest');

/**
 * Integration tests for the users/me route.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/users.test.js
 */

const mockState = {
    users: [{ id: 1, email: 'user@example.com', created_at: new Date('2026-01-01T00:00:00.000Z') }]
};

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

async function mockHandleQuery(sql, params = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql.startsWith('SELECT id, email, created_at FROM users WHERE id = $1')) {
        const [id] = params;
        const user = mockState.users.find((u) => u.id === id);
        return { rows: user ? [user] : [] };
    }

    throw new Error(`Unhandled SQL in users test: ${normalizedSql}`);
}

const mockPool = { query: jest.fn(mockHandleQuery) };
jest.mock('../../db/index', () => mockPool);
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
    req.user = { userId: req.headers['x-test-user-id'] ? Number(req.headers['x-test-user-id']) : 1 };
    next();
});

const userRoutes = require('../../routes/users');

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
    return app;
}

beforeEach(() => {
    mockPool.query.mockClear();
});

describe('GET /api/users/me', () => {
    test('returns the authenticated user\'s profile', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/users/me');

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: 1, email: 'user@example.com' });
    });

    test('returns 404 if the user id from the token no longer exists', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/users/me').set('x-test-user-id', '999');

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 'User not found' });
    });

    test('response passes through the authenticated-route rate limiter', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/users/me');

        expect(res.headers['ratelimit-limit']).toBeDefined();
    });
});