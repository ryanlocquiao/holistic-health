const jwt = require('jsonwebtoken');
const {
    createAccessToken,
    createTokenFamilyId,
    generateRefreshToken,
    getRefreshTokenExpiresAt,
    hashRefreshToken
} = require('../../utils/tokens');

/**
 * Unit tests for token helper behavior.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/unit/tokens.test.js
 */

const ORIGINAL_ENV = process.env;

beforeEach(() => {
    process.env = {
        ...ORIGINAL_ENV,
        JWT_SECRET: 'unit-test-jwt-secret',
        REFRESH_TOKEN_HASH_SECRET: 'unit-test-refresh-secret',
        ACCESS_TOKEN_EXPIRES_IN: '15m',
        REFRESH_TOKEN_TTL_DAYS: '7'
    };
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

describe('token utilities', () => {
    test('generateRefreshToken returns high-entropy base64url-looking values', () => {
        const first = generateRefreshToken();
        const second = generateRefreshToken();

        expect(first).not.toBe(second);
        expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(first.length).toBeGreaterThanOrEqual(40);
    });

    test('hashRefreshToken is deterministic and does not expose plaintext token', () => {
        const token = 'refresh-token-value';
        const hash = hashRefreshToken(token, 'test-secret');

        expect(hash).toBe(hashRefreshToken(token, 'test-secret'));
        expect(hash).not.toBe(token);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
        expect(hash).not.toBe(hashRefreshToken(`${token}-changed`, 'test-secret'));
    });

    test('createTokenFamilyId returns compact hex family identifiers', () => {
        const familyId = createTokenFamilyId();

        expect(familyId).toMatch(/^[a-f0-9]{32}$/);
    });

    test('getRefreshTokenExpiresAt uses REFRESH_TOKEN_TTL_DAYS', () => {
        process.env.REFRESH_TOKEN_TTL_DAYS = '2';
        const now = new Date('2026-06-28T12:00:00.000Z');
        const expiresAt = getRefreshTokenExpiresAt(now);

        expect(expiresAt.toISOString()).toBe('2026-06-30T12:00:00.000Z');
    });

    test('createAccessToken preserves the existing userId payload shape', () => {
        const token = createAccessToken({ id: 42, email: 'user@example.com' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        expect(decoded.userId).toBe(42);
        expect(decoded.email).toBe('user@example.com');
    });
});
