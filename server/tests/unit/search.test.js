const { searchCompounds } = require('../../utils/search');

/**
 * Unit tests for `searchCompounds` ranking logic.
 *
 * Why these tests exist:
 * - Validate ranking behavior independent from HTTP and DB concerns.
 * - Guard weighted matching logic (exact, fuzzy, ailment, metadata, tier).
 *
 * Run:
 * - cd server
 * - npm test
 */

// Sample compound data that mirrors real DB records
const MOCK_COMPOUNDS = [
    {
        id: 1,
        name: 'Melatonin',
        category: 'Sleep Aid',
        description: 'A hormone that regulates sleep-wake cycles, used for insomnia and jet lag.',
        evidence_tier: 1,
        source_url: 'https://www.nccih.nih.gov/health/melatonin'
    },
    {
        id: 2,
        name: 'Valerian Root',
        category: 'Sleep Aid',
        description: 'An herb commonly used for insomnia and sleep disorders.',
        evidence_tier: 2,
        source_url: 'https://www.nccih.nih.gov/health/valerian'
    },
    {
        id: 3,
        name: 'Ashwagandha',
        category: 'Adaptogen',
        description: 'An adaptogenic herb used to reduce stress and anxiety.',
        evidence_tier: 2,
        source_url: 'https://www.nccih.nih.gov/health/ashwagandha'
    },
    {
        id: 4,
        name: 'Magnesium',
        category: 'Mineral',
        description: 'An essential mineral used for sleep, muscle recovery, and anxiety.',
        evidence_tier: 1,
        source_url: 'https://www.nccih.nih.gov/health/magnesium'
    },
    {
        id: 5,
        name: 'Echinacea',
        category: 'Immune Support',
        description: 'A flowering plant used to prevent or shorten the duration of the common cold.',
        evidence_tier: 2,
        source_url: 'https://www.nccih.nih.gov/health/echinacea'
    }
];

const MOCK_AILMENT_MAP = {
    1: ['insomnia', 'jet lag', 'sleep disorders'],
    2: ['insomnia', 'anxiety', 'sleep disorders'],
    3: ['anxiety', 'stress', 'fatigue'],
    4: ['insomnia', 'anxiety', 'muscle recovery'],
    5: ['immune support', 'common cold', 'respiratory health']
};

function runSearch(query) {
    return searchCompounds(MOCK_COMPOUNDS, MOCK_AILMENT_MAP, query);
}

function buildManyCompounds(count) {
    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        name: `Compound ${index + 1}`,
        category: 'General Wellness',
        description: 'Supports recovery and wellness.',
        evidence_tier: (index % 3) + 1,
        source_url: 'https://example.com'
    }));
}

function buildManyAilments(count) {
    const map = {};

    for (let i = 1; i <= count; i += 1) {
        map[i] = ['wellness'];
    }

    return map;
}

describe('searchCompounds', () => {
    test('exact match on compound name returns that compound as top result', () => {
        const results = runSearch('melatonin');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Melatonin');
    });

    test('matching is case-insensitive and trims surrounding spaces', () => {
        const results = runSearch('   MeLaToNiN   ');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Melatonin');
    });

    test('misspelled query returns correct compound via fuzzy match', () => {
        const results = runSearch('meltonin');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Melatonin');
    });

    test('tier 1 compound ranks above tier 2 compound with equal ailment match', () => {
        const results = runSearch('insomnia');
        const melatoninIndex = results.findIndex((result) => result.name === 'Melatonin');
        const valerianIndex = results.findIndex((result) => result.name === 'Valerian Root');

        expect(melatoninIndex).toBeGreaterThanOrEqual(0);
        expect(valerianIndex).toBeGreaterThanOrEqual(0);
        expect(melatoninIndex).toBeLessThan(valerianIndex);
    });

    test('ailment keyword can drive results when name does not match exactly', () => {
        const results = runSearch('respiratory health');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Echinacea');
    });

    test('each returned item includes a computed score field', () => {
        const results = runSearch('insomnia');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toHaveProperty('score');
        expect(typeof results[0].score).toBe('number');
    });

    test('empty string query returns empty array', () => {
        expect(runSearch('')).toEqual([]);
    });

    test('whitespace-only query returns empty array', () => {
        expect(runSearch('     ')).toEqual([]);
    });

    test('query with no matches returns empty array', () => {
        expect(runSearch('zzzzzzzzzzzzz')).toEqual([]);
    });

    test('result count is capped at 10 for broad matches', () => {
        const compounds = buildManyCompounds(25);
        const ailmentMap = buildManyAilments(25);
        const results = searchCompounds(compounds, ailmentMap, 'wellness');

        expect(results.length).toBeLessThanOrEqual(10);
    });

    test('does not mutate original compound objects', () => {
        const originalFirst = { ...MOCK_COMPOUNDS[0] };
        runSearch('insomnia');

        expect(MOCK_COMPOUNDS[0]).toEqual(originalFirst);
        expect(MOCK_COMPOUNDS[0]).not.toHaveProperty('score');
    });
});