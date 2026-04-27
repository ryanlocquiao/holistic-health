const request = require('supertest');
const app = require('../../index');
const pool = require('../../db/index');

/**
 * Integration tests for search and compound routes.
 *
 * Why these tests exist:
 * - Validate end-to-end behavior from HTTP layer through DB-backed routes.
 * - Protect route contracts (status codes, response shape, required params).
 *
 * Run:
 * - cd server
 * - npm test
 *
 * Notes:
 * - These tests assume the DB has been migrated and seeded.
 * - If data changes, tests remain robust by discovering a valid compound id
 *   from live search results instead of hardcoding one specific id.
 */

const SEARCH_PATH = '/api/search';
const COMPOUNDS_PATH = '/api/compounds';

async function getKnownCompoundId() {
    const response = await request(app).get(`${SEARCH_PATH}?q=insomnia`);

    if (response.statusCode !== 200 || !Array.isArray(response.body) || response.body.length === 0) {
        throw new Error('Expected seeded data for q=insomnia, but no compounds were returned.');
    }

    return response.body[0].id;
}

describe('Search route', () => {
    test('GET /api/search?q=insomnia returns 200 and non-empty array', async () => {
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
        const res = await request(app).get(`${SEARCH_PATH}?q=`);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Query parameter q is required' });
    });

    test('GET /api/search with missing q param returns 400', async () => {
        const res = await request(app).get(SEARCH_PATH);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Query parameter q is required' });
    });

    test('GET /api/search with overly long q returns 400', async () => {
        const tooLongQuery = 'a'.repeat(201);
        const res = await request(app).get(`${SEARCH_PATH}?q=${tooLongQuery}`);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Query too long' });
    });
});

describe('Compounds route', () => {
    test('GET /api/compounds/:id returns 200 and compound object', async () => {
        const knownCompoundId = await getKnownCompoundId();
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
        const res = await request(app).get(`${COMPOUNDS_PATH}/99999`);
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 'Compound not found' });
    });

    test('GET /api/compounds/abc returns 400 for invalid ID', async () => {
        const res = await request(app).get(`${COMPOUNDS_PATH}/abc`);
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Invalid compound ID' });
    });
});

afterAll(async () => {
    await pool.end();
});