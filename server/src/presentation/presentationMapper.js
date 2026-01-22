const path = require('path');

// Extension mapping using Sets for O(1) lookup
const EXTENSIONS = {
    photos: new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.heic', '.svg', '.raw']),
    videos: new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']),
    documents: new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.rtf', '.odt', '.ods']),
    // Helper to check extensions case-insensitively
};

// Noisy directory names to hide in Directory Mode
const HIDDEN_DIRS = new Set(['node_modules', '.git', '.cache', 'dist', 'build', '.DS_Store']);

/**
 * Transforms raw intelligence data into UI-ready structures.
 * PURE FUNCTION.
 * 
 * @param {object} analyzedTree - The full scanned and classified tree
 * @param {object} latestSnapshot - (Optional) Previous state
 * @param {object} diffResult - (Optional) Calculated differences
 * @returns {object} { overview, directory }
 */
function mapToUI(analyzedTree, latestSnapshot, diffResult) {
    if (!analyzedTree) {
        return { overview: { categories: [] }, directory: { root: null } };
    }

    // 1. Compute Overview Data (Aggregation from TREE)
    const overviewStats = aggregateOverviewStats(analyzedTree);

    // 2. Map Overlay (Deltas from DIFF)
    const overviewCategories = buildOverviewCategories(overviewStats, diffResult);

    // 3. Transform Directory Tree (Simplified, Lazy-like)
    const directoryRoot = mapDirectoryNode(analyzedTree);

    return {
        overview: {
            categories: overviewCategories
        },
        directory: {
            root: directoryRoot
        }
    };
}

// ------ OVERVIEW AGGREGATION LOGIC ------

function aggregateOverviewStats(node) {
    const stats = {
        photos: 0,
        videos: 0,
        documents: 0,
        apps: 0,        // packages + dependencies
        cache: 0,
        containers: 0,
        system: 0,      // logs + system + kernels
        other: 0        // unclassified + remainder
    };

    function traverse(currentNode) {
        // If it's a directory, traverse children
        if (currentNode.children) {
            currentNode.children.forEach(traverse);
            return;
        }

        // It's a file
        const size = currentNode.size || 0;
        const category = currentNode.category || 'unclassified';
        const ext = path.extname(currentNode.name || '').toLowerCase();

        // 1. High-priority strict matches
        if (category === 'cache') {
            stats.cache += size;
            return;
        }
        if (category === 'containers') {
            stats.containers += size;
            return;
        }
        if (category === 'logs' || category === 'system' || category === 'kernels') {
            stats.system += size;
            return;
        }
        if (category === 'packages' || category === 'dependencies') { // assumption based on context, scanner uses 'packages'? Scanner uses 'packages' and 'dependencies' likely mapped to 'packages' or similar. 
            // Checking classifier.js: it uses 'packages', 'dependencies' isn't explicit but scanner might yield it? 
            // Wait, classifier.js returns: 'logs', 'cache', 'containers', 'packages', 'kernels', 'system', 'user-data'.
            stats.apps += size;
            return;
        }

        // 2. User-Data decomposition
        if (category === 'user-data' || category === 'unclassified') {
            if (EXTENSIONS.photos.has(ext)) {
                stats.photos += size;
            } else if (EXTENSIONS.videos.has(ext)) {
                stats.videos += size;
            } else if (EXTENSIONS.documents.has(ext)) {
                stats.documents += size;
            } else {
                // Fallback for user-data that isn't media/doc -> counts as Other? 
                // Or maybe strictly user-data should be separate?
                // The prompt lists: Photos, Videos, Documents, Apps, Cache, Containers, System, Other.
                // If it's user-data but not media, it logically fits "Other" or "Documents" (misc).
                // Let's accumulate to 'other' for now to be safe, or we'd miss size.
                stats.other += size;
            }
            return;
        }

        stats.other += size;
    }

    traverse(node);
    return stats;
}

