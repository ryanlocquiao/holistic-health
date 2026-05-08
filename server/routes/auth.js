// Authentication routes
// Requires: jsonwebtoken, bcrypt, express-validator
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db/index');

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';

if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Authentication tokens will fail.');
}

// POST /api/auth/register
router.post('/register', [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const existing = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with that email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
            [email, passwordHash]
        );

        const user = result.rows[0];

        if (!process.env.JWT_SECRET) {
            console.error('Missing JWT_SECRET env var');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });

        res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT id, email, password_hash FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('Missing JWT_SECRET env var');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });

        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;