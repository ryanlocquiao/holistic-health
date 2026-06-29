const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db/index');

/**
 * Token utilities.
 *
 * Environment:
 * - JWT_SECRET: required for access JWT signing.
 * - ACCESS_TOKEN_EXPIRES_IN: optional JWT lifetime, defaults to `15m`.
 * - REFRESH_TOKEN_TTL_DAYS: optional refresh-token lifetime, defaults to `7`.
 * - REFRESH_TOKEN_HASH_SECRET: optional HMAC secret for refresh-token hashes.
 *   Defaults to JWT_SECRET when not set.
 * - REFRESH_TOKENS_TABLE: optional table-name override, defaults to
 *   `refresh_tokens`. Keep this to a trusted identifier only.
 */

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;
const REFRESH_TOKEN_BYTES = 32;
const TOKEN_FAMILY_BYTES = 16;
const DEFAULT_REFRESH_TOKENS_TABLE = 'refresh_tokens';

const TOKEN_ERRORS = {
    INVALID: 'REFRESH_TOKEN_INVALID',
    EXPIRED: 'REFRESH_TOKEN_EXPIRED',
    REVOKED: 'REFRESH_TOKEN_REVOKED',
    REUSE_DETECTED: 'REFRESH_TOKEN_REUSE_DETECTED'
};

function getJwtSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

    console.error('Missing JWT_SECRET env var');
    return null;
}

function getRefreshTokenHashSecret() {
    const secret = process.env.REFRESH_TOKEN_HASH_SECRET || process.env.JWT_SECRET;
    if (secret) return secret;

    console.error('Missing REFRESH_TOKEN_HASH_SECRET or JWT_SECRET env var');
    return null;
}

function getRefreshTokenTableName() {
    const tableName = process.env.REFRESH_TOKENS_TABLE || DEFAULT_REFRESH_TOKENS_TABLE;

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
        throw new Error('REFRESH_TOKENS_TABLE must be a valid SQL identifier.');
    }

    return tableName;
}

function getRefreshTokenTtlDays() {
    const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || DEFAULT_REFRESH_TOKEN_TTL_DAYS);
    if (!Number.isFinite(ttlDays) || ttlDays <= 0) return DEFAULT_REFRESH_TOKEN_TTL_DAYS;
    return ttlDays;
}

function getPublicUser(user) {
    return { id: user.id, email: user.email };
}

function createAccessToken(user) {
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) return null;

    return jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || ACCESS_TOKEN_EXPIRES_IN
    });
}

function generateRefreshToken() {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

function createTokenFamilyId() {
    return crypto.randomBytes(TOKEN_FAMILY_BYTES).toString('hex');
}

/**
 * Hashes an opaque refresh token for storage and lookup.
 *
 * HMAC-SHA-256 is intentionally used instead of bcrypt because refresh-token
 * verification needs a deterministic hash that can be searched with a unique
 * index. Bcrypt is excellent for passwords, but its random salt and cost factor
 * make it a poor fit for fast exact-token lookup.
 */
function hashRefreshToken(refreshToken, secret = getRefreshTokenHashSecret()) {
    if (!secret) {
        throw new Error('Refresh token hash secret is not configured.');
    }

    return crypto
        .createHmac('sha256', secret)
        .update(String(refreshToken))
        .digest('hex');
}

function getRefreshTokenExpiresAt(now = new Date()) {
    const ttlMs = getRefreshTokenTtlDays() * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + ttlMs);
}

