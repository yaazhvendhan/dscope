/**
 * Computes the numeric difference between two disk usage snapshots.
 * PURE FUNCTION. No side effects. No UI logic.
 *
 * @param {object|null} previousSnapshot - The older snapshot (or null if first run)
 * @param {object} currentSnapshot - The newer snapshot
 * @returns {object} - Diff result { baseline, totalDelta, categoryDeltas }
 */
function computeCategoryDiff(previousSnapshot, currentSnapshot) {
    // strict input validation not required per prompt "Assume input schema is valid", 
    // but defensive coding is good.
    if (!currentSnapshot) {
        // Technically an error based on contract "currentSnapshot // always present",
        // but returning a zero-value baseline is safe.
        return { baseline: true, totalDelta: 0, categoryDeltas: {} };
    }

    // CASE 1: Baseline (First run)
    if (!previousSnapshot) {
        return {
            baseline: true,
            totalDelta: 0,
            categoryDeltas: {}
        };
    }

    // CASE 2: Comparison
    // Compute total delta
    const totalDelta = (currentSnapshot.totalSize || 0) - (previousSnapshot.totalSize || 0);

    const categoryDeltas = {};

    // Get union of all categories from both snapshots
    const prevCats = previousSnapshot.categories || {};
    const currCats = currentSnapshot.categories || {};

    const allKeys = new Set([
        ...Object.keys(prevCats),
        ...Object.keys(currCats)
    ]);

    // Optional: Sort keys for deterministic debug output
    const sortedKeys = Array.from(allKeys).sort();

    for (const key of sortedKeys) {
        const prevVal = prevCats[key] || 0;
        const currVal = currCats[key] || 0;
        const delta = currVal - prevVal;

        // Omit zero deltas
        if (delta !== 0) {
            categoryDeltas[key] = delta;
        }
    }

    return {
        baseline: false,
        totalDelta,
        categoryDeltas
    };
}

module.exports = { computeCategoryDiff };
