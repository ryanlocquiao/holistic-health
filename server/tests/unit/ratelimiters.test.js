const express = require('express');
const request = require('supertest');
const { createUserAwareLimiter } = require('../../middleware/rateLimiters');

/**
 * Unit tests for the authenticated-route rate limiter.
 *
 * These use small, purpose-built limiters (max: 1-2) instead of the real
 * authenticatedLimiter's max: 300, so a test doesn't need 300 requests to
 * prove the behavior. The keying logic under test is identical to
 * middleware/rateLimiters.js.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/unit/rateLimiters.test.js
 */

function buildKeyedLimiter(max, message = { error: 'Too many requests, please try again later.' }) {
    return createUserAwareLimiter({
        windowMs: 15 * 60 * 1000,
        max,
        message
    });
}

function buildTestApp(limiter, userIdHeader = 'x-test-user') {
    const app = express();
    app.use((req, res, next) => {
        const headerValue = req.headers[userIdHeader];
        req.user = { userId: headerValue ? Number(headerValue) : 1 };
        next();
    });
    app.use(limiter);
    app.get('/protected-resource', (req, res) => res.json({ ok: true }));
    return app;
}

describe('authenticated route limiter', () => {
    test('allows requests under the limit', async () => {
        const app = buildTestApp(buildKeyedLimiter(5));
        const res = await request(app).get('/protected-resource');

        expect(res.statusCode).toBe(200);
        expect(res.headers['ratelimit-limit']).toBeDefined();
    });

    test('returns 429 once a single user exceeds the limit', async () => {
        const app = buildTestApp(buildKeyedLimiter(2));

        await request(app).get('/protected-resource');
        await request(app).get('/protected-resource');
        const blocked = await request(app).get('/protected-resource');

        expect(blocked.statusCode).toBe(429);
        expect(blocked.body).toEqual({ error: 'Too many requests, please try again later.' });
    });

    test('can return the chatbot-specific rate limit response', async () => {
        const app = buildTestApp(buildKeyedLimiter(1, {
            error: 'Recommendation limit reached. Please try again later.',
            code: 'CHATBOT_RATE_LIMITED'
        }));

        await request(app).get('/protected-resource');
        const blocked = await request(app).get('/protected-resource');

        expect(blocked.statusCode).toBe(429);
        expect(blocked.body).toEqual({
            error: 'Recommendation limit reached. Please try again later.',
            code: 'CHATBOT_RATE_LIMITED'
        });
    });

    test('keys by user id, so two different users get independent limits', async () => {
        const app = buildTestApp(buildKeyedLimiter(1));

        const userOneFirst = await request(app).get('/protected-resource').set('x-test-user', '1');
        const userOneSecond = await request(app).get('/protected-resource').set('x-test-user', '1');
        const userTwoFirst = await request(app).get('/protected-resource').set('x-test-user', '2');

        expect(userOneFirst.statusCode).toBe(200);
        expect(userOneSecond.statusCode).toBe(429);
        expect(userTwoFirst.statusCode).toBe(200);
    });
});
