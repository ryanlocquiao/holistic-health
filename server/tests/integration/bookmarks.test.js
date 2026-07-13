const express = require('express');
const request = require('supertest');

/**
 * Integration tests for bookmark routes.
 *
 * requireAuth is mocked to a passthrough (its own success/failure behavior
 * is already covered by tests/integration/auth.refresh.test.js) so these
 * tests isolate route logic: DB queries, status codes, and response shape.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/bookmarks.test.js
 */

const mockState = {
    bookmarks: [],
    nextBookmarkId: 1
};

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

async function mockHandleQuery(sql, params = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql.startsWith('SELECT c.id, c.name, c.category, c.description, c.evidence_tier, c.source_url, b.created_at')) {
        const [userId] = params;
        const rows = mockState.bookmarks
            .filter((b) => b.user_id === userId)
            .map((b) => ({
                id: b.compound_id,
                name: `Compound ${b.compound_id}`,
                category: 'Test',
                description: 'desc',
                evidence_tier: 1,
                source_url: 'https://example.com',
                bookmarked_at: b.created_at
            }));
        return { rows };
    }

    if (normalizedSql.startsWith('INSERT INTO bookmarks')) {
        const [userId, compoundId] = params;
        const exists = mockState.bookmarks.some(
            (b) => b.user_id === userId && b.compound_id === compoundId
        );
        if (exists) return { rows: [] };

        const bookmark = { id: mockState.nextBookmarkId, user_id: userId, compound_id: compoundId, created_at: new Date() };
        mockState.nextBookmarkId += 1;
        mockState.bookmarks.push(bookmark);
        return { rows: [{ id: bookmark.id }] };
    }

    if (normalizedSql.startsWith('DELETE FROM bookmarks')) {
        const [userId, compoundId] = params;
        const index = mockState.bookmarks.findIndex((b) => b.user_id === userId && b.compound_id === compoundId);
        if (index === -1) return { rows: [] };

        const [removed] = mockState.bookmarks.splice(index, 1);
        return { rows: [{ id: removed.id }] };
    }

    throw new Error(`Unhandled SQL in bookmarks test: ${normalizedSql}`);
}

const mockPool = { query: jest.fn(mockHandleQuery) };
jest.mock('../../db/index', () => mockPool);
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
    req.user = { userId: req.headers['x-test-user-id'] ? Number(req.headers['x-test-user-id']) : 1 };
    next();
});

const bookmarkRoutes = require('../../routes/bookmarks');

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/bookmarks', bookmarkRoutes);
    return app;
}

beforeEach(() => {
    mockState.bookmarks = [];
    mockState.nextBookmarkId = 1;
    mockPool.query.mockClear();
});

describe('GET /api/bookmarks', () => {
    test('returns an empty array for a user with no bookmarks', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/bookmarks');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('response passes through the authenticated-route rate limiter', async () => {
        const app = createTestApp();
        const res = await request(app).get('/api/bookmarks');

        expect(res.headers['ratelimit-limit']).toBeDefined();
    });
});

describe('POST /api/bookmarks', () => {
    test('saves a new bookmark', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/bookmarks').send({ compoundId: 5 });

        expect(res.statusCode).toBe(201);
        expect(res.body).toMatchObject({ message: 'Bookmarked' });

        const list = await request(app).get('/api/bookmarks');
        expect(list.body).toHaveLength(1);
    });

    test('is idempotent for an already-bookmarked compound', async () => {
        const app = createTestApp();
        await request(app).post('/api/bookmarks').send({ compoundId: 5 });
        const res = await request(app).post('/api/bookmarks').send({ compoundId: 5 });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Already bookmarked' });
    });

    test('rejects a non-positive-integer compoundId', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/bookmarks').send({ compoundId: 'abc' });

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Valid compoundId required' });
    });

    test('rejects a negative compoundId', async () => {
        const app = createTestApp();
        const res = await request(app).post('/api/bookmarks').send({ compoundId: -3 });

        expect(res.statusCode).toBe(400);
    });
});

describe('DELETE /api/bookmarks/:compoundId', () => {
    test('removes an existing bookmark', async () => {
        const app = createTestApp();
        await request(app).post('/api/bookmarks').send({ compoundId: 7 });

        const res = await request(app).delete('/api/bookmarks/7');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ message: 'Bookmark removed' });
    });

    test('returns 404 for a bookmark that does not exist', async () => {
        const app = createTestApp();
        const res = await request(app).delete('/api/bookmarks/999');

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 'Bookmark not found' });
    });

    test('rejects a non-numeric compoundId param', async () => {
        const app = createTestApp();
        const res = await request(app).delete('/api/bookmarks/abc');

        expect(res.statusCode).toBe(400);
    });
});

describe('per-user isolation', () => {
    test('one user cannot see or delete another user\'s bookmarks', async () => {
        const app = createTestApp();
        await request(app).post('/api/bookmarks').send({ compoundId: 3 }).set('x-test-user-id', '1');
        await request(app).post('/api/bookmarks').send({ compoundId: 3 }).set('x-test-user-id', '2');

        const userOneList = await request(app).get('/api/bookmarks').set('x-test-user-id', '1');
        const userTwoList = await request(app).get('/api/bookmarks').set('x-test-user-id', '2');
        expect(userOneList.body).toHaveLength(1);
        expect(userTwoList.body).toHaveLength(1);

        const crossDelete = await request(app).delete('/api/bookmarks/3').set('x-test-user-id', '3');
        expect(crossDelete.statusCode).toBe(404);
    });
});