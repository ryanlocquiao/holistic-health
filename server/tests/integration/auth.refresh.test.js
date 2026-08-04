const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = 'integration-test-jwt-secret';
process.env.REFRESH_TOKEN_HASH_SECRET = 'integration-test-refresh-secret';
process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_TTL_DAYS = '7';

const mockState = {
    users: [],
    refreshTokens: [],
    nextUserId: 1,
    nextTokenId: 1
};

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

function cloneRow(row) {
    return { ...row };
}

function mockFindUserByEmail(email) {
    return mockState.users.find((user) => user.email === email);
}

function mockFindRefreshTokenByHash(tokenHash) {
    return mockState.refreshTokens.find((token) => token.token_hash === tokenHash);
}

async function mockHandleQuery(sql, params = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql === 'BEGIN' || normalizedSql === 'COMMIT' || normalizedSql === 'ROLLBACK') {
        return { rows: [] };
    }

    if (normalizedSql.startsWith('SELECT id FROM users WHERE email = $1')) {
        const user = mockFindUserByEmail(params[0]);
        return { rows: user ? [{ id: user.id }] : [] };
    }

    if (normalizedSql.startsWith('SELECT id FROM users WHERE id = $1')) {
        const user = mockState.users.find((item) => item.id === params[0]);
        return { rows: user ? [{ id: user.id }] : [] };
    }

    if (normalizedSql.startsWith('SELECT id, email, password_hash FROM users WHERE email = $1')) {
        const user = mockFindUserByEmail(params[0]);
        return { rows: user ? [cloneRow(user)] : [] };
    }

    if (normalizedSql.startsWith('INSERT INTO users')) {
        const user = {
            id: mockState.nextUserId,
            email: params[0],
            password_hash: params[1],
            created_at: new Date()
        };

        mockState.nextUserId += 1;
        mockState.users.push(user);
        return { rows: [{ id: user.id, email: user.email, created_at: user.created_at }] };
    }

    if (normalizedSql.includes('INSERT INTO refresh_tokens')) {
        const token = {
            id: mockState.nextTokenId,
            user_id: params[0],
            token_hash: params[1],
            token_family_id: params[2],
            expires_at: params[3],
            issued_at: new Date(),
            revoked_at: null,
            used_at: null,
            replaced_by_token_id: null
        };

        mockState.nextTokenId += 1;
        mockState.refreshTokens.push(token);
        return { rows: [{ id: token.id }] };
    }

    if (normalizedSql.includes('FROM refresh_tokens rt') && normalizedSql.includes('WHERE rt.token_hash = $1')) {
        const token = mockFindRefreshTokenByHash(params[0]);
        if (!token) return { rows: [] };

        const user = mockState.users.find((item) => item.id === token.user_id);
        return {
            rows: [{
                id: token.id,
                user_id: token.user_id,
                token_family_id: token.token_family_id,
                expires_at: token.expires_at,
                revoked_at: token.revoked_at,
                used_at: token.used_at,
                email: user.email
            }]
        };
    }

    if (normalizedSql.includes('SET used_at = NOW()') && normalizedSql.includes('replaced_by_token_id = $1')) {
        const token = mockState.refreshTokens.find((item) => item.id === params[1]);
        token.used_at = new Date();
        token.revoked_at = new Date();
        token.replaced_by_token_id = params[0];
        return { rows: [] };
    }

    if (normalizedSql.includes('WHERE user_id = $1') && normalizedSql.includes('token_family_id = $2')) {
        const [userId, tokenFamilyId] = params;
        for (const token of mockState.refreshTokens) {
            if (token.user_id === userId && token.token_family_id === tokenFamilyId && !token.revoked_at) {
                token.revoked_at = new Date();
            }
        }
        return { rows: [] };
    }

    if (normalizedSql.includes('WHERE token_hash = $1') && normalizedSql.includes('RETURNING id')) {
        const token = mockFindRefreshTokenByHash(params[0]);
        if (!token) return { rows: [] };

        token.revoked_at = token.revoked_at || new Date();
        return { rows: [{ id: token.id }] };
    }

    throw new Error(`Unhandled SQL in auth refresh test: ${normalizedSql}`);
}

const mockPool = {
    query: jest.fn(mockHandleQuery),
    connect: jest.fn(async () => ({
        query: jest.fn(mockHandleQuery),
        release: jest.fn()
    }))
};

jest.mock('../../db/index', () => mockPool);

const authRoutes = require('../../routes/auth');
const requireAuth = require('../../middleware/requireAuth');
const { hashRefreshToken } = require('../../utils/tokens');

/**
 * Integration tests for refresh-token auth flows.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/auth.refresh.test.js
 */

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.get('/protected', requireAuth, (req, res) => {
        res.json({ userId: req.user.userId });
    });
    return app;
}

async function seedUser(email = 'user@example.com', password = 'password123') {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
        id: mockState.nextUserId,
        email,
        password_hash: passwordHash,
        created_at: new Date()
    };

    mockState.nextUserId += 1;
    mockState.users.push(user);
    return user;
}

async function login(app, email = 'user@example.com', password = 'password123') {
    return request(app)
        .post('/api/auth/login')
        .send({ email, password });
}

function getRefreshTokenRow(refreshToken) {
    return mockFindRefreshTokenByHash(hashRefreshToken(refreshToken));
}

