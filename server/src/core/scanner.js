const fs = require('fs').promises;
const path = require('path');

// --- Safety Constants ---
const MAX_SCAN_DEPTH = 20;          // Absolute max recursion depth
const MAX_TREE_DEPTH = 4;           // Max depth for tree nodes returned to UI
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB
const MAX_NODES = 200000;           // Hard cap on total nodes
const MAX_PATH_LENGTH = 1000;       // Skip extremely long paths (NTFS edge cases)

const EXCLUDED_PATHS = new Set([
    '/proc',
    '/sys',
    '/dev',
    '/run',
    '/tmp',
    '/snap'
]);

// NTFS system directories that bloat scans with useless metadata
const NTFS_SKIP_NAMES = new Set([
    'System Volume Information',
    '$Recycle.Bin'
]);

/**
 * Check if a path should be skipped (virtual/pseudo filesystems).
 */
function shouldSkipPath(fullPath) {
    for (const p of EXCLUDED_PATHS) {
        if (fullPath === p || fullPath.startsWith(p + '/')) {
            return true;
        }
    }
    return false;
}

/**
 * Recursively scans a directory to calculate disk usage.
 *
 * Scans the ENTIRE filesystem for accurate totals, but only builds
 * tree nodes up to MAX_TREE_DEPTH to keep the response serializable.
 *
 * @param {string} dirPath - The absolute path to scan.
 * @param {object} [options] - Optional settings.
 * @param {function} [options.onProgress] - Callback invoked with { directoriesProcessed, filesProcessed }.
 * @param {AbortSignal} [options.signal] - Signal to cancel the scan.
 * @returns {Promise<object>} - Tree structure with size and children.
 * @throws {Error} - Throws error with code 'ABORT_ERR' if cancelled.
 */
async function scanDirectory(dirPath, options = {}) {
    const state = {
        directoriesProcessed: 0,
        filesProcessed: 0,
        nodeCount: 0
    };

    return _scanRecursive(dirPath, options, state, 0);
}

/**
 * Internal recursive helper.
 *
 * @param {string} dirPath
 * @param {object} options
 * @param {object} state
 * @param {number} depth - Current recursion depth
 */
async function _scanRecursive(dirPath, options, state, depth) {
    // 1. Check Cancellation
    if (options.signal?.aborted) {
        const error = new Error('Scan aborted');
        error.code = 'ABORT_ERR';
        throw error;
    }

    // 2. Skip virtual/pseudo filesystems
    if (shouldSkipPath(dirPath)) {
        return null;
    }

    // 3. Enforce max scan depth
    if (depth > MAX_SCAN_DEPTH) {
        return null;
    }

    // 4. Check node cap
    if (state.nodeCount > MAX_NODES) {
        return null;
    }

    // 5. Protect against extremely long paths (NTFS edge cases)
    if (dirPath.length > MAX_PATH_LENGTH) {
        return null;
    }

    // Are we beyond the UI tree depth?
    const beyondTreeDepth = depth > MAX_TREE_DEPTH;

    state.directoriesProcessed++;
    state.nodeCount++;
    if (options.onProgress) {
        options.onProgress({ directoriesProcessed: state.directoriesProcessed, filesProcessed: state.filesProcessed });
    }

    let entries;
    try {
        entries = await fs.readdir(dirPath);
    } catch (error) {
        // Permission denied or any other error — skip gracefully
        if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'ENOENT') {
            if (!beyondTreeDepth) {
                return {
                    path: dirPath,
                    size: 0,
                    type: 'directory',
                    children: [],
                    error: 'PERMISSION_DENIED'
                };
            }
            return { size: 0 };
        }
        // For any unexpected error, skip gracefully instead of crashing
        return null;
    }

    // Check Cancellation before processing children
    if (options.signal?.aborted) {
        const error = new Error('Scan aborted');
        error.code = 'ABORT_ERR';
        throw error;
    }

    let totalSize = 0;
    const children = [];

    // Process entries in batches to limit open file handles
    const BATCH_SIZE = 50;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        if (options.signal?.aborted) {
            const error = new Error('Scan aborted');
            error.code = 'ABORT_ERR';
            throw error;
        }

        const batch = entries.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async (entry) => {
            const fullPath = path.join(dirPath, entry);

            // Skip excluded paths
            if (shouldSkipPath(fullPath)) {
                return null;
            }

            // Skip NTFS system directories
            if (NTFS_SKIP_NAMES.has(entry)) {
                return null;
            }

            // Skip extremely long paths
            if (fullPath.length > MAX_PATH_LENGTH) {
                return null;
            }

            try {
                const stats = await fs.lstat(fullPath);

                if (stats.isSymbolicLink()) {
                    return null;
                }

                if (stats.isDirectory()) {
                    return _scanRecursive(fullPath, options, state, depth + 1);
                } else {
                    state.filesProcessed++;
                    state.nodeCount++;
                    if (options.onProgress) {
                        options.onProgress({ directoriesProcessed: state.directoriesProcessed, filesProcessed: state.filesProcessed });
                    }

                    // Use stats.size for cross-filesystem compatibility (NTFS, etc.)
                    // Clamp unrealistic file sizes
                    let size = Math.min(stats.size || 0, MAX_FILE_SIZE);

                    if (beyondTreeDepth) {
                        // Beyond tree depth: just return size, no node
                        return { size };
                    }

                    return {
                        path: fullPath,
                        size: size,
                        type: 'file'
                    };
                }
            } catch (err) {
                if (err.code === 'ABORT_ERR') throw err;
                return null;
            }
        }));

        for (const result of batchResults) {
            if (!result) continue;
            totalSize += result.size;
            // Only collect full child nodes if within tree depth
            if (!beyondTreeDepth && result.type) {
                children.push(result);
            }
        }
    }

    if (beyondTreeDepth) {
        // Return only size info, no children — keeps tree small
        return { size: totalSize };
    }

    return {
        path: dirPath,
        size: totalSize,
        type: 'directory',
        children: children,
        truncated: depth === MAX_TREE_DEPTH && children.length === 0 && totalSize > 0,
        error: null
    };
}

module.exports = { scanDirectory };
