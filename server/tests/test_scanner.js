const { scanDirectory } = require('../src/core/scanner');
const path = require('path');
const fs = require('fs');

async function test() {
    // Use a safe, local directory for testing. 
    // We'll create a dummy structure to verify correctness.
    const testDir = path.join(__dirname, 'test_sandbox');

    console.log(`Setting up test sandbox at: ${testDir}`);

    try {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testDir);
        fs.mkdirSync(path.join(testDir, 'subdir'));
        fs.writeFileSync(path.join(testDir, 'file1.txt'), 'Hello'); // 5 bytes
        fs.writeFileSync(path.join(testDir, 'subdir', 'file2.txt'), 'World!'); // 6 bytes

        // Create a loop/symlink to test safety
        // link points to parent
        try {
            fs.symlinkSync(testDir, path.join(testDir, 'subdir', 'link_to_parent'));
        } catch (e) {
            console.log("Skipping symlink creation (OS might restrict it)");
        }

        console.log('Starting scan...');
        const result = await scanDirectory(testDir);

        console.log('--- Scan Result ---');
        console.log(JSON.stringify(result, null, 2));

        // Basic validations
        const expectedSize = 11; // 5 + 6
        if (result.size === expectedSize) {
            console.log('\n✅ size calculation correct');
        } else {
            console.error(`\n❌ Incorrect size: expected ${expectedSize}, got ${result.size}`);
        }

        const hasSymlinkLoop = result.children.find(c => c.children?.some(sc => sc.path.includes('link_to_parent')));
        if (!hasSymlinkLoop) {
            console.log('✅ Symlinks safely ignored (no infinite loop detected)');
        } else {
            console.error('❌ Symlink was followed!');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        // Cleanup
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    }
}

test();
