require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./index');

/**
 * Applies the SQL schema to the configured PostgreSQL database.
 *
 * Run:
 * - npm run migrate
 *
 * Verify:
 * - Confirm successful terminal output.
 * - Inspect tables in your DB client.
 */
async function runMigration() {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    try {
        await pool.query(sql);
        console.log('Migration successful - all tables created.');
        process.exitCode = 0;
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

runMigration();