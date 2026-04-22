require('dotenv').config();
const fetchUSDA = require('./fetchUSDA');
const fetchPubMed = require('./fetchPubMed');
const fetchNCCIH = require('./fetchNCCIH');
const pool = require('../db/index');

async function runAllPipelines() {
    console.log(`[${new Date().toISOString()}] Starting all 3 pipelines concurrently...`);
    const start = Date.now();

    await Promise.all([
        fetchUSDA(),
        fetchPubMed(),
        fetchNCCIH()
    ]);

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] All 3 pipelines complete in ${elapsed}s`);
    await pool.end();
}

runAllPipelines().catch(err => {
    console.error('Pipeline failed:', err.message);
    process.exit(1);
});