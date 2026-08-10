const express = require('express');
const request = require('supertest');

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn(() => ({
        models: {
            generateContent: mockGenerateContent
        }
    }))
}));

const mockDb = { query: jest.fn() };
jest.mock('../../db/index', () => mockDb);
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
    req.user = { userId: req.headers['x-test-user-id'] ? Number(req.headers['x-test-user-id']) : 1 };
    next();
});
jest.mock('../../middleware/rateLimiters', () => ({
    authenticatedLimiter: (req, res, next) => next(),
    chatbotLimiter: (req, res, next) => next()
}));

const { GoogleGenAI } = require('@google/genai');
const chatbotRoutes = require('../../routes/chatbot');

/**
 * Integration tests for the Gemini-backed chatbot route.
 *
 * Gemini is mocked so these tests validate app-owned behavior only: auth
 * payload shape, SQL table names, response parsing, and error codes.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/integration/chatbot.test.js
 */

const mockState = {
    remedies: [{ name: 'Magnesium' }],
    medications: [{ name: 'Warfarin', common_name: 'Coumadin' }]
};

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

async function mockHandleQuery(sql, params = []) {
    const normalizedSql = normalizeSql(sql);

    if (normalizedSql.startsWith('SELECT c.name FROM bookmarks b JOIN compounds c')) {
        mockState.lastRemedyParams = params;
        return { rows: mockState.remedies };
    }

    if (normalizedSql.startsWith('SELECT m.name, m.common_name FROM user_medications um JOIN medications m')) {
        mockState.lastMedicationParams = params;
        return { rows: mockState.medications };
    }

    throw new Error(`Unhandled SQL in chatbot test: ${normalizedSql}`);
}

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/chatbot', chatbotRoutes);
    return app;
}

beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_MODEL;
    mockState.remedies = [{ name: 'Magnesium' }];
    mockState.medications = [{ name: 'Warfarin', common_name: 'Coumadin' }];
    mockState.lastRemedyParams = null;
    mockState.lastMedicationParams = null;
    mockDb.query.mockReset();
    mockDb.query.mockImplementation(mockHandleQuery);
    mockGenerateContent.mockReset();
    mockGenerateContent.mockResolvedValue({
        text: JSON.stringify([
            { remedy: 'Turmeric', reason: 'Supports inflammation goals.', precautions: 'Ask your doctor if using blood thinners.' },
            { remedy: 'Ashwagandha', reason: 'May support stress balance.', precautions: 'Avoid during pregnancy unless advised.' },
            { remedy: 'Elderberry', reason: 'Supports immune wellness.', precautions: 'Consult your doctor for autoimmune conditions.' }
        ])
    });
    GoogleGenAI.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
    console.warn.mockRestore();
});

describe('POST /api/chatbot/recommend', () => {
    test('builds recommendations from bookmarks and user_medications for req.user.userId', async () => {
        const app = createTestApp();
        const res = await request(app)
            .post('/api/chatbot/recommend')
            .set('x-test-user-id', '42');

        expect(res.statusCode).toBe(200);
        expect(res.body.recommendations).toHaveLength(3);
        expect(mockState.lastRemedyParams).toEqual([42]);
        expect(mockState.lastMedicationParams).toEqual([42]);

        const geminiRequest = mockGenerateContent.mock.calls[0][0];
        expect(geminiRequest.model).toBe('gemini-3.5-flash');
        expect(geminiRequest.config.responseMimeType).toBe('application/json');
        expect(geminiRequest.contents).toContain('Magnesium');
        expect(geminiRequest.contents).toContain('Warfarin (Coumadin)');
    });

    test('returns a specific setup error when no Gemini API key is configured', async () => {
        delete process.env.GEMINI_API_KEY;
        delete process.env.AI_API_KEY;

        const app = createTestApp();
        const res = await request(app).post('/api/chatbot/recommend');

        expect(res.statusCode).toBe(503);
        expect(res.body).toEqual({
            error: 'Gemini API key is not configured.',
            code: 'GEMINI_API_KEY_MISSING'
        });
        expect(mockDb.query).not.toHaveBeenCalled();
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    test('accepts the legacy AI_API_KEY environment variable name', async () => {
        delete process.env.GEMINI_API_KEY;
        process.env.AI_API_KEY = 'legacy-key';

        const app = createTestApp();
        const res = await request(app).post('/api/chatbot/recommend');

        expect(res.statusCode).toBe(200);
        expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'legacy-key' });
    });

    test('returns a controlled error when Gemini does not return valid recommendations', async () => {
        mockGenerateContent.mockResolvedValueOnce({ text: 'not-json' });

        const app = createTestApp();
        const res = await request(app).post('/api/chatbot/recommend');

        expect(res.statusCode).toBe(502);
        expect(res.body).toEqual({
            error: 'Failed to generate recommendations.',
            code: 'GEMINI_RECOMMENDATION_FAILED'
        });
    });

    test('returns a clear setup hint when Gemini rejects the API key', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('API key not valid'));

        const app = createTestApp();
        const res = await request(app).post('/api/chatbot/recommend');

        expect(res.statusCode).toBe(502);
        expect(res.body).toEqual({
            error: 'Gemini API key was rejected. Check GEMINI_API_KEY in server/.env.',
            code: 'GEMINI_API_KEY_INVALID'
        });
    });

    test('falls back when the configured Gemini model is unavailable', async () => {
        process.env.GEMINI_MODEL = 'gemini-2.5-flash';
        mockGenerateContent
            .mockRejectedValueOnce(Object.assign(
                new Error('This model models/gemini-2.5-flash is no longer available to new users.'),
                { status: 404 }
            ))
            .mockResolvedValueOnce({
                text: JSON.stringify([
                    { remedy: 'Turmeric', reason: 'Supports inflammation goals.', precautions: 'Ask your doctor if using blood thinners.' },
                    { remedy: 'Ashwagandha', reason: 'May support stress balance.', precautions: 'Avoid during pregnancy unless advised.' },
                    { remedy: 'Elderberry', reason: 'Supports immune wellness.', precautions: 'Consult your doctor for autoimmune conditions.' }
                ])
            });

        const app = createTestApp();
        const res = await request(app).post('/api/chatbot/recommend');

        expect(res.statusCode).toBe(200);
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-2.5-flash');
        expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-3.5-flash');
    });
});
