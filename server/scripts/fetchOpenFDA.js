/**
 * Seeds real prescription and OTC medications from openFDA's drug label API.
 *
 * Run:
 * - npm run seed:openfda
 *
 * Environment:
 * - OPENFDA_API_KEY: optional. Without it: 1,000 requests/day per IP.
 *   With it: 120,000/day. Rate stays 240 req/min either way. Get one free,
 *   no approval wait, at https://open.fda.gov/apis/authentication.
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { default: PQueue } = require('p-queue');
const pool = require('../db/index');

const API_KEY = process.env.OPENFDA_API_KEY;
const BASE_URL = 'https://api.fda.gov/drug/label.json';
const RESULTS_PER_TERM = 3;

// Curated by therapeutic category, prioritizing drugs most likely to be
// combined with natural compounds (and most likely to already have an
// entry in your INTERACTIONS data to cross-reference against).
const SEARCH_TERMS = [
    // Pain relievers / NSAIDs
    'acetaminophen', 'ibuprofen', 'naproxen sodium', 'aspirin',
    // Antihistamines / allergy
    'diphenhydramine', 'loratadine', 'cetirizine', 'fexofenadine',
    // Acid reducers
    'omeprazole', 'famotidine', 'esomeprazole',
    // Cough / cold
    'dextromethorphan', 'guaifenesin', 'pseudoephedrine', 'phenylephrine',
    // Blood thinners / anticoagulants
    'warfarin', 'clopidogrel', 'apixaban', 'rivaroxaban',
    // Antidepressants / SSRIs
    'sertraline', 'fluoxetine', 'escitalopram', 'citalopram', 'paroxetine',
    // Statins
    'atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin',
    // Diabetes medications
    'metformin', 'glipizide',
    // Blood pressure
    'lisinopril', 'losartan', 'amlodipine', 'metoprolol', 'hydrochlorothiazide',
    // Thyroid
    'levothyroxine',
    // Sleep aids
    'zolpidem',
    // Antibiotics
    'amoxicillin', 'azithromycin', 'ciprofloxacin'
];

// Rate limiter - same pattern as fetchUSDA.js
const queue = new PQueue({ concurrency: 3 });

const UPSERT_MEDICATION_SQL = `
    INSERT INTO medications (name, common_name)
    VALUES ($1, $2)
    ON CONFLICT (name) DO UPDATE SET
        common_name = COALESCE(EXCLUDED.common_name, medications.common_name)
    RETURNING id, name
`;

function toTitleCase(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSearchUrl(term) {
    const params = new URLSearchParams({
        search: `openfda.generic_name:"${term}"`,
        limit: String(RESULTS_PER_TERM)
    });
    if (API_KEY) params.set('api_key', API_KEY);
    return `${BASE_URL}?${params.toString()}`;
}

async function searchOpenFDA(term) {
    const res = await fetch(buildSearchUrl(term));

    // openFDA returns 404 (with a JSON error body) for zero-match searches,
    // rather than 200 + an empty array - this is documented behavior, not
    // an error worth failing the pipeline over.
    if (res.status === 404) return [];

    if (!res.ok) {
        console.error(`[${new Date().toISOString()}] FAILED: ${term} - ${res.status}`);
        return [];
    }

    const data = await res.json();
    return data.results || [];
}

function pickBrandNames(openfda) {
    const brands = openfda.brand_name || [];
    if (brands.length === 0) return null;
    return brands.slice(0, 3).join(', ');
}

function pickGenericName(openfda, fallbackTerm) {
    const generics = openfda.generic_name || [];
    return generics.length > 0 ? generics[0] : fallbackTerm;
}

async function upsertMedicationFromLabel(record, searchTerm) {
    const openfda = record.openfda || {};
    const name = toTitleCase(pickGenericName(openfda, searchTerm));
    const commonName = pickBrandNames(openfda);

    const result = await pool.query(UPSERT_MEDICATION_SQL, [name, commonName]);
    return result.rows[0];
}

async function fetchOpenFDA() {
    console.log(`[${new Date().toISOString()}] Starting openFDA pipeline - ${SEARCH_TERMS.length} terms`);

    if (!API_KEY) {
        console.log(`[${new Date().toISOString()}] No OPENFDA_API_KEY set - using the unauthenticated 1,000 req/day limit`);
    }

    const tasks = SEARCH_TERMS.map((term) =>
        queue.add(async () => {
            console.log(`[${new Date().toISOString()}] Searching: ${term}`);

            const results = await searchOpenFDA(term);

            if (results.length === 0) {
                console.log(`[${new Date().toISOString()}] No results: ${term}`);
                return;
            }

            const record = await upsertMedicationFromLabel(results[0], term);
            console.log(`[${new Date().toISOString()}] Upserted: ${record.name} (id: ${record.id})`);
        })
    );

    await Promise.all(tasks);

    const count = await pool.query('SELECT COUNT(*) FROM medications');
    console.log(`[${new Date().toISOString()}] Done - ${count.rows[0].count} total medications in DB`);
}

module.exports = fetchOpenFDA;

if (require.main === module) {
    fetchOpenFDA()
        .catch((err) => {
            console.error('openFDA pipeline failed:', err.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
