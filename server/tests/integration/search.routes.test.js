const express = require('express');
const request = require('supertest');

/**
 * Integration tests for search and compound routes.
 *
 * The production routes are mounted on a small Express app with a mocked
 * database pool. This keeps CI deterministic while still exercising the real
 * route handlers and search scoring utility.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/search.routes.test.js
 */

const mockPool = { query: jest.fn() };
jest.mock('../../db/index', () => mockPool);

const searchRoutes = require('../../routes/search');
const compoundRoutes = require('../../routes/compounds');

const SEARCH_PATH = '/api/search';
const COMPOUNDS_PATH = '/api/compounds';

const seededCompounds = [
    {
        id: 1,
        name: 'Valerian Root',
        category: 'Herb',
        description: 'Commonly used to support sleep and occasional insomnia.',
        evidence_tier: 2,
        source_url: 'example.com/valerian',
        created_at: new Date('2026-01-01T00:00:00.000Z')
    },
    {
        id: 2,
        name: 'Ginger',
        category: 'Herb',
        description: 'Traditionally used for nausea and digestive support.',
        evidence_tier: 1,
        source_url: 'example.com/ginger',
        created_at: new Date('2026-01-01T00:00:00.000Z')
    }
];

const seededAilments = [
    { id: 1, name: 'insomnia' },
    { id: 2, name: 'nausea' }
];

const seededCompoundAilments = [
    { compound_id: 1, ailment_id: 1, name: 'insomnia' },
    { compound_id: 2, ailment_id: 2, name: 'nausea' }
];

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

async function mockHandleQuery(sql, params = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql === 'SELECT id, name, category, description, evidence_tier, source_url FROM compounds') {
        return { rows: seededCompounds };
    }

    if (normalizedSql.startsWith('SELECT ca.compound_id, a.name FROM compound_ailments ca JOIN ailments a')) {
        return { rows: seededCompoundAilments.map(({ compound_id, name }) => ({ compound_id, name })) };
    }

    if (normalizedSql === 'SELECT id, name FROM ailments ORDER BY name') {
        return { rows: seededAilments };
    }

    if (normalizedSql.startsWith('SELECT id, name, category, description, evidence_tier, source_url, created_at FROM compounds WHERE id = $1')) {
        const [id] = params;
        return { rows: seededCompounds.filter((compound) => compound.id === id) };
    }

    if (normalizedSql.startsWith('SELECT a.id, a.name FROM ailments a JOIN compound_ailments ca')) {
        const [compoundId] = params;
        const ailmentIds = seededCompoundAilments
            .filter((row) => row.compound_id === compoundId)
            .map((row) => row.ailment_id);

        return {
            rows: seededAilments.filter((ailment) => ailmentIds.includes(ailment.id))
        };
    }

    throw new Error(`Unhandled SQL in search route test: ${normalizedSql}`);
}

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(SEARCH_PATH, searchRoutes);
    app.use(COMPOUNDS_PATH, compoundRoutes);
    return app;
}

beforeEach(() => {
    mockPool.query.mockReset();
    mockPool.query.mockImplementation(mockHandleQuery);
});

describe('Search route', () => {
    test('GET /api/search?q=insomnia returns 200 and non-empty array', async () => {
        const app = createTestApp();
        const res = await request(app).get(`${SEARCH_PATH}?q=insomnia`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toMatchObject({
            id: expect.any(Number),
            name: expect.any(String),
            evidence_tier: expect.any(Number)
        });
    });

    test('GET /api/search?q= returns 400 for empty query', async () => {
        const app = createTestApp();
        const res = await request(app).get(`${SEARCH_PATH}?q=`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Query parameter q is required' });
    });

    test('GET /api/search with missing q param returns 400', async () => {
        const app = createTestApp();
        const res = await request(app).get(SEARCH_PATH);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Query parameter q is required' });
    });

    test('GET /api/search with overly long q returns 400', async () => {
        const app = createTestApp();
        const tooLongQuery = 'a'.repeat(201);
        const res = await request(app).get(`${SEARCH_PATH}?q=${tooLongQuery}`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Query too long' });
    });

    test('GET /api/search/ailments returns available ailment categories', async () => {
        const app = createTestApp();
        const res = await request(app).get(`${SEARCH_PATH}/ailments`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(seededAilments);
    });
});

describe('Compounds route', () => {
    test('GET /api/compounds/:id returns 200 and compound object', async () => {
        const app = createTestApp();
        const knownCompoundId = seededCompounds[0].id;
        const res = await request(app).get(`${COMPOUNDS_PATH}/${knownCompoundId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
            id: knownCompoundId,
            name: expect.any(String),
            evidence_tier: expect.any(Number),
            ailments: expect.any(Array)
        });
    });

    test('GET /api/compounds/99999 returns 404 for unknown ID', async () => {
        const app = createTestApp();
        const res = await request(app).get(`${COMPOUNDS_PATH}/99999`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 'Compound not found' });
    });

    test('GET /api/compounds/abc returns 400 for invalid ID', async () => {
        const app = createTestApp();
        const res = await request(app).get(`${COMPOUNDS_PATH}/abc`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Invalid compound ID' });
    });
});
