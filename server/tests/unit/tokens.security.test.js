const {
    createAccessToken,
    getRefreshTokenTableName,
    hashRefreshToken
} = require('../../utils/tokens');

/**
 * Additional unit tests for utils/tokens.js, covering branches the existing
 * tests/unit/tokens.test.js doesn't reach:
 *  - getRefreshTokenTableName's SQL-identifier validation. This value is
 *    interpolated directly into raw SQL via template literals (see
 *    rotateRefreshToken/revokeRefreshToken), so a bad value here is a SQL
 *    injection path if REFRESH_TOKENS_TABLE is ever mistyped or
 *    attacker-influenced in the environment.
 *  - hashRefreshToken's secret fallback chain (REFRESH_TOKEN_HASH_SECRET ->
 *    JWT_SECRET -> throw). The existing tests always pass an explicit
 *    secret, so this chain has never actually run.
 *  - createAccessToken's behavior when JWT_SECRET is missing entirely.
 *
 * Run:
 * - cd server
 * - npm test -- --runTestsByPath tests/unit/tokens.security.test.js
 */

const ORIGINAL_ENV = process.env;
let errorSpy;

beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.REFRESH_TOKENS_TABLE;
    delete process.env.REFRESH_TOKEN_HASH_SECRET;
    delete process.env.JWT_SECRET;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    errorSpy.mockRestore();
});

afterAll(() => {
    process.env = ORIGINAL_ENV;
});

describe('getRefreshTokenTableName', () => {
    test('defaults to refresh_tokens when no override is set', () => {
        expect(getRefreshTokenTableName()).toBe('refresh_tokens');
    });

    test('accepts a valid custom table name', () => {
        process.env.REFRESH_TOKENS_TABLE = 'legacy_refresh_tokens';
        expect(getRefreshTokenTableName()).toBe('legacy_refresh_tokens');
    });

    test('rejects a table name starting with a digit', () => {
        process.env.REFRESH_TOKENS_TABLE = '1refresh_tokens';
        expect(() => getRefreshTokenTableName()).toThrow(
            'REFRESH_TOKENS_TABLE must be a valid SQL identifier.'
        );
    });

    test('rejects a SQL injection attempt', () => {
        process.env.REFRESH_TOKENS_TABLE = 'refresh_tokens; DROP TABLE users;--';
        expect(() => getRefreshTokenTableName()).toThrow(
            'REFRESH_TOKENS_TABLE must be a valid SQL identifier.'
        );
    });

    test('rejects a table name containing a space', () => {
        process.env.REFRESH_TOKENS_TABLE = 'refresh tokens';
        expect(() => getRefreshTokenTableName()).toThrow(
            'REFRESH_TOKENS_TABLE must be a valid SQL identifier.'
        );
    });
});

describe('hashRefreshToken secret fallback', () => {
    test('uses REFRESH_TOKEN_HASH_SECRET when it is set', () => {
        process.env.REFRESH_TOKEN_HASH_SECRET = 'hash-secret';
        process.env.JWT_SECRET = 'jwt-secret';

        expect(hashRefreshToken('token')).toBe(hashRefreshToken('token', 'hash-secret'));
    });

    test('falls back to JWT_SECRET when REFRESH_TOKEN_HASH_SECRET is unset', () => {
        process.env.JWT_SECRET = 'jwt-secret';

        expect(hashRefreshToken('token')).toBe(hashRefreshToken('token', 'jwt-secret'));
    });

    test('throws when neither secret is configured', () => {
        expect(() => hashRefreshToken('token')).toThrow(
            'Refresh token hash secret is not configured.'
        );
    });
});

describe('createAccessToken without JWT_SECRET', () => {
    test('returns null instead of throwing, and logs the misconfiguration', () => {
        const token = createAccessToken({ id: 1, email: 'user@example.com' });

        expect(token).toBeNull();
        expect(errorSpy).toHaveBeenCalledWith('Missing JWT_SECRET env var');
    });
});