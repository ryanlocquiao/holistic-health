const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const DEFAULT_AUTH_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_MAX_REQUESTS = 15;
const DEFAULT_AUTHENTICATED_MAX_REQUESTS = 300;
const DEFAULT_CHATBOT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_CHATBOT_MAX_REQUESTS = 3;

function readPositiveIntegerEnv(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getUserAwareKey(req) {
    if (req.user && req.user.userId) return `user.${req.user.userId}`;
    return ipKeyGenerator(req);
}

/**
 * Creates a limiter that prefers req.user.userId once requireAuth has run.
 *
 * Run/test:
 * - cd server
 * - npm test -- --runTestsByPath tests/unit/rateLimiters.test.js
 */
function createUserAwareLimiter({ windowMs, max, message }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: getUserAwareKey,
        message
    });
}

const authLimiter = rateLimit({
    windowMs: DEFAULT_AUTH_WINDOW_MS,
    max: DEFAULT_AUTH_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const authenticatedLimiter = createUserAwareLimiter({
    windowMs: DEFAULT_AUTH_WINDOW_MS,
    max: DEFAULT_AUTHENTICATED_MAX_REQUESTS,
    message: { error: 'Too many requests, please try again later.' }
});

const chatbotLimiter = createUserAwareLimiter({
    windowMs: readPositiveIntegerEnv('CHATBOT_RATE_LIMIT_WINDOW_MS', DEFAULT_CHATBOT_WINDOW_MS),
    max: readPositiveIntegerEnv('CHATBOT_RATE_LIMIT_MAX', DEFAULT_CHATBOT_MAX_REQUESTS),
    message: {
        error: 'Recommendation limit reached. Please try again later.',
        code: 'CHATBOT_RATE_LIMITED'
    }
});

module.exports = {
    authLimiter,
    authenticatedLimiter,
    chatbotLimiter,
    createUserAwareLimiter
};
