require('dotenv').config();
const pool = require('../db/index');

const INTERACTIONS = [
    { compound: 'St. Johns Wort', medication: 'Warfarin', severity: 3, description: 'St. Johns Wort significantly reduces warfarin effectiveness, increasing risk of blood clots.' },
    { compound: 'St. Johns Wort', medication: 'Antidepressants', severity: 3, description: 'Combining St. Johns Wort with antidepressants can cause serotonin syndrome, a potentially life-threatening condition.' },
    { compound: 'St. Johns Wort', medication: 'Birth Control', severity: 3, description: 'St. Johns Wort can reduce the effectiveness of oral contraceptives.' },
    { compound: 'Ginkgo Biloba', medication: 'Warfarin', severity: 3, description: 'Ginkgo may increase bleeding risk when combined with blood thinners.' },
    { compound: 'Ginkgo Biloba', medication: 'Aspirin', severity: 2, description: 'Ginkgo combined with aspirin may increase bleeding risk.' },
    { compound: 'Valerian Root', medication: 'Sedatives', severity: 2, description: 'Valerian may enhance the sedative effect of prescription sleep medications.' },
    { compound: 'Valerian Root', medication: 'Alcohol', severity: 2, description: 'Valerian combined with alcohol may cause excessive sedation.' },
    { compound: 'Garlic, raw', medication: 'Warfarin', severity: 2, description: 'High-dose garlic supplements may increase the anticoagulant effect of warfarin.' },
    { compound: 'Garlic, raw', medication: 'HIV Medications', severity: 3, description: 'Garlic supplements can significantly reduce the effectiveness of certain HIV protease inhibitors.' },
    { compound: 'Echinacea', medication: 'Immunosuppressants', severity: 3, description: 'Echinacea stimulates the immune system and may counteract immunosuppressive drugs.' },
    { compound: 'Melatonin', medication: 'Blood Thinners', severity: 1, description: 'Melatonin may mildly enhance the effects of anticoagulant medications.' },
    { compound: 'Melatonin', medication: 'Sedatives', severity: 2, description: 'Melatonin combined with sedative medications may cause excessive drowsiness.' },
    { compound: 'Ginseng', medication: 'Warfarin', severity: 2, description: 'Ginseng may reduce the effectiveness of warfarin, requiring dose adjustment.' },
    { compound: 'Ginseng', medication: 'MAO Inhibitors', severity: 3, description: 'Ginseng combined with MAOIs can cause headache, tremors, and mania.' },
    { compound: 'Omega-3 Fatty Acids', medication: 'Blood Thinners', severity: 2, description: 'High-dose omega-3 supplements may increase bleeding risk when combined with anticoagulants.' },
    { compound: 'Berberine', medication: 'Metformin', severity: 2, description: 'Berberine has similar blood sugar lowering effects to metformin and combining them may cause hypoglycemia.' },
    { compound: 'Berberine', medication: 'Cyclosporine', severity: 3, description: 'Berberine significantly increases cyclosporine blood levels, risking toxicity.' },
    { compound: 'Milk Thistle', medication: 'Statins', severity: 1, description: 'Milk thistle may mildly affect statin metabolism through liver enzyme interactions.' },
    { compound: 'Magnesium', medication: 'Antibiotics', severity: 2, description: 'Magnesium can reduce absorption of certain antibiotics if taken at the same time.' },
    { compound: 'Magnesium', medication: 'Diuretics', severity: 2, description: 'Some diuretics increase magnesium excretion, while others cause retention.' },
];

async function fetchNCCIH() {
    console.log(`[${new Date().toISOString()}] Starting NCCIH pipeline - ${INTERACTIONS.length} interactions`);

    for (const interaction of INTERACTIONS) {
        const compoundResult = await pool.query(
            `SELECT id FROM compounds WHERE name ILIKE $1 LIMIT 1`,
            [interaction.compound]
        );

        if (compoundResult.rows.length === 0) {
            console.log(`[${new Date().toISOString()}] Compound not found: ${interaction.compound}`);
            continue;
        }

        const medicationResult = await pool.query(
            `INSERT INTO medications (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
            [interaction.medication]
        );

        const compoundId = compoundResult.rows[0].id;
        const medicationId = medicationResult.rows[0].id;

        await pool.query(
            `INSERT INTO interactions (compound_id, medication_id, severity, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [compoundId, medicationId, interaction.severity, interaction.description]
        );

        console.log(`[${new Date().toISOString()}] Inserted: ${interaction.compound} → ${interaction.medication} (severity ${interaction.severity})`);
    }

    const count = await pool.query(`SELECT COUNT(*) FROM interactions`);
    console.log(`[${new Date().toISOString()}] Done - ${count.rows[0].count} total interactions in DB`);
}

module.exports = fetchNCCIH;