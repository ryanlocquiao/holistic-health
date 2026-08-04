require('dotenv').config();
const pool = require('../db/index');

/**
 * Seeds canonical interaction records from NCCIH-style guidance.
 *
 * Run:
 * - node scripts/fetchNCCIH.js
 * - or include it in a broader pipeline runner.
 *
 * Verify:
 * - Check terminal output for inserted interaction rows.
 * - Validate with SELECT COUNT(*) FROM interactions;
 */

const SELECT_COMPOUNDS_SQL = 'SELECT id, name FROM compounds';
const UPSERT_MEDICATION_SQL = `
    INSERT INTO medications (name, common_name)
    VALUES ($1, $2)
    ON CONFLICT (name) DO UPDATE SET
        name = EXCLUDED.name,
        common_name = COALESCE(EXCLUDED.common_name, medications.common_name)
    RETURNING id
`;
const INSERT_INTERACTION_SQL = `
    INSERT INTO interactions (compound_id, medication_id, severity, description)
    SELECT $1, $2, $3, $4
    WHERE NOT EXISTS (
        SELECT 1
        FROM interactions
        WHERE compound_id = $1
            AND medication_id = $2
    )
`;

const COMMON_MEDICATIONS = [
    { name: 'Acetaminophen', common_name: 'Tylenol' },
    { name: 'Ibuprofen', common_name: 'Advil, Motrin' },
    { name: 'Naproxen', common_name: 'Aleve' },
    { name: 'Aspirin', common_name: 'Bayer' },
    { name: 'Diphenhydramine', common_name: 'Benadryl' },
    { name: 'Loratadine', common_name: 'Claritin' },
    { name: 'Cetirizine', common_name: 'Zyrtec' },
    { name: 'Omeprazole', common_name: 'Prilosec' },
    { name: 'Famotidine', common_name: 'Pepcid' },
    { name: 'Metformin', common_name: 'Glucophage' },
    { name: 'Lisinopril', common_name: 'Zestril' },
    { name: 'Atorvastatin', common_name: 'Lipitor' },
    { name: 'Warfarin', common_name: 'Coumadin' },
    { name: 'Sertraline', common_name: 'Zoloft' },
    { name: 'Fluoxetine', common_name: 'Prozac' },
    { name: 'Birth Control', common_name: 'Oral contraceptives' },
    { name: 'Blood Thinners', common_name: 'Anticoagulants' },
    { name: 'Sedatives', common_name: 'Sleep medications' },
    { name: 'Antibiotics', common_name: null },
    { name: 'Diuretics', common_name: 'Water pills' },
    { name: 'Immunosuppressants', common_name: null },
    { name: 'Statins', common_name: 'Cholesterol medications' },
    { name: 'MAO Inhibitors', common_name: 'MAOIs' }
];

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
    { compound: 'St. Johns Wort', medication: 'Sertraline', severity: 3, description: 'Combining St. Johns Wort with SSRIs like sertraline can cause serotonin syndrome, a potentially life-threatening condition.' },
    { compound: 'St. Johns Wort', medication: 'Fluoxetine', severity: 3, description: 'Combining St. Johns Wort with SSRIs like fluoxetine can cause serotonin syndrome, a potentially life-threatening condition.' },
    { compound: 'St. Johns Wort', medication: 'Escitalopram', severity: 3, description: 'Combining St. Johns Wort with SSRIs like escitalopram can cause serotonin syndrome, a potentially life-threatening condition.' },
    { compound: 'St. Johns Wort', medication: 'Citalopram', severity: 3, description: 'Combining St. Johns Wort with SSRIs like citalopram can cause serotonin syndrome, a potentially life-threatening condition.' },
    { compound: 'St. Johns Wort', medication: 'Paroxetine', severity: 3, description: 'Combining St. Johns Wort with SSRIs like paroxetine can cause serotonin syndrome, a potentially life-threatening condition.' },

    { compound: 'Ginkgo Biloba', medication: 'Clopidogrel', severity: 2, description: 'Ginkgo may increase bleeding risk when combined with antiplatelet medications.' },
    { compound: 'Ginkgo Biloba', medication: 'Apixaban', severity: 3, description: 'Ginkgo may increase bleeding risk when combined with direct oral anticoagulants.' },
    { compound: 'Ginkgo Biloba', medication: 'Rivaroxaban', severity: 3, description: 'Ginkgo may increase bleeding risk when combined with direct oral anticoagulants.' },
    { compound: 'Garlic, raw', medication: 'Clopidogrel', severity: 2, description: 'High-dose garlic supplements may increase bleeding risk when combined with antiplatelet medications.' },
    { compound: 'Omega-3 Fatty Acids', medication: 'Clopidogrel', severity: 2, description: 'High-dose omega-3 supplements may increase bleeding risk when combined with antiplatelet medications.' },
    { compound: 'Omega-3 Fatty Acids', medication: 'Apixaban', severity: 2, description: 'High-dose omega-3 supplements may increase bleeding risk when combined with anticoagulant medications.' },
    { compound: 'Omega-3 Fatty Acids', medication: 'Rivaroxaban', severity: 2, description: 'High-dose omega-3 supplements may increase bleeding risk when combined with anticoagulant medications.' },
    { compound: 'Milk Thistle', medication: 'Simvastatin', severity: 1, description: 'Milk thistle may mildly affect statin metabolism through liver enzyme interactions.' },
    { compound: 'Milk Thistle', medication: 'Rosuvastatin', severity: 1, description: 'Milk thistle may mildly affect statin metabolism through liver enzyme interactions.' },
    { compound: 'Milk Thistle', medication: 'Pravastatin', severity: 1, description: 'Milk thistle may mildly affect statin metabolism through liver enzyme interactions.' },
    { compound: 'Berberine', medication: 'Glipizide', severity: 2, description: 'Berberine has similar blood sugar lowering effects to sulfonylureas and combining them may cause hypoglycemia.' },
    { compound: 'Valerian Root', medication: 'Zolpidem', severity: 2, description: 'Valerian may enhance the sedative effect of prescription sleep medications.' },
    { compound: 'Melatonin', medication: 'Zolpidem', severity: 2, description: 'Melatonin combined with sedative-hypnotic medications may cause excessive drowsiness.' },
    { compound: 'Magnesium', medication: 'Ciprofloxacin', severity: 2, description: 'Magnesium can bind to fluoroquinolone antibiotics like ciprofloxacin, significantly reducing absorption if taken together.' },
    { compound: 'Magnesium', medication: 'Hydrochlorothiazide', severity: 1, description: 'Thiazide diuretics can alter magnesium levels, requiring monitoring when combined with magnesium supplements.' },
    { compound: 'St. Johns Wort', medication: 'Apixaban', severity: 3, description: 'St. Johns Wort induces liver enzymes that metabolize apixaban, potentially lowering blood levels and reducing its clot-preventing effect.' },
    { compound: 'St. Johns Wort', medication: 'Rivaroxaban', severity: 3, description: 'St. Johns Wort induces liver enzymes that metabolize rivaroxaban, potentially lowering blood levels and reducing its clot-preventing effect.' },
    { compound: 'St. Johns Wort', medication: 'Atorvastatin', severity: 2, description: 'St. Johns Wort may reduce atorvastatin blood levels through liver enzyme induction, lowering its cholesterol-lowering effectiveness.' },
    { compound: 'St. Johns Wort', medication: 'Simvastatin', severity: 2, description: 'St. Johns Wort may reduce simvastatin blood levels through liver enzyme induction, lowering its cholesterol-lowering effectiveness.' },
    { compound: 'St. Johns Wort', medication: 'Dextromethorphan', severity: 2, description: 'St. Johns Wort has mild serotonergic activity that may add to dextromethorphan\'s effects, raising the risk of serotonin syndrome.' },
    { compound: 'Ashwagandha', medication: 'Levothyroxine', severity: 2, description: 'Ashwagandha may raise thyroid hormone levels, which can compound the effect of thyroid replacement medication and requires monitoring.' },
    { compound: 'Magnesium', medication: 'Levothyroxine', severity: 2, description: 'Magnesium can bind to levothyroxine in the gut, reducing absorption if taken at the same time. Space doses at least 4 hours apart.' },
    { compound: 'Magnesium', medication: 'Losartan', severity: 1, description: 'Magnesium has a mild blood-pressure-lowering effect that may add to losartan\'s effect, warranting monitoring at high supplement doses.' },
    { compound: 'Magnesium', medication: 'Amlodipine', severity: 1, description: 'Magnesium has a mild blood-pressure-lowering effect that may add to amlodipine\'s effect, warranting monitoring at high supplement doses.' },
    { compound: 'Ginger root, raw', medication: 'Clopidogrel', severity: 1, description: 'Ginger has mild antiplatelet activity in limited evidence, which may mildly add to clopidogrel\'s bleeding risk.' },
];

