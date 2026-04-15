require('dotenv').config();
const fetch = require('node-fetch');
const { default: PQueue } = require('p-queue');
const pool = require('../db/index');

const API_KEY = process.env.USDA_API_KEY;
const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// List of natural compounds
const SEARCH_TERMS = [
    'turmeric', 'ginger', 'echinacea', 'valerian', 'chamomile',
    'peppermint', 'lavender', 'garlic', 'ginseng', 'ashwagandha',
    'elderberry', 'St Johns Wort', 'melatonin', 'magnesium', 'zinc', 'vitamin D', 'vitamin C', 'omega 3', 'probiotics', 'licorice root', 'milk thistle', 'saw palmetto', 'black cohosh', 'ginkgo biloba', 'passionflower', 'lemon balm', 'holy basil', 'rhodiola', 'maca root', 'evening primrose', 'boswellia', 'devil claw', 'cats claw', 'feverfew','hawthorn', 'dandelion', 'nettle', 'marshmallow root', 'slippery elm', 'aloe vera', 'calendula', 'arnica', 'oregano oil', 'tea tree', 'berberine', 'quercetin', 'resveratrol', 'coenzyme Q10', 'NAC', 'lions mane', 'reishi', 'chaga'
];

// Rate limiter to avoid hitting USDA's limit
const queue = new PQueue({ concurrency: 3 });

async function searchUSDA(term) {
    const url = `${BASE_URL}/foods/search?query=${encodeURIComponent(term)}&api_key=${API_KEY}&pageSize=3&dataType=Foundation,SR%20Legacy`;

    const res = await fetch(url);
    if (!res.ok) {
        console.error(`[${new Date().toISOString()}] FAILED: ${term} - ${res.status}`);
        return [];
    }

    const data = await res.json();
    return data.foods || [];
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