/**
 * Run with: npm run seed:usda
 * or
 * Run with: npm run seed:manual
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { default: PQueue } = require('p-queue');
const pool = require('../db/index');

const API_KEY = process.env.USDA_API_KEY;
const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// List of natural compounds
const SEARCH_TERMS = [
  'turmeric', 'ginger', 'garlic', 'chamomile', 'peppermint',
  'elderberry', 'dandelion', 'nettle', 'aloe vera', 'oregano',
  'lions mane mushroom', 'ginkgo nuts', 'basil'
];

// Rate limiter to avoid hitting USDA's limit
const queue = new PQueue({ concurrency: 3 });

async function searchUSDA(term) {
    const url = `${BASE_URL}/foods/search?query=${encodeURIComponent(term)}&api_key=${API_KEY}&pageSize=5&dataType=Foundation,SR%20Legacy`;

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
    const evidence_tier = 2;    // USDA = Institutional Recommendation = Tier 2
    const query = `
        INSERT INTO compounds (name, category, description, evidence_tier, source_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO UPDATE SET
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            source_url = EXCLUDED.source_url
        RETURNING id, name
    `;
    const result = await pool.query(query, [name, category, description, evidence_tier, source_url]);
    
    return result.rows[0];
}

async function fetchUSDA() {
    console.log('API KEY:', process.env.USDA_API_KEY);
    console.log(`[${new Date().toISOString()}] Starting USDA pipeline - ${SEARCH_TERMS.length} terms`);

    const tasks = SEARCH_TERMS.map(term =>
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

    await Promise.all(tasks);

    const count = await pool.query('SELECT COUNT(*) FROM compounds');
    console.log(`[${new Date().toISOString()}] Done - ${count.rows[0].count} total compounds in DB`);

    await pool.end();
}

fetchUSDA().catch(err => {
    console.error('Pipeline failed:', err.message);
    process.exit(1);
});