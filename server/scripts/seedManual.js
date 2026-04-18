/**
 * This file is meant to serve as a helper to fetchUSDA in
 * manually seeding compounds instead of relying on the USDA API.
 * This is used in order to filter out bad or non-useful results.
 */

require('dotenv').config();
const pool = require('../db/index');

const MANUAL_COMPOUNDS = [
  { name: 'Ashwagandha', category: 'Adaptogen', description: 'An adaptogenic herb used in Ayurvedic medicine to reduce stress and anxiety.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/ashwagandha' },
  { name: 'Echinacea', category: 'Immune Support', description: 'A flowering plant used to prevent or shorten the duration of the common cold.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/echinacea' },
  { name: 'Valerian Root', category: 'Sleep Aid', description: 'An herb commonly used for insomnia and sleep disorders.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/valerian' },
  { name: 'St. Johns Wort', category: 'Mood Support', description: 'A plant used for depression, anxiety, and sleep disorders.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/st-johns-wort' },
  { name: 'Melatonin', category: 'Sleep Aid', description: 'A hormone that regulates sleep-wake cycles, used for insomnia and jet lag.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/melatonin' },
  { name: 'Magnesium', category: 'Mineral', description: 'An essential mineral involved in hundreds of biochemical reactions, used for sleep and muscle recovery.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/magnesium' },
  { name: 'Zinc', category: 'Mineral', description: 'An essential mineral that supports immune function and wound healing.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/zinc' },
  { name: 'Vitamin D', category: 'Vitamin', description: 'A fat-soluble vitamin essential for bone health and immune function.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/vitamin-d' },
  { name: 'Vitamin C', category: 'Vitamin', description: 'An antioxidant vitamin that supports immune function and collagen synthesis.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/vitamin-c' },
  { name: 'Omega-3 Fatty Acids', category: 'Essential Fatty Acid', description: 'Polyunsaturated fats found in fish oil, used for heart health and inflammation.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/omega3-supplements' },
  { name: 'Probiotics', category: 'Digestive Health', description: 'Live beneficial bacteria used to support gut health and immune function.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/probiotics-what-you-need-to-know' },
  { name: 'Milk Thistle', category: 'Liver Support', description: 'An herb used to protect and support liver function.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/milk-thistle' },
  { name: 'Ginseng', category: 'Adaptogen', description: 'A root used in traditional medicine for energy, focus, and immune support.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/asian-ginseng' },
  { name: 'Ginkgo Biloba', category: 'Cognitive Support', description: 'An herb used to improve memory and cognitive function.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/ginkgo' },
  { name: 'Lavender', category: 'Anxiety Relief', description: 'An aromatic herb used for anxiety, insomnia, and relaxation.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/lavender' },
  { name: 'Passionflower', category: 'Anxiety Relief', description: 'A vine used for anxiety and insomnia relief.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/passionflower' },
  { name: 'Lemon Balm', category: 'Anxiety Relief', description: 'A lemon-scented herb used for stress, anxiety, and sleep problems.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/lemon-balm' },
  { name: 'Rhodiola', category: 'Adaptogen', description: 'An adaptogenic herb used for fatigue, stress, and mental performance.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/rhodiola' },
  { name: 'Maca Root', category: 'Energy & Vitality', description: 'A Peruvian root vegetable used for energy, fertility, and hormonal balance.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/maca' },
  { name: 'Boswellia', category: 'Anti-inflammatory', description: 'A resin extract used for inflammation, arthritis, and joint pain.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/boswellia' },
  { name: 'Berberine', category: 'Metabolic Support', description: 'A plant alkaloid used for blood sugar regulation and metabolic health.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/berberine' },
  { name: 'Quercetin', category: 'Antioxidant', description: 'A flavonoid antioxidant used for inflammation and allergy relief.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/quercetin' },
  { name: 'Resveratrol', category: 'Antioxidant', description: 'A polyphenol found in red wine used for heart health and longevity.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/resveratrol' },
  { name: 'Coenzyme Q10', category: 'Energy Support', description: 'An antioxidant compound used for heart health and energy production.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/coenzyme-q10' },
  { name: 'NAC (N-Acetyl Cysteine)', category: 'Antioxidant', description: 'An amino acid derivative used for liver support, respiratory health, and mental health.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/nac' },
  { name: 'Lions Mane Mushroom', category: 'Cognitive Support', description: 'A medicinal mushroom used for cognitive function and nerve health.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/lions-mane' },
  { name: 'Reishi Mushroom', category: 'Immune Support', description: 'A medicinal mushroom used for immune support and stress relief.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/reishi' },
  { name: 'Chaga Mushroom', category: 'Antioxidant', description: 'A fungus used for immune support and antioxidant properties.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/chaga' },
  { name: 'Saw Palmetto', category: 'Mens Health', description: 'A palm plant extract used for prostate health and hair loss.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/saw-palmetto' },
  { name: 'Black Cohosh', category: 'Womens Health', description: 'An herb used for menopause symptoms including hot flashes.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/black-cohosh' },
  { name: 'Turmeric', category: 'Anti-inflammatory', description: 'A bright yellow spice with potent anti-inflammatory and antioxidant properties, used for joint pain, inflammation, and digestive health.', evidence_tier: 1, source_url: 'https://www.nccih.nih.gov/health/turmeric' },
  { name: 'Holy Basil', category: 'Adaptogen', description: 'An adaptogenic herb used in Ayurvedic medicine for stress, anxiety, and blood sugar regulation.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/holy-basil' },
  { name: 'Slippery Elm', category: 'Digestive Health', description: 'A tree bark used to soothe irritated mucous membranes in the digestive tract.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/slippery-elm' },
  { name: 'Aloe Vera', category: 'Skin Health', description: 'A succulent plant used topically for skin conditions and internally for digestive support.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/aloe-vera' },
  { name: 'Bacopa', category: 'Cognitive Support', description: 'An Ayurvedic herb used to improve memory, focus, and cognitive function.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/bacopa' },
  { name: 'Evening Primrose', category: 'Womens Health', description: 'An oil used for menopause symptoms, PMS, and skin conditions.', evidence_tier: 2, source_url: 'https://www.nccih.nih.gov/health/evening-primrose-oil' },
];

async function seedManual() {
    console.log(`Seeding ${MANUAL_COMPOUNDS.length} manual compounds...`);

    for (const compound of MANUAL_COMPOUNDS) {
        const query = `
            INSERT INTO compounds (name, category, description, evidence_tier, source_url) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (name) DO UPDATE SET
                category = EXCLUDED.category,
                description = EXCLUDED.description,
                source_url = EXCLUDED.source_url
            RETURNING id, name
        `;

        const result = await pool.query(query, [
            compound.name,
            compound.category,
            compound.description,
            compound.evidence_tier,
            compound.source_url
        ]);
        
        console.log(`Inserted: ${result.rows[0].name} (id: ${result.rows[0].id})`);
    }

    const count = await pool.query('SELECT COUNT(*) FROM compounds');
    console.log(`Done - ${count.rows[0].count} total compounds in DB`);
    await pool.end();
}

seedManual().catch(err => {
    console.error('Manual seed failed:', err.message);
    process.exit(1);
});