function normalizeName(value) {
    return String(value || '').toLowerCase().trim();
}

async function buildCompoundLookup() {
    const result = await pool.query(SELECT_COMPOUNDS_SQL);
    const lookup = new Map();

    for (const row of result.rows) {
        lookup.set(normalizeName(row.name), row.id);
    }

    return lookup;
}

async function getMedicationId(medicationName, medicationCache, commonName = null) {
    const cacheKey = normalizeName(medicationName);
    if (medicationCache.has(cacheKey)) {
        return medicationCache.get(cacheKey);
    }

    const medicationResult = await pool.query(UPSERT_MEDICATION_SQL, [medicationName, commonName]);
    const medicationId = medicationResult.rows[0].id;
    medicationCache.set(cacheKey, medicationId);
    return medicationId;
}

async function seedMedicationCatalog(medicationCache) {
    for (const medication of COMMON_MEDICATIONS) {
        await getMedicationId(medication.name, medicationCache, medication.common_name);
    }
}

async function fetchNCCIH() {
    console.log(`[${new Date().toISOString()}] Starting NCCIH pipeline - ${INTERACTIONS.length} interactions`);

    const compoundLookup = await buildCompoundLookup();
    const medicationCache = new Map();
    await seedMedicationCatalog(medicationCache);

    for (const interaction of INTERACTIONS) {
        const compoundId = compoundLookup.get(normalizeName(interaction.compound));

        if (!compoundId) {
            console.log(`[${new Date().toISOString()}] Compound not found: ${interaction.compound}`);
            continue;
        }

        const medicationId = await getMedicationId(interaction.medication, medicationCache);

        await pool.query(INSERT_INTERACTION_SQL, [compoundId, medicationId, interaction.severity, interaction.description]);

        console.log(`[${new Date().toISOString()}] Inserted: ${interaction.compound} -> ${interaction.medication} (severity ${interaction.severity})`);
    }

    const count = await pool.query(`SELECT COUNT(*) FROM interactions`);
    console.log(`[${new Date().toISOString()}] Done - ${count.rows[0].count} total interactions in DB`);
}

module.exports = fetchNCCIH;

if (require.main === module) {
    fetchNCCIH()
        .catch((err) => {
            console.error('NCCIH pipeline failed:', err.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
