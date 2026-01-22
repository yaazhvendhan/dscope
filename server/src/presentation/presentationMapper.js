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

        // 1. EXTENSIONS FIRST (Global Priority)
        // Fixes "Photos / Videos / Documents = 0" bug by ignoring folder category
        if (EXTENSIONS.photos.has(ext)) {
            stats.photos += size;
            return;
        }
        if (EXTENSIONS.videos.has(ext)) {
            stats.videos += size;
            return;
        }
        if (EXTENSIONS.documents.has(ext)) {
            stats.documents += size;
            return;
        }

        // 2. BACKEND CATEGORIES
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
        if (category === 'packages' || category === 'dependencies') {
            stats.apps += size;
            return;
        }

        // 3. FALLBACK
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
        }
    ];

    const otherCat = cats.find(c => c.id === 'other');
    if (otherCat) {
        otherCat.delta = getDelta(diffResult, ['unclassified']);
    }

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

    return found ? sum : null;
}

// ------ DIRECTORY MAPPING LOGIC (RECURSIVE) ------

function mapDirectoryNode(node) {
    const mapped = {
        name: node.name,
        path: node.path,
        size: node.size,
        category: node.category,
        type: node.type,
        children: []
    };

    if (node.children) {
        mapped.children = node.children
            // 1. FILTER NOISE
            .filter(child => child.name && !HIDDEN_DIRS.has(child.name) && !child.name.startsWith('.'))
            // 2. RECURSIVE MAP
            .map(child => mapDirectoryNode(child))
            // 3. SORT BY SIZE DESC
            .sort((a, b) => b.size - a.size);
    }

    return mapped;
}

module.exports = { mapToUI };
