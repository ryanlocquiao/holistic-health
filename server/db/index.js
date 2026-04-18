const { Pool } = require('pg');

/**
 * Shared PostgreSQL connection pool.
 *
 * Usage:
 * - Import this module where DB access is required.
 * - Use `pool.query(...)` for simple query execution.
 *
 * Notes:
 * - `DATABASE_URL` must be defined in environment variables.
 * - SSL is enabled for production deployments.
 */
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = pool;