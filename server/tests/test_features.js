const { scanDirectory } = require('../src/core/scanner');
const path = require('path');
const fs = require('fs');

async function testFeatures() {
    const testDir = path.join(__dirname, 'test_sandbox_features');

    console.log(`Setting up test sandbox at: ${testDir}`);
    // Cleanup and setup
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir);
    fs.mkdirSync(path.join(testDir, 'A'));
    fs.writeFileSync(path.join(testDir, 'A', 'file1.txt'), 'Hello');
    fs.mkdirSync(path.join(testDir, 'B'));
    fs.writeFileSync(path.join(testDir, 'B', 'file2.txt'), 'World');


    // --- Test 1: Progress Reporting ---
    console.log('\n--- Test 1: Progress Reporting ---');
    let lastProgress = null;
    const progressUpdates = [];

    await scanDirectory(testDir, {
        onProgress: (p) => {
            lastProgress = p;
            progressUpdates.push({ ...p });
        }
    });

    console.log('Final Progress:', lastProgress);

    // Expect: 3 directories (root, A, B) and 2 files
    if (lastProgress && lastProgress.directoriesProcessed >= 3 && lastProgress.filesProcessed >= 2) {
        console.log('✅ Progress reporting works');
    } else {
        console.error('❌ Progress reporting failed or incomplete', lastProgress);
        process.exitCode = 1;
    }


    // --- Test 2: Cancellation ---
    console.log('\n--- Test 2: Cancellation ---');
    const controller = new AbortController();

    try {
        const scanPromise = scanDirectory(testDir, {
            signal: controller.signal,
            onProgress: () => {
                // Cancel immediately on first progress update
                controller.abort();
            }
        });

        await scanPromise;
        console.error('❌ Scan finished despite cancellation!');
        process.exitCode = 1;
    } catch (err) {
        if (err.code === 'ABORT_ERR') {
            console.log('✅ Cancellation threw ABORT_ERR as expected');
        } else {
            console.error('❌ Cancellation threw unexpected error:', err);
            process.exitCode = 1;
        }
    }

    // Cleanup
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

testFeatures().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
