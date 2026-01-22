const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Snapshot Schema:
 * {
 *   "timestamp": "ISO-8601 string",
 *   "totalSize": number,
 *   "categories": { "logs": 123, ... }
 * }
 */

// Base directory per XDG spec (or simplified for this phase)
// ~/.local/share/dscope
function getBaseDir() {
    const home = os.homedir();
    return path.join(home, '.local', 'share', 'dscope');
}

function getSnapshotsDir() {
    return path.join(getBaseDir(), 'snapshots');
}

/**
 * Saves a snapshot summary to disk.
 * @param {object} snapshot - The snapshot object
 * @returns {Promise<boolean>} - True on success, false on failure
 */
async function saveSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;

    // Enforce ISO timestamp presence
    if (!snapshot.timestamp) {
        snapshot.timestamp = new Date().toISOString();
    }

    try {
        const snapshotsDir = getSnapshotsDir();

        // Ensure directories exist
        await fs.promises.mkdir(snapshotsDir, { recursive: true });

        // Sanitize timestamp for filename: 2026-01-21T10:30:00 -> 2026-01-21T10-30-00
        const safeTimestamp = snapshot.timestamp.replace(/:/g, '-');
        const filename = `${safeTimestamp}.json`;
        const filePath = path.join(snapshotsDir, filename);

        const data = JSON.stringify(snapshot, null, 2);

        // Write snapshot file
        await fs.promises.writeFile(filePath, data, 'utf8');

        // Update latest.json
        const latestPath = path.join(snapshotsDir, 'latest.json');
        await fs.promises.writeFile(latestPath, data, 'utf8');

        return true;
    } catch (err) {
        // Silent failure as per requirements (caller decides)
        return false;
    }
}

/**
 * Loads the latest snapshot summary.
 * @returns {Promise<object|null>} - Snapshot object or null
 */
async function loadLatestSnapshot() {
    try {
        const latestPath = path.join(getSnapshotsDir(), 'latest.json');

        // Check if file exists to avoid throwing
        try {
            await fs.promises.access(latestPath);
        } catch {
            return null;
        }

        const data = await fs.promises.readFile(latestPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return null; // Graceful failure
    }
}

module.exports = { saveSnapshot, loadLatestSnapshot };
