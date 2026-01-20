const fs = require('fs').promises;
const path = require('path');

/**
 * Recursively scans a directory to calculate disk usage.
 * 
 * DESIGN DECISIONS:
 * - Async/Await: Used to prevent blocking the event loop during heavy I/O.
 * - Error Handling: We catch EACCES/EPERM to skip restricted directories without crashing.
 * - Symlinks: We explicitly check for symlinks and do NOT follow them to avoid infinite loops.
 * - Structure: Returns a tree structure to allow granular analysis later.
 * 
 * @param {string} dirPath - The absolute path to scan.
 * @returns {Promise<object>} - Tree structure with size and children.
 */
async function scanDirectory(dirPath) {
    // Initialize the result node
    const result = {
        path: dirPath,
        size: 0,
        type: 'directory',
        children: [],
        error: null // To bubble up permission errors if needed strictly, or just logged
    };

    let entries;
    try {
        // Read directory contents
        entries = await fs.readdir(dirPath);
    } catch (error) {
        // Handle permission errors gracefully
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            result.error = 'PERMISSION_DENIED';
            return result; // Return empty/zero size for this node
        }
        // Re-throw other unexpected errors
        throw error;
    }

    // Process all entries in parallel for performance, but limit concurrency if needed (using Promise.all here for simplicity)
    // detailed Note: Promise.all is fine for local FS usually, but for huge trees consider a queue. 
    // For Step 1.1, Promise.all is sufficient.

    const promises = entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry);

        try {
            // Get file stats; use lstat to NOT follow symlinks automatically
            const stats = await fs.lstat(fullPath);

            if (stats.isSymbolicLink()) {
                // Skip symlinks to avoid loops and double counting
                return null;
            }

            if (stats.isDirectory()) {
                // Recurse
                const childResult = await scanDirectory(fullPath);
                return childResult;
            } else {
                // It's a file
                return {
                    path: fullPath,
                    size: stats.size,
                    type: 'file'
                };
            }
        } catch (err) {
            // Race condition: file might be deleted between readdir and lstat
            // Or other access issues
            return null;
        }
    });

    // Wait for all children to be processed
    const childrenResults = await Promise.all(promises);

    // Filter out nulls (symlinks, errors) and add to children
    result.children = childrenResults.filter(Boolean);

    // Calculate total size for this directory
    result.size = result.children.reduce((acc, child) => acc + child.size, 0);

    return result;
}

module.exports = { scanDirectory };
