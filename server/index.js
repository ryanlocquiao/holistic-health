require('dotenv').config();
const express = require('express');
const cors = require('cors');

/**
 * Server bootstrap
 *
 * Exports the Express `app` so the test harness (Supertest) can import
 * the application without the side-effect of starting the HTTP server.
 */
const app = express();
const PORT = process.env.PORT || 8080;
const pool = require('./db/index');

const searchRoutes = require('./routes/search');
const compoundRoutes = require('./routes/compounds');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

/**
 * Basic service setup.
 *
 * Run:
 * - npm run dev (if configured) or npm start from server package.
 *
 * Verify:
 * - GET /health returns { status: 'ok' }
 * - API routes under /api/search and /api/compounds respond as expected.
 */

const allowedOrigins = [
    'http://localhost:5173',
    'https://my-holistic-health.vercel.app',
    'https://holistic-health-api.onrender.com'
];

// Allow a single client origin override from environment for local/test overrides
if (process.env.CLIENT_URL) allowedOrigins.unshift(process.env.CLIENT_URL);

app.use(
    cors({
        origin: allowedOrigins
    })
);

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/search', searchRoutes);
app.use('/api/compounds', compoundRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Test DB connection on startup
async function testDbConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database connected at:', result.rows[0].now);
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
}

// Only start listening when this file is executed directly.
// When imported by Supertest, listen() is intentionally skipped.
if (require.main === module) {
    (async () => {
        try {
            await testDbConnection();
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        } catch (err) {
            console.error('Failed to start server', err);
            process.exit(1);
        }
    })();
}

module.exports = app;