async function insertRefreshToken(db, tokenRecord) {
    const tableName = getRefreshTokenTableName();
    const result = await db.query(
        `INSERT INTO ${tableName} (user_id, token_hash, token_family_id, expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
            tokenRecord.userId,
            tokenRecord.tokenHash,
            tokenRecord.tokenFamilyId,
            tokenRecord.expiresAt
        ]
    );

    return result.rows[0];
}

async function issueTokenPair(user, db = pool, tokenFamilyId = createTokenFamilyId()) {
    const accessToken = createAccessToken(user);
    if (!accessToken) return null;

    const refreshToken = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiresAt();

    await insertRefreshToken(db, {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        tokenFamilyId,
        expiresAt
    });

    return {
        accessToken,
        token: accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
        user: getPublicUser(user)
    };
}

function isExpired(expiresAt, now = new Date()) {
    return new Date(expiresAt).getTime() <= now.getTime();
}

async function revokeTokenFamily(client, userId, tokenFamilyId) {
    const tableName = getRefreshTokenTableName();

    await client.query(
        `UPDATE ${tableName}
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE user_id = $1
            AND token_family_id = $2`,
        [userId, tokenFamilyId]
    );
}

/**
 * Rotates a refresh token and detects token reuse.
 *
 * A token that has `used_at` set was already exchanged for a replacement. If it
 * appears again, the safest assumption is that an old token may have leaked, so
 * the full token family is revoked and the caller must require a fresh login.
 */
async function rotateRefreshToken(refreshToken, db = pool) {
    const tableName = getRefreshTokenTableName();
    const tokenHash = hashRefreshToken(refreshToken);
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const tokenResult = await client.query(
            `SELECT rt.id,
                    rt.user_id,
                    rt.token_family_id,
                    rt.expires_at,
                    rt.revoked_at,
                    rt.used_at,
                    u.email
             FROM ${tableName} rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1
             LIMIT 1
             FOR UPDATE`,
            [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { ok: false, code: TOKEN_ERRORS.INVALID, message: 'Invalid refresh token' };
        }

        const currentToken = tokenResult.rows[0];

        if (currentToken.used_at) {
            await revokeTokenFamily(client, currentToken.user_id, currentToken.token_family_id);
            await client.query('COMMIT');
            return {
                ok: false,
                code: TOKEN_ERRORS.REUSE_DETECTED,
                message: 'Refresh token reuse detected. Please log in again.'
            };
        }

        if (currentToken.revoked_at) {
            await client.query('ROLLBACK');
            return { ok: false, code: TOKEN_ERRORS.REVOKED, message: 'Refresh token has been revoked' };
        }

        if (isExpired(currentToken.expires_at)) {
            await client.query('ROLLBACK');
            return { ok: false, code: TOKEN_ERRORS.EXPIRED, message: 'Refresh token expired' };
        }

        const user = { id: currentToken.user_id, email: currentToken.email };
        const accessToken = createAccessToken(user);
        if (!accessToken) {
            await client.query('ROLLBACK');
            return { ok: false, code: TOKEN_ERRORS.INVALID, message: 'Server configuration error' };
        }

        const replacementRefreshToken = generateRefreshToken();
        const replacementExpiresAt = getRefreshTokenExpiresAt();
        const replacementResult = await insertRefreshToken(client, {
            userId: user.id,
            tokenHash: hashRefreshToken(replacementRefreshToken),
            tokenFamilyId: currentToken.token_family_id,
            expiresAt: replacementExpiresAt
        });

        await client.query(
            `UPDATE ${tableName}
             SET used_at = NOW(),
                 revoked_at = NOW(),
                 replaced_by_token_id = $1
             WHERE id = $2`,
            [replacementResult.id, currentToken.id]
        );

        await client.query('COMMIT');

        return {
            ok: true,
            accessToken,
            token: accessToken,
            refreshToken: replacementRefreshToken,
            refreshTokenExpiresAt: replacementExpiresAt,
            user: getPublicUser(user)
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function revokeRefreshToken(refreshToken, db = pool) {
    const tableName = getRefreshTokenTableName();
    const tokenHash = hashRefreshToken(refreshToken);
    const result = await db.query(
        `UPDATE ${tableName}
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE token_hash = $1
         RETURNING id`,
        [tokenHash]
    );

    return result.rows.length > 0;
}

module.exports = {
    TOKEN_ERRORS,
    createAccessToken,
    createTokenFamilyId,
    generateRefreshToken,
    getPublicUser,
    getRefreshTokenExpiresAt,
    getRefreshTokenTableName,
    hashRefreshToken,
    issueTokenPair,
    revokeRefreshToken,
    rotateRefreshToken
};
