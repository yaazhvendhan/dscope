const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively scans a directory to calculate disk usage.
 * 
 * Supports optional progress reporting and cooperative cancellation.
 * 
 * @param {string} dirPath - The absolute path to scan.
 * @param {object} [options] - Optional settings.
 * @param {function} [options.onProgress] - Callback invoked with { directoriesProcessed, filesProcessed }.
 * @param {AbortSignal} [options.signal] - Signal to cancel the scan.
 * @returns {Promise<object>} - Tree structure with size and children.
 * @throws {Error} - Throws error with code 'ABORT_ERR' if cancelled.
 */
async function scanDirectory(dirPath, options = {}) {
    // Shared state for progress tracking
    const state = {
        directoriesProcessed: 0,
        filesProcessed: 0
    };

    return _scanRecursive(dirPath, options, state);
}

/**
 * Internal recursive helper.
 * 
 * @param {string} dirPath 
 * @param {object} options 
 * @param {object} state 
 */
async function _scanRecursive(dirPath, options, state) {
    // 1. Check Cancellation at entry
    if (options.signal?.aborted) {
        const error = new Error('Scan aborted');
        error.code = 'ABORT_ERR';
        throw error;
    }

    // Initialize the result node
    const result = {
        path: dirPath,
        size: 0,
        type: 'directory',
        children: [],
        error: null
    };

    // Update progress for directory (started processing)
    state.directoriesProcessed++;
    if (options.onProgress) {
        options.onProgress({ ...state });
    }

    let entries;
    try {
        entries = await fs.readdir(dirPath);
    } catch (error) {
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            result.error = 'PERMISSION_DENIED';
            return result;
        }
        throw error;
    }

    // 2. Check Cancellation before processing children
    if (options.signal?.aborted) {
        const error = new Error('Scan aborted');
        error.code = 'ABORT_ERR';
        throw error;
    }

    const EXCLUDED_PATHS = new Set(['/proc', '/sys', '/dev', '/run', '/tmp', '/mnt', '/var/run', '/var/lock']);

    const promises = entries.map(async (entry) => {
        // 3. Check Cancellation inside loop (optional but good for responsiveness)
        if (options.signal?.aborted) {
            // We can't easily stop the other promises in Promise.all, but we can fail fast here
            const error = new Error('Scan aborted');
            error.code = 'ABORT_ERR';
            throw error;
        }

        const fullPath = path.join(dirPath, entry);

        // Check exclusions
        if (EXCLUDED_PATHS.has(fullPath)) {
            return null;
        }

        try {
            const stats = await fs.lstat(fullPath);

            if (stats.isSymbolicLink()) {
                return null;
            }

            if (stats.isDirectory()) {
                return _scanRecursive(fullPath, options, state);
            } else {
                // Update progress for file
                state.filesProcessed++;
                if (options.onProgress) {
                    options.onProgress({ ...state });
                }

                return {
                    path: fullPath,
                    size: stats.blocks * 512,
                    type: 'file'
                };
            }
        } catch (err) {
            if (err.code === 'ABORT_ERR') throw err; // Propagate abort
            return null;
        }
    });

    // Wait for all children
    const childrenResults = await Promise.all(promises);

    result.children = childrenResults.filter(Boolean);
    result.size = result.children.reduce((acc, child) => acc + child.size, 0);

    return result;
}

module.exports = { scanDirectory };
