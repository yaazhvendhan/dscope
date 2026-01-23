const path = require('path');

// Extension mapping using Sets for O(1) lookup
const EXTENSIONS = {
    photos: new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.heic', '.svg', '.raw']),
    videos: new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v']),
    documents: new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv', '.rtf', '.odt', '.ods']),
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

    // 1. Compute Overview Data (Aggregation from TREE) - now includes files array
    const overviewData = aggregateOverviewStats(analyzedTree);

    // 2. Map Overlay (Deltas from DIFF)
    const overviewCategories = buildOverviewCategories(overviewData, diffResult);

    // 3. Transform Directory Tree
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
        photos: { size: 0, files: [] },
        videos: { size: 0, files: [] },
        documents: { size: 0, files: [] },
        apps: { size: 0, files: [] },
        cache: { size: 0, files: [] },
        containers: { size: 0, files: [] },
        system: { size: 0, files: [] },
        other: { size: 0, files: [] }
    };

    function traverse(currentNode, parentPath = '') {
        if (!currentNode) return;

        // ALWAYS recurse into children first (depth-first)
        if (currentNode.children && currentNode.children.length > 0) {
            const nodePath = currentNode.path || parentPath;
            currentNode.children.forEach(child => traverse(child, nodePath));
        }

        // Only count FILES (not directories)
        if (currentNode.type !== 'file') {
            return;
        }

        // It's a file - count it
        const size = currentNode.size || 0;
        const category = currentNode.category || 'unclassified';
        const filename = currentNode.name || path.basename(currentNode.path || '');
        const ext = path.extname(filename).toLowerCase();
        const filePath = currentNode.path || '';
        const parent = path.dirname(filePath).split('/').pop() || 'Root';

        const fileInfo = { name: filename, path: filePath, size, parent };

        // 1. EXTENSIONS FIRST (Global Priority)
        if (EXTENSIONS.photos.has(ext)) {
            stats.photos.size += size;
            stats.photos.files.push(fileInfo);
            return;
        }
        if (EXTENSIONS.videos.has(ext)) {
            stats.videos.size += size;
            stats.videos.files.push(fileInfo);
            return;
        }
        if (EXTENSIONS.documents.has(ext)) {
            stats.documents.size += size;
            stats.documents.files.push(fileInfo);
            return;
        }

        // 2. BACKEND CATEGORIES
        if (category === 'cache') {
            stats.cache.size += size;
            stats.cache.files.push(fileInfo);
            return;
        }
        if (category === 'containers') {
            stats.containers.size += size;
            stats.containers.files.push(fileInfo);
            return;
        }
        if (category === 'logs' || category === 'system' || category === 'kernels') {
            stats.system.size += size;
            stats.system.files.push(fileInfo);
            return;
        }
        if (category === 'packages' || category === 'dependencies') {
            stats.apps.size += size;
            stats.apps.files.push(fileInfo);
            return;
        }

        // 3. FALLBACK
        stats.other.size += size;
        stats.other.files.push(fileInfo);
    }

    traverse(node);
    return stats;
}

function buildOverviewCategories(stats, diffResult) {
    const cats = [
        {
            id: 'photos',
            label: 'Photos',
            size: stats.photos.size,
            files: stats.photos.files,
            delta: null
        },
        {
            id: 'videos',
            label: 'Videos',
            size: stats.videos.size,
            files: stats.videos.files,
            delta: null
        },
        {
            id: 'documents',
            label: 'Documents',
            size: stats.documents.size,
            files: stats.documents.files,
            delta: null
        },
        {
            id: 'apps',
            label: 'Apps & Dependencies',
            size: stats.apps.size,
            files: stats.apps.files,
            delta: getDelta(diffResult, ['packages'])
        },
        {
            id: 'cache',
            label: 'Cache',
            size: stats.cache.size,
            files: stats.cache.files,
            delta: getDelta(diffResult, ['cache'])
        },
        {
            id: 'containers',
            label: 'Containers',
            size: stats.containers.size,
            files: stats.containers.files,
            delta: getDelta(diffResult, ['containers'])
        },
        {
            id: 'system',
            label: 'System',
            size: stats.system.size,
            files: stats.system.files,
            delta: getDelta(diffResult, ['logs', 'system', 'kernels'])
        },
        {
            id: 'other',
            label: 'Other',
            size: stats.other.size,
            files: stats.other.files,
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
    const filename = node.name || path.basename(node.path || '');

    const mapped = {
        name: filename,
        path: node.path,
        size: node.size,
        category: node.category,
        type: node.type,
        // Pass through explanation fields from explainer
        title: node.title || null,
        explanation: node.explanation || null,
        riskLevel: node.riskLevel || null,
        children: []
    };

    if (node.children) {
        mapped.children = node.children
            .filter(child => {
                const childName = child.name || path.basename(child.path || '');
                return childName && !HIDDEN_DIRS.has(childName) && !childName.startsWith('.');
            })
            .map(child => mapDirectoryNode(child))
            .sort((a, b) => b.size - a.size);
    }

    return mapped;
}

module.exports = { mapToUI };
