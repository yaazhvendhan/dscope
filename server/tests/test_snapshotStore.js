const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveSnapshot, loadLatestSnapshot } = require('../src/history/snapshotStore');

// MOCK HOME DIRECTORY
const TEST_DIR = path.join(__dirname, 'temp_snapshot_test');
const ORIGINAL_HOME = os.homedir();

// Monkey-patch os.homedir for tests
os.homedir = () => TEST_DIR;

async function runTests() {
    console.log('--- Testing Snapshot Storage ---');

    // SETUP
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR);

    // TEST 1: First run (No data)
    const initialLoad = await loadLatestSnapshot();
    if (initialLoad === null) {
        console.log('✅ loadLatestSnapshot returns null on first run');
    } else {
        console.error('❌ loadLatestSnapshot should return null initially');
        process.exit(1);
    }

    // TEST 2: Save Snapshot
    const snapshot = {
        timestamp: new Date().toISOString(),
        totalSize: 1024,
        categories: { logs: 500, cache: 524 }
    };

    const success = await saveSnapshot(snapshot);
    if (success) {
        console.log('✅ saveSnapshot returned true');
    } else {
        console.error('❌ saveSnapshot failed');
        process.exit(1);
    }

    // Verify file existence
    const snapshotsDir = path.join(TEST_DIR, '.local/share/dscope/snapshots');
    if (fs.existsSync(snapshotsDir)) {
        console.log('✅ Base directory created automatically');
    } else {
        console.error('❌ Base directory was not created');
        process.exit(1);
    }

    const latestPath = path.join(snapshotsDir, 'latest.json');
    if (fs.existsSync(latestPath)) {
        console.log('✅ latest.json created');
    } else {
        console.error('❌ latest.json missing');
        process.exit(1);
    }

    // Verify timestamp file exists
    const safeTimestamp = snapshot.timestamp.replace(/:/g, '-');
    const timestampFile = path.join(snapshotsDir, `${safeTimestamp}.json`);
    if (fs.existsSync(timestampFile)) {
        console.log('✅ Timestamped file created');
    } else {
        console.error(`❌ Timestamped file missing: ${timestampFile}`);
        process.exit(1);
    }

    // TEST 3: Load Data
    const loaded = await loadLatestSnapshot();
    if (loaded && loaded.totalSize === 1024) {
        console.log('✅ loadLatestSnapshot returns correct data');
    } else {
        console.error('❌ loadLatestSnapshot returned incorrect data');
        process.exit(1);
    }

    // CLEANUP
    os.homedir = () => ORIGINAL_HOME; // Restore
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }

    console.log('\n--- All Tests Passed ---');
}

runTests().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
});
