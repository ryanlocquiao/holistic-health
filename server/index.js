require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://my-holistic-health.vercel.app'
    ]
}));

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const pool = require('./db');

// Test DB connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('Database connection failed:', err.message);
    else     console.log('Database connected at:', res.rows[0].now);
});

const searchRoutes = require('./routes/search');
const compoundRoutes = require('./routes/compounds');

app.use('/api/search', searchRoutes);
app.use('/api/compounds', compoundRoutes);