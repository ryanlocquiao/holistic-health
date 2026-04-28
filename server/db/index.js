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

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

module.exports = pool;