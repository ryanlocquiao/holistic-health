const MAX_FUZZY_DISTANCE = 2;
const RESULT_LIMIT = 10;

function normalizeText(value) {
    return String(value || '').toLowerCase().trim();
}

/**
 * Computes Levenshtein distance using a two-row DP matrix.
 * This keeps behavior the same while reducing memory usage.
 */
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    let prevRow = Array.from({ length: a.length + 1 }, (_, i) => i);
    let currRow = new Array(a.length + 1);

    for (let i = 1; i <= b.length; i += 1) {
        currRow[0] = i;

        for (let j = 1; j <= a.length; j += 1) {
            const substitutionCost = b[i - 1] === a[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,
                currRow[j - 1] + 1,
                prevRow[j - 1] + substitutionCost
            );
        }

        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[a.length];
}

function scoreCompound(compound, ailments, normalizedQuery) {
    let score = 0;
    const name = normalizeText(compound.name);
    const description = normalizeText(compound.description);
    const category = normalizeText(compound.category);

    if (name) {
        if (name === normalizedQuery) score += 10;
        else if (name.includes(normalizedQuery)) score += 6;
        else if (normalizedQuery.includes(name)) score += 4;

        const dist = levenshtein(normalizedQuery, name);
        if (dist <= MAX_FUZZY_DISTANCE) score += 3 - dist;
    }

    for (const ailmentName of ailments) {
        const ailment = normalizeText(ailmentName);
        if (!ailment) continue;

        if (ailment === normalizedQuery) score += 8;
        else if (ailment.includes(normalizedQuery) || normalizedQuery.includes(ailment)) score += 5;
        else if (levenshtein(normalizedQuery, ailment) <= MAX_FUZZY_DISTANCE) score += 2;
    }

    if (description.includes(normalizedQuery)) score += 3;
    if (category.includes(normalizedQuery)) score += 2;

    if (compound.evidence_tier === 1) score += 3;
    else if (compound.evidence_tier === 2) score += 1.5;

    return score;
}

/**
 * Scores all compounds against a free-text query and returns top matches.
 */
function searchCompounds(compounds, ailmentMap, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    const scored = compounds
        .map((compound) => ({
            ...compound,
            score: scoreCompound(compound, ailmentMap[compound.id] || [], normalizedQuery)
        }))
        .filter((compound) => compound.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, RESULT_LIMIT);
}

module.exports = { searchCompounds };