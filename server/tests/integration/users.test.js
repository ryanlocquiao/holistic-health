const express = require('express');
const request = require('supertest');

jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn()
}));

const bcrypt = require('bcrypt');

/**
 * Integration tests for the users/me route.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/users.test.js
 */

const mockState = {
    users: [{
        id: 1,
        email: 'user@example.com',
        password_hash: 'hashed-current-password',
        created_at: new Date('2026-01-01T00:00:00.000Z')
    }]
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

    if (normalizedSql.startsWith('SELECT id, password_hash FROM users WHERE id = $1')) {
        const [id] = params;
        const user = mockState.users.find((u) => u.id === id);
        return { rows: user ? [{ id: user.id, password_hash: user.password_hash }] : [] };
    }

    if (normalizedSql.startsWith('UPDATE users SET password_hash = $1 WHERE id = $2')) {
        const [passwordHash, id] = params;
        const user = mockState.users.find((u) => u.id === id);
        if (user) user.password_hash = passwordHash;
        return { rows: [] };
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
    mockState.users = [{
        id: 1,
        email: 'user@example.com',
        password_hash: 'hashed-current-password',
        created_at: new Date('2026-01-01T00:00:00.000Z')
    }];
    mockPool.query.mockClear();
    bcrypt.compare.mockClear();
    bcrypt.hash.mockClear();
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed-new-password');
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

describe('PATCH /api/users/password', () => {
    test('updates the authenticated user password after verifying the current password', async () => {
        const app = createTestApp();
        const res = await request(app)
            .patch('/api/users/password')
            .send({ currentPassword: 'current-password', newPassword: 'new-password' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Password updated' });
        expect(bcrypt.compare).toHaveBeenCalledWith('current-password', 'hashed-current-password');
        expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 12);
        expect(mockState.users[0].password_hash).toBe('hashed-new-password');
    });

    test('rejects an incorrect current password', async () => {
        bcrypt.compare.mockResolvedValueOnce(false);
        const app = createTestApp();

        const res = await request(app)
            .patch('/api/users/password')
            .send({ currentPassword: 'wrong-password', newPassword: 'new-password' });

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({ error: 'Current password is incorrect' });
        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test('rejects a too-short new password', async () => {
        const app = createTestApp();
        const res = await request(app)
            .patch('/api/users/password')
            .send({ currentPassword: 'current-password', newPassword: 'short' });

        expect(res.statusCode).toBe(400);
        expect(res.body.errors[0].msg).toBe('New password must be at least 8 characters');
    });

    test('returns 404 if the user id from the token no longer exists', async () => {
        const app = createTestApp();
        const res = await request(app)
            .patch('/api/users/password')
            .set('x-test-user-id', '999')
            .send({ currentPassword: 'current-password', newPassword: 'new-password' });

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 'User not found' });
    });
});
