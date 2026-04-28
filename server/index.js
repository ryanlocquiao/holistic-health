require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;
const pool = require('./db');

const searchRoutes = require('./routes/search');
const compoundRoutes = require('./routes/compounds');

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

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://my-holistic-health.vercel.app',
        'https://holistic-health-api.onrender.com'
    ]
}));

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/search', searchRoutes);
app.use('/api/compounds', compoundRoutes);

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
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        testDbConnection();
    });
}

module.exports = app;