beforeEach(() => {
    mockState.users = [];
    mockState.refreshTokens = [];
    mockState.nextUserId = 1;
    mockState.nextTokenId = 1;
    mockPool.query.mockClear();
    mockPool.connect.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    console.warn.mockRestore();
});

describe('refresh token auth flow', () => {
    test('POST /api/auth/register issues access and refresh tokens', async () => {
        const app = createTestApp();

        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'new@example.com', password: 'password123' });

        expect(res.statusCode).toBe(201);
        expect(res.body.accessToken).toBeTruthy();
        expect(res.body.token).toBe(res.body.accessToken);
        expect(res.body.refreshToken).toBeTruthy();
        expect(res.body.user).toEqual({ id: 1, email: 'new@example.com' });
        expect(getRefreshTokenRow(res.body.refreshToken)).toBeTruthy();
    });

    test('POST /api/auth/refresh rotates a valid refresh token', async () => {
        const app = createTestApp();
        await seedUser();

        const loginRes = await login(app);
        const oldRefreshToken = loginRes.body.refreshToken;
        const oldRow = getRefreshTokenRow(oldRefreshToken);

        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: oldRefreshToken });

        expect(refreshRes.statusCode).toBe(200);
        expect(refreshRes.body.accessToken).toBeTruthy();
        expect(refreshRes.body.token).toBe(refreshRes.body.accessToken);
        expect(refreshRes.body.refreshToken).toBeTruthy();
        expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);

        const decoded = jwt.verify(refreshRes.body.accessToken, process.env.JWT_SECRET);
        expect(decoded.userId).toBe(1);

        const replacementRow = getRefreshTokenRow(refreshRes.body.refreshToken);
        expect(oldRow.used_at).toBeInstanceOf(Date);
        expect(oldRow.revoked_at).toBeInstanceOf(Date);
        expect(oldRow.replaced_by_token_id).toBe(replacementRow.id);
        expect(replacementRow.token_family_id).toBe(oldRow.token_family_id);
        expect(replacementRow.revoked_at).toBeNull();
    });

    test('POST /api/auth/refresh rejects expired refresh tokens', async () => {
        const app = createTestApp();
        await seedUser();

        const loginRes = await login(app);
        const refreshToken = loginRes.body.refreshToken;
        getRefreshTokenRow(refreshToken).expires_at = new Date(Date.now() - 1000);

        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken });

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: 'Refresh token expired',
            code: 'REFRESH_TOKEN_EXPIRED'
        });
    });

    test('POST /api/auth/refresh rejects revoked refresh tokens', async () => {
        const app = createTestApp();
        await seedUser();

        const loginRes = await login(app);
        const refreshToken = loginRes.body.refreshToken;
        getRefreshTokenRow(refreshToken).revoked_at = new Date();

        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken });

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: 'Refresh token has been revoked',
            code: 'REFRESH_TOKEN_REVOKED'
        });
    });

    test('refresh-token reuse detection revokes the full token family', async () => {
        const app = createTestApp();
        await seedUser();

        const loginRes = await login(app);
        const originalRefreshToken = loginRes.body.refreshToken;

        const firstRefresh = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: originalRefreshToken });

        expect(firstRefresh.statusCode).toBe(200);

        const reuseRes = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: originalRefreshToken });

        expect(reuseRes.statusCode).toBe(401);
        expect(reuseRes.body.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');

        const familyId = getRefreshTokenRow(originalRefreshToken).token_family_id;
        const familyRows = mockState.refreshTokens.filter((token) => token.token_family_id === familyId);
        expect(familyRows).toHaveLength(2);
        expect(familyRows.every((token) => token.revoked_at instanceof Date)).toBe(true);
    });

    test('POST /api/auth/logout revokes the submitted refresh token', async () => {
        const app = createTestApp();
        await seedUser();

        const loginRes = await login(app);
        const refreshToken = loginRes.body.refreshToken;

        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .send({ refreshToken });

        expect(logoutRes.statusCode).toBe(200);
        expect(logoutRes.body).toEqual({ message: 'Logged out' });
        expect(getRefreshTokenRow(refreshToken).revoked_at).toBeInstanceOf(Date);

        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken });

        expect(refreshRes.statusCode).toBe(401);
        expect(refreshRes.body.code).toBe('REFRESH_TOKEN_REVOKED');
    });
});

describe('requireAuth access-token failures', () => {
    test('distinguishes missing, invalid, and expired access tokens', async () => {
        const app = createTestApp();
        const expiredToken = jwt.sign(
            { userId: 1, email: 'user@example.com', exp: Math.floor(Date.now() / 1000) - 60 },
            process.env.JWT_SECRET
        );

        const missingRes = await request(app).get('/protected');
        expect(missingRes.statusCode).toBe(401);
        expect(missingRes.body.code).toBe('AUTH_TOKEN_MISSING');

        const invalidRes = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer not-a-real-jwt');
        expect(invalidRes.statusCode).toBe(401);
        expect(invalidRes.body.code).toBe('TOKEN_INVALID');

        const expiredRes = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${expiredToken}`);
        expect(expiredRes.statusCode).toBe(401);
        expect(expiredRes.body.code).toBe('TOKEN_EXPIRED');
    });

    test('rejects a valid token when the user row no longer exists', async () => {
        const app = createTestApp();
        const staleToken = jwt.sign(
            { userId: 999, email: 'deleted@example.com' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const res = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${staleToken}`);

        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: 'Authenticated user no longer exists. Please log in again.',
            code: 'AUTH_USER_NOT_FOUND'
        });
    });
});
