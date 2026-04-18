/**
 * Seeds compounds from USDA FoodData Central search results.
 *
 * Run:
 * - npm run seed:usda
 *
 * Environment:
 * - USDA_API_KEY: required API key for FoodData Central.
 *
 * Verify:
 * - Confirm terminal logs for inserted records.
 * - Validate with SELECT COUNT(*) FROM compounds;
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { default: PQueue } = require('p-queue');
const pool = require('../db/index');

const API_KEY = process.env.USDA_API_KEY;
const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const PAGE_SIZE = 5;
const USDA_EVIDENCE_TIER = 2;

// List of natural compounds
const SEARCH_TERMS = [
  'turmeric', 'ginger', 'garlic', 'chamomile', 'peppermint',
  'elderberry', 'dandelion', 'nettle', 'aloe vera', 'oregano',
  'lions mane mushroom', 'ginkgo nuts', 'basil'
];

// Rate limiter to avoid hitting USDA's limit
const queue = new PQueue({ concurrency: 3 });

const UPSERT_COMPOUND_SQL = `
    INSERT INTO compounds (name, category, description, evidence_tier, source_url)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (name) DO UPDATE SET
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        evidence_tier = EXCLUDED.evidence_tier,
        source_url = EXCLUDED.source_url
    RETURNING id, name
`;

async function searchUSDA(term) {
    const url = `${BASE_URL}/foods/search?query=${encodeURIComponent(term)}&api_key=${API_KEY}&pageSize=${PAGE_SIZE}&dataType=Foundation,SR%20Legacy`;

    const res = await fetch(url);
    if (!res.ok) {
        console.error(`[${new Date().toISOString()}] FAILED: ${term} - ${res.status}`);
        return [];
    }

    const data = await res.json();
    const foods = data.foods || [];

    const filtered = foods.filter(f => 
        f.description.toLowerCase().includes(term.toLowerCase().split(' ')[0])
    );

    return filtered;
}

async function upsertCompound(food, searchTerm) {
    const name = food.description || searchTerm;
    const category = food.category || 'Herbal / Natural Compound';
    const description = food.additionalDescriptions || food.description || null;
    const source_url = `https://fdc.nal.usda.gov/fdc-app.html#/?fdcId=${food.fdcId}`;
    const result = await pool.query(UPSERT_COMPOUND_SQL, [
        name,
        category,
        description,
        USDA_EVIDENCE_TIER,
        source_url
    ]);
    
    return result.rows[0];
}

async function fetchUSDA() {
    if (!API_KEY) {
        throw new Error('USDA_API_KEY is missing. Add it to your environment before running seed:usda.');
    }

    console.log(`[${new Date().toISOString()}] Starting USDA pipeline - ${SEARCH_TERMS.length} terms`);

    const tasks = SEARCH_TERMS.map((term) =>
        queue.add(async () => {
            console.log(`[${new Date().toISOString()}] Fetching: ${term}`);

            const foods = await searchUSDA(term);

            if (foods.length === 0) {
                console.log(`[${new Date().toISOString()}] No results: ${term}`);
                return;
            }

            const food = foods[0];
            const record = await upsertCompound(food, term);
            console.log(`[${new Date().toISOString()}] Inserted: ${record.name} (id: ${record.id})`);
        })
    );

    try {
        await Promise.all(tasks);

        const count = await pool.query('SELECT COUNT(*) FROM compounds');
        console.log(`[${new Date().toISOString()}] Done - ${count.rows[0].count} total compounds in DB`);
    } finally {
        await pool.end();
    }
}

fetchUSDA().catch((err) => {
    console.error('Pipeline failed:', err.message);
    process.exit(1);
});