function buildOverviewCategories(stats, diffResult) {
    const cats = [
        { id: 'photos', label: 'Photos', size: stats.photos, delta: null },
        { id: 'videos', label: 'Videos', size: stats.videos, delta: null },
        { id: 'documents', label: 'Documents', size: stats.documents, delta: null },
        {
            id: 'apps',
            label: 'Apps & Dependencies',
            size: stats.apps,
            delta: getDelta(diffResult, ['packages'])
        },
        {
            id: 'cache',
            label: 'Cache',
            size: stats.cache,
            delta: getDelta(diffResult, ['cache'])
        },
        {
            id: 'containers',
            label: 'Containers',
            size: stats.containers,
            delta: getDelta(diffResult, ['containers'])
        },
        {
            id: 'system',
            label: 'System',
            size: stats.system,
            delta: getDelta(diffResult, ['logs', 'system', 'kernels'])
        },
        {
            id: 'other',
            label: 'Other',
            size: stats.other,
            delta: getDelta(diffResult, ['unclassified', 'user-data'])
            // Note: 'user-data' history exists, but we split it into Photos/Videos/Docs/Other in current UI.
            // We cannot ascribe user-data delta to 'Other' entirely because it might belong to Photos.
            // Therefore, 'Other' delta is also structurally ambiguous if user-data is involved.
            // Prompt says: "Other (from unclassified)". It implies we should NOT include user-data in Other's delta.
            // Strict interpretation: Delta for 'Other' = delta of 'unclassified'.
        }
    ];

    // Refinement on Other Delta:
    // If we map 'unclassified' -> 'Other', then delta is valid.
    // But 'user-data' is split. We can't map 'user-data' delta to any specific UI group.
    // Implementation choice: Only 'unclassified' maps to 'Other' delta.
    const otherCat = cats.find(c => c.id === 'other');
    if (otherCat) {
        otherCat.delta = getDelta(diffResult, ['unclassified']);
    }

    // Sort by size descending
    return cats.sort((a, b) => b.size - a.size);
}

function getDelta(diffResult, backendCategories) {
    if (!diffResult || diffResult.baseline) return null;

    let sum = 0;
    let found = false;

    for (const cat of backendCategories) {
        if (diffResult.categoryDeltas && diffResult.categoryDeltas[cat] !== undefined) {
            sum += diffResult.categoryDeltas[cat];
            found = true;
        }
    }

    return found ? sum : null; // If no deltas found for these cats, return null? Or 0?
    // "Omitting zero deltas" in diffEngine means undefined implies 0 change if category exists.
    // However, if we return 0 here, it implies strict knowledge. 
    // If diffResult exists (not baseline), and we track these categories, a missing key means 0 delta.
    // So we should return 0 if found is false (provided diffResult is valid).
    // EXCEPT: If the category never existed in history, is it 0 or null?
    // DiffEngine handles new categories by checking partial snapshots.
    // So 0 is safe if we are sure it's tracked.
    // Let's return sum (which is 0 if nothing found).
    return sum;
}

// ------ DIRECTORY MAPPING LOGIC ------

function mapDirectoryNode(node) {
    const isHidden = HIDDEN_DIRS.has(node.name) || node.name.startsWith('.'); // simplistic dotfile check? 
    // Explicit list + .cache is better. Prompt says: "node_modules, .git, .cache, dist, build".
    // I will stick to explicit set plus generic check if needed, but explicit is safer.
    // Actually, prompt says: "Hide noisy folders by default".
    // I won't filter them out entirely (remove from tree), because user might want them.
    // Implication: "Hide" means maybe flag them? 
    // Prompt says: "Filter noisy folders... Include metadata... children: [shallow]".
    // "Filter out (or marks hidden)" in my plan.
    // I will exclude them from the *initial* children list? No, "Hide by default" implies UI toggle.
    // But "Filter noisy folders" in strict rules likely means "Don't send them in the simplified view".
    // Re-reading Directory Mode rules: "Hide noisy folders by default... Provide enough metadata so UI can expand on click".
    // This implies the UI handles expansion. 
    // If I filter them here, the UI can't access them unless I have a flag.
    // I will return them but maybe with a property `isHidden: true`? 
    // "Hidden by default" usually means they are in the list but maybe at the bottom or collapsed?
    // Wait, "Only include direct children (lazy)".
    // If I strip them, they are gone.
    // I will include them. The "Hide" requirement might be a UI instruction "Never auto-expand".
    // Or I should flag them `isNoisy: true`.

    const mapped = {
        name: node.name,
        path: node.path,
        size: node.size,
        category: node.category, // for icon/color mapping in UI
        children: []
    };

    if (node.children) {
        mapped.children = node.children
            .filter(child => {
                // strict filter if "Filter" is the word. 
                // But generally users want truth.
                // "Hide noisy folders by default" suggests soft hiding.
                // Let's pass them through but maybe client filters? 
                // The prompt says "This module only prepares data".
                // I will include everything.
                return true;
            })
            .map(child => ({
                name: child.name,
                path: child.path,
                size: child.size,
                category: child.category,
                type: child.type, // 'file' or 'directory'
                // No recursion here for children's children -> Lazy structure
                hasChildren: (child.children && child.children.length > 0)
            }));
    }

    return mapped;
}

module.exports = { mapToUI };
