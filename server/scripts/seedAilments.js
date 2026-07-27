require('dotenv').config();
const pool = require('../db/index');

/**
 * Seeds ailment names and links them to compounds.
 *
 * Run:
 * - npm run seed:ailments
 *
 * Preconditions:
 * - `compounds` table should already be seeded.
 *
 * Verify:
 * - Check terminal output for linked and skipped compounds.
 * - Validate row count with SELECT COUNT(*) FROM compound_ailments;
 */

// Top 100 Searched Symptoms
const AILMENTS = [
    'insomnia', 'anxiety', 'stress', 'inflammation', 'depression', 'fatigue', 'digestive issues', 'immune support', 'joint pain', 'high blood pressure', 'high cholesterol', 'blood sugar regulation', 'memory and focus', 'menopause symptoms', 'mens health', 'liver support', 'respiratory health', 'skin health', 'muscle recovery', 'heart health', 'headache', 'migraine', 'blisters', 'sunburn', 'nausea', 'sore throat', 'common cold', 'cold', 'bloating', 'hair loss', 'hot flashes', 'pms', 'acne',
    'back pain', 'lower back pain', 'neck pain', 'chest pain', 'abdominal pain', 'stomach pain', 'muscle aches', 'toothache',
    'fever', 'chills', 'low energy', 'weakness', 'dizziness', 'lightheadedness', 'night sweats', 'unexplained weight loss', 'unexplained weight gain', 'loss of appetite', 'excessive thirst',
    'cough', 'shortness of breath', 'nasal congestion', 'runny nose', 'sneezing', 'wheezing', 'hoarseness', 'sinus pressure',
    'vomiting', 'diarrhea', 'constipation', 'heartburn', 'indigestion', 'gas', 'stomach cramps', 'acid reflux',
    'rash', 'itching', 'dry skin', 'hives', 'easy bruising', 'dandruff', 'cold sores', 'eczema',
    'memory loss', 'brain fog', 'difficulty concentrating', 'numbness', 'tingling', 'tremor', 'vertigo',
    'mood swings', 'irritability', 'trouble sleeping',
    'muscle cramps', 'muscle stiffness', 'muscle weakness', 'swollen joints', 'leg cramps',
    'ear pain', 'ringing in ears', 'loss of smell', 'loss of taste', 'swollen glands',
    'heart palpitations', 'cold hands and feet', 'swelling in legs',
    'frequent urination', 'menstrual cramps', 'urinary tract infection symptoms', 'low libido',
    'dry eyes', 'watery eyes', 'itchy eyes', 'blurred vision',
    'allergies', 'hay fever', 'motion sickness', 'jet lag', 'hiccups', 'snoring', 'bad breath', 'canker sores'
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
    'headache':              ['Magnesium', 'Coenzyme Q10'],
    'migraine':              ['Magnesium', 'Coenzyme Q10'],
    'blisters':              ['Aloe Vera', 'Zinc'],
    'sunburn':               ['Aloe Vera'],
    'nausea':                ['Ginger root, raw'],
    'sore throat':           ['Slippery Elm'],
    'cold':           ['Echinacea', 'Elderberries, raw', 'Vitamin C', 'Zinc'],
    'common cold':           ['Echinacea', 'Elderberries, raw', 'Vitamin C', 'Zinc'],
    'bloating':              ['Peppermint, fresh', 'Ginger root, raw'],
    'hair loss':             ['Saw Palmetto'],
    'hot flashes':           ['Black Cohosh'],
    'pms':                   ['Evening Primrose'],
    'acne':                  ['Zinc', 'Evening Primrose'],
        'back pain':             ['Turmeric', 'Boswellia'],
    'lower back pain':       ['Turmeric', 'Boswellia'],
    'neck pain':             ['Turmeric', 'Boswellia'],
    'abdominal pain':        ['Ginger root, raw', 'Peppermint, fresh'],
    'stomach pain':          ['Ginger root, raw', 'Peppermint, fresh'],
    'muscle aches':          ['Magnesium', 'Turmeric'],
    'low energy':            ['Ashwagandha', 'Rhodiola', 'Ginseng', 'Coenzyme Q10'],
    'cough':                 ['NAC (N-Acetyl Cysteine)', 'Elderberries, raw'],
    'nasal congestion':      ['NAC (N-Acetyl Cysteine)', 'Elderberries, raw', 'Vitamin C'],
    'runny nose':            ['Elderberries, raw', 'Vitamin C', 'Zinc'],
    'sneezing':              ['Nettle', 'Vitamin C'],
    'hoarseness':            ['Slippery Elm'],
    'sinus pressure':        ['NAC (N-Acetyl Cysteine)', 'Elderberries, raw'],
    'vomiting':              ['Ginger root, raw'],
    'diarrhea':              ['Probiotics'],
    'constipation':          ['Probiotics'],
    'heartburn':             ['Slippery Elm'],
    'acid reflux':           ['Slippery Elm'],
    'indigestion':           ['Ginger root, raw', 'Peppermint, fresh'],
    'gas':                   ['Peppermint, fresh', 'Ginger root, raw'],
    'stomach cramps':        ['Peppermint, fresh', 'Ginger root, raw'],
    'rash':                  ['Aloe Vera'],
    'itching':               ['Aloe Vera'],
    'dry skin':              ['Aloe Vera', 'Omega-3 Fatty Acids'],
    'cold sores':            ['Lemon Balm'],
    'eczema':                ['Evening Primrose', 'Aloe Vera'],
    'memory loss':           ['Ginkgo Biloba', 'Lions Mane Mushroom', 'Bacopa'],
    'brain fog':             ['Ginkgo Biloba', 'Lions Mane Mushroom', 'Rhodiola', 'Bacopa'],
    'difficulty concentrating': ['Ginkgo Biloba', 'Lions Mane Mushroom', 'Rhodiola', 'Bacopa'],
    'mood swings':           ['Ashwagandha', 'Rhodiola'],
    'irritability':          ['Ashwagandha', 'Lemon Balm', 'Magnesium'],
    'trouble sleeping':      ['Melatonin', 'Valerian Root', 'Magnesium', 'Passionflower', 'Lemon Balm', 'Lavender'],
    'muscle cramps':         ['Magnesium'],
    'muscle stiffness':      ['Turmeric', 'Magnesium'],
    'swollen joints':        ['Turmeric', 'Boswellia', 'Omega-3 Fatty Acids'],
    'leg cramps':            ['Magnesium'],
    'ringing in ears':       ['Ginkgo Biloba'],
    'menstrual cramps':      ['Evening Primrose', 'Magnesium'],
    'frequent urination':    ['Saw Palmetto'],
    'low libido':            ['Maca Root', 'Ashwagandha'],
    'dry eyes':              ['Omega-3 Fatty Acids'],
    'itchy eyes':            ['Nettle'],
    'watery eyes':           ['Nettle'],
    'allergies':             ['Nettle', 'Vitamin C'],
    'hay fever':             ['Nettle'],
    'motion sickness':       ['Ginger root, raw'],
    'jet lag':               ['Melatonin'],
    'canker sores':          ['Slippery Elm'],
};

