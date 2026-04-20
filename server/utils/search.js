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

function getAllowedFuzzyDistance(query, target) {
    const maxLength = Math.max(query.length, target.length);
    if (maxLength <= 4) return 1;
    if (maxLength <= 8) return 2;
    return 2;
}

function isFuzzyMatch(query, target) {
    if (!query || !target) return false;

    const distance = levenshtein(query, target);
    const allowedDistance = Math.min(MAX_FUZZY_DISTANCE, getAllowedFuzzyDistance(query, target));
    const maxLength = Math.max(query.length, target.length);

    // Guard against random strings matching only by absolute distance.
    if (distance / maxLength > 0.3) return false;

    return distance <= allowedDistance;
}

function scoreCompound(compound, ailments, normalizedQuery) {
    let textScore = 0;
    let qualityScore = 0;
    const name = normalizeText(compound.name);
    const description = normalizeText(compound.description);
    const category = normalizeText(compound.category);

    if (name) {
        if (name === normalizedQuery) textScore += 10;
        else if (name.includes(normalizedQuery)) textScore += 6;

        if (isFuzzyMatch(normalizedQuery, name)) {
            const dist = levenshtein(normalizedQuery, name);
            textScore += 3 - Math.min(dist, 2);
        }
    }

    for (const ailmentName of ailments) {
        const ailment = normalizeText(ailmentName);
        if (!ailment) continue;

        if (ailment === normalizedQuery) textScore += 8;
        else if (ailment.includes(normalizedQuery)) textScore += 5;
        else if (isFuzzyMatch(normalizedQuery, ailment)) textScore += 2;
    }

    if (description.includes(normalizedQuery)) textScore += 3;
    if (category.includes(normalizedQuery)) textScore += 2;

    // Evidence tier should rank already-relevant matches, not create matches.
    if (textScore > 0) {
        if (compound.evidence_tier === 1) qualityScore += 3;
        else if (compound.evidence_tier === 2) qualityScore += 1.5;
    }

    return textScore + qualityScore;
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