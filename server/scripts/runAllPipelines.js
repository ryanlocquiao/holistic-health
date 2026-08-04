require('dotenv').config();
const fetchUSDA = require('./fetchUSDA');
const fetchPubMed = require('./fetchPubMed');
const fetchNCCIH = require('./fetchNCCIH');
const pool = require('../db/index');
const fetchOpenFDA = require('./fetchOpenFDA');

/**
 * Runs all ingestion pipelines together.
 *
 * Run:
 * - node scripts/runAllPipelines.js
 *
 * What it does:
 * - Executes USDA, PubMed, NCCIH, and openFDA ingestion work concurrently.
 * - Measures total runtime for basic operational feedback.
 * - Closes the shared database pool once all work completes or fails.
 *
 * Verify:
 * - Observe terminal logs from each pipeline.
 * - Confirm the final elapsed-time summary prints.
 */

async function runAllPipelines() {
    console.log(`[${new Date().toISOString()}] Starting all 4 pipelines concurrently...`);
    const start = Date.now();

    try {
        await Promise.all([
            fetchUSDA(),
            fetchPubMed(),
            fetchNCCIH(),
            fetchOpenFDA()
        ]);

        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`[${new Date().toISOString()}] All 4 pipelines complete in ${elapsed}s`);
    } finally {
        await pool.end();
    }
}

runAllPipelines().catch((err) => {
    console.error('Pipeline failed:', err.message);
    process.exit(1);
});
