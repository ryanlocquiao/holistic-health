function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
    }

    return matrix[b.length][a.length];
}

function scoreCompound(compound, ailments, query) {
    const q = query.toLowerCase().trim();
    let score = 0;
    const name = (compound.name || '').toLowerCase();
    const description = (compound.description || '').toLowerCase();
    const category = (compound.category || '').toLowerCase();
    const ailmentNames = ailments.map(a => a.toLowerCase());

    // Exact names should give the highest weight
    if (name === q)            score += 10;
    else if (name.includes(q)) score += 6;
    else if (q.includes(name)) score += 4;

    // Fuzzy name match - levenshtein distance <= 2
    const dist = levenshtein(q, name);
    if (dist <= 2) score += (3 - dist);

    // Ailment match
    for (const ailment of ailmentNames) {
        if (ailment === q) score += 8;
        else if (ailment.includes(q) || q.includes(ailment)) score += 5;
        else if (levenshtein(q, ailment) <= 2) score += 2;
    }

    if (description.includes(q)) score += 3;

    if (category.includes(q)) score += 2;

    if (compound.evidence_tier === 1)      score += 3;
    else if (compound.evidence_tier === 2) score += 1.5;

    return score;
}

function searchCompounds(compounds, ailmentMap, query) {
    if (!query || query.trim() === '') return [];

    const scored = compounds.map(compound => ({
        ...compound,
        score: scoreCompound(compound, ailmentMap[compound.id] || [], query)
    }))
    .filter(c => c.score > 0);

    // Max-heap simulation - sort score by descending: take top 10
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10);
}

module.exports = { searchCompounds };