require('dotenv').config();
const fetch = require('node-fetch');
const pool = require('../db/index');

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const SELECT_COMPOUND_SQL = 'SELECT id FROM compounds WHERE name ILIKE $1 LIMIT 1';
const UPSERT_SOURCE_SQL = `
    INSERT INTO sources (compound_id, title, url, doi, publisher)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
`;
const UPDATE_TIER_SQL = 'UPDATE compounds SET evidence_tier = 1 WHERE id = $1';

const COMPOUNDS_TO_SEARCH = [
    'turmeric curcumin', 'ashwagandha', 'melatonin sleep', 'valerian root insomnia', 'magnesium anxiety', 'echinacea immune', 'st johns wort depression', 'ginkgo biloba memory', 'berberine diabetes', 'omega 3 inflammation', 'coenzyme q10 heart', 'NAC liver', 'lions mane cognitive', 'rhodiola adaptogen', 'passionflower anxiety'
];

function getCompoundSearchName(term) {
    return term.split(' ')[0]
}

async function searchPubMed(term) {
    const searchUrl = `${BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=1&retmode=json`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return null;

    const fetchUrl = `${BASE_URL}/esummary.fcgi?db=pubmed&id=${ids[0]}&retmode=json`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) return null;

    const fetchData = await fetchRes.json();
    const article = fetchData.result?.[ids[0]];
    if (!article) return null;

    return {
        title: article.title,
        url: `https://pubmed.ncbi.nlm.nih.gov/${ids[0]}/`,
        doi: article.elocationid || null,
        publisher: article.source || null,
    };
}

async function fetchPubMed() {
    console.log(`[${new Date().toISOString()}] Starting PubMed pipeline - ${COMPOUNDS_TO_SEARCH.length} terms`);

    for (const term of COMPOUNDS_TO_SEARCH) {
        console.log(`[${new Date().toISOString()}] Searching PubMed: ${term}`);

        const article = await searchPubMed(term);
        if (!article) {
            console.log(`[${new Date().toISOString()}] No results: ${term}`);
            continue;
        }

        const compoundName = getCompoundSearchName(term);
        const compoundResult = await pool.query(SELECT_COMPOUND_SQL, [`%${compoundName}%`]);

        if (compoundResult.rows.length === 0) {
            console.log(`[${new Date().toISOString()}] Compound not found in DB: ${compoundName}`);
            continue;
        }

        const compoundId = compoundResult.rows[0].id;

        await pool.query(UPSERT_SOURCE_SQL, [compoundId, article.title, article.url, article.doi, article.publisher]);

        await pool.query(UPDATE_TIER_SQL, [compoundId]);

        console.log(`[${new Date().toISOString()}] Inserted source & upgraded to Tier 1: ${compoundName}`);
    }

    const tier1Count = await pool.query(`SELECT COUNT(*) FROM compounds WHERE evidence_tier = 1`);
    console.log(`[${new Date().toISOString()}] Done - ${tier1Count.rows[0].count} Tier 1 compounds`);
}

module.exports = fetchPubMed;