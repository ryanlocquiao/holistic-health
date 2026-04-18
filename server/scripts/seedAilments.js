require('dotenv').config();
const pool = require('../db/index');

const AILMENTS = [
    'insomnia', 'anxiety', 'stress', 'inflammation', 'depression', 'fatigue', 'digestive issues', 'immune support', 'joint pain', 'high blood pressure', 'high cholesterol', 'blood sugar regulation', 'memory and focus', 'menopause symptoms', 'mens health', 'liver support', 'respiratory health', 'skin health', 'muscle recovery', 'heart health'
];

const COMPOUND_AILMENT_MAP = {
    'insomnia':              ['Melatonin', 'Valerian Root', 'Magnesium', 'Passionflower', 'Lemon Balm', 'Lavender'],
    'anxiety':               ['Ashwagandha', 'Lavender', 'Passionflower', 'Lemon Balm', 'Magnesium', 'Rhodiola', 'Valerian Root'],
    'stress':                ['Ashwagandha', 'Rhodiola', 'Magnesium', 'Lemon Balm', 'Holy Basil', 'Reishi Mushroom'],
    'inflammation':          ['Turmeric', 'Boswellia', 'Omega-3 Fatty Acids', 'Ginger root, raw', 'Quercetin', 'Berberine'],
    'depression':            ['St. Johns Wort', 'Omega-3 Fatty Acids', 'Rhodiola', 'Vitamin D', 'NAC (N-Acetyl Cysteine)'],
    'fatigue':               ['Ashwagandha', 'Rhodiola', 'Coenzyme Q10', 'Maca Root', 'Ginseng', 'Vitamin D', 'Magnesium'],
    'digestive issues':      ['Probiotics', 'Ginger root, raw', 'Peppermint, fresh', 'Slippery Elm', 'Aloe Vera'],
    'immune support':        ['Echinacea', 'Elderberries, raw', 'Vitamin C', 'Vitamin D', 'Zinc', 'Reishi Mushroom', 'Chaga Mushroom'],
    'joint pain':            ['Boswellia', 'Omega-3 Fatty Acids', 'Turmeric', 'Ginger root, raw', 'Quercetin'],
    'high blood pressure':   ['Magnesium', 'Omega-3 Fatty Acids', 'Garlic, raw', 'Coenzyme Q10', 'Berberine'],
    'high cholesterol':      ['Berberine', 'Omega-3 Fatty Acids', 'Garlic, raw', 'Milk Thistle', 'Resveratrol'],
    'blood sugar regulation':['Berberine', 'Magnesium', 'Chromium', 'Cinnamon', 'Omega-3 Fatty Acids'],
    'memory and focus':      ['Ginkgo Biloba', 'Lions Mane Mushroom', 'Rhodiola', 'Ginseng', 'Bacopa'],
    'menopause symptoms':    ['Black Cohosh', 'Maca Root', 'Evening Primrose', 'St. Johns Wort'],
    'mens health':           ['Saw Palmetto', 'Maca Root', 'Zinc', 'Ashwagandha'],
    'liver support':         ['Milk Thistle', 'NAC (N-Acetyl Cysteine)', 'Dandelion greens, raw', 'Turmeric'],
    'respiratory health':    ['NAC (N-Acetyl Cysteine)', 'Echinacea', 'Elderberries, raw', 'Vitamin C'],
    'skin health':           ['Vitamin C', 'Zinc', 'Omega-3 Fatty Acids', 'Aloe Vera', 'Resveratrol'],
    'muscle recovery':       ['Magnesium', 'Omega-3 Fatty Acids', 'Coenzyme Q10', 'Ashwagandha'],
    'heart health':          ['Omega-3 Fatty Acids', 'Coenzyme Q10', 'Garlic, raw', 'Resveratrol', 'Berberine'],
};

async function seedAilments() {
    console.log('Seeding ailments...');

    for (const name of AILMENTS) {
        await pool.query(
            `INSERT INTO ailments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]
        );
        console.log(`Inserted ailment: ${name}`);
    }

    console.log('\nLinking compounds to ailments...');

    for (const [ailmentName, compoundNames] of Object.entries(COMPOUND_AILMENT_MAP)) {
        const ailmentResult = await pool.query(
            `SELECT id FROM ailments WHERE name = $1`, [ailmentName]
        );

        if (ailmentResult.rows.length === 0) continue;
        const ailmentId = ailmentResult.rows[0].id;

        for (const compoundName of compoundNames) {
            const compoundResult = await pool.query(
                `SELECT id FROM compounds WHERE name ILIKE $1`, [compoundName]
            );

            if (compoundResult.rows.length === 0) {
                console.log(`    Skipped (not found): ${compoundName}`);
                continue;
            }

            const compoundId = compoundResult.rows[0].id;
            await pool.query(
                `INSERT INTO compound_ailments (compound_id, ailment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [compoundId, ailmentId]
            );

            console.log(`    Linked: ${compoundName} → ${ailmentName}`);
        }
    }

    const count = await pool.query('SELECT COUNT(*) FROM compound_ailments');
    console.log(`\nDone - ${count.rows[0].count} compound-ailment links created`);
    await pool.end();
}

seedAilments().catch(err => {
    console.error('Ailment seed failed', err.message);
    process.exit(1);
});