const INSERT_AILMENT_SQL = `
    INSERT INTO ailments (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
`;

const SELECT_AILMENT_ID_SQL = 'SELECT id FROM ailments WHERE name = $1';
const INSERT_COMPOUND_AILMENT_SQL = `
    INSERT INTO compound_ailments (compound_id, ailment_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
`;

async function buildCompoundLookup() {
    const result = await pool.query('SELECT id, name FROM compounds');
    const lookup = new Map();

    for (const row of result.rows) {
        lookup.set(String(row.name).toLowerCase(), row.id);
    }

    return lookup;
}

async function seedAilments() {
    console.log('Seeding ailments...');

    try {
        for (const name of AILMENTS) {
            await pool.query(INSERT_AILMENT_SQL, [name]);
            console.log(`Inserted ailment: ${name}`);
        }

        console.log('\nLinking compounds to ailments...');
        const compoundLookup = await buildCompoundLookup();

        for (const [ailmentName, compoundNames] of Object.entries(COMPOUND_AILMENT_MAP)) {
            const ailmentResult = await pool.query(SELECT_AILMENT_ID_SQL, [ailmentName]);

            if (ailmentResult.rows.length === 0) continue;
            const ailmentId = ailmentResult.rows[0].id;

            for (const compoundName of compoundNames) {
                const compoundId = compoundLookup.get(String(compoundName).toLowerCase());

                if (!compoundId) {
                    console.log(`    Skipped (not found): ${compoundName}`);
                    continue;
                }

                await pool.query(INSERT_COMPOUND_AILMENT_SQL, [compoundId, ailmentId]);

                console.log(`    Linked: ${compoundName} -> ${ailmentName}`);
            }
        }

        const count = await pool.query('SELECT COUNT(*) FROM compound_ailments');
        console.log(`\nDone - ${count.rows[0].count} compound-ailment links created`);
    } finally {
        await pool.end();
    }
}

seedAilments().catch((err) => {
    console.error('Ailment seed failed', err.message);
    process.exit(1);
});