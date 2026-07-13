const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const authenticatedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        if (req.user && req.user.userId) return `user.${req.user.userId}`;
        return ipKeyGenerator(req);
    },
    message: { error: 'Too many requests, please try again later.' }
});

module.exports = { authLimiter, authenticatedLimiter };