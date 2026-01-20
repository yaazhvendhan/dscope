const { classifyNode } = require('../src/intelligence/classifier');

function runTest(name, node, expected) {
    const result = classifyNode(node);
    const pass = result.category === expected.category && result.confidence === expected.confidence;

    if (pass) {
        console.log(`✅ ${name}: [${node.path}] -> ${result.category} (${result.confidence})`);
    } else {
        console.error(`❌ ${name}: [${node.path}]`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Got:      ${JSON.stringify(result)}`);
        process.exitCode = 1;
    }
}

console.log('--- Testing Classifier Rules ---\n');

// 1. Containers
runTest('Docker', { path: '/var/lib/docker/volumes', type: 'directory' }, { category: 'containers', confidence: 'high' });
runTest('Podman', { path: '/var/lib/containers/storage', type: 'directory' }, { category: 'containers', confidence: 'high' });

// 2. Packages
runTest('Snap', { path: '/var/lib/snapd/snaps', type: 'file' }, { category: 'packages', confidence: 'high' });
runTest('Flatpak', { path: '/home/user/.var/app/com.example.App', type: 'directory' }, { category: 'packages', confidence: 'medium' });

// 3. Logs
runTest('Syslog', { path: '/var/log/syslog', type: 'file' }, { category: 'logs', confidence: 'high' });
runTest('Journal', { path: '/var/log/journal', type: 'directory' }, { category: 'logs', confidence: 'high' });

// 4. Cache
runTest('Global Cache', { path: '/var/cache/apt', type: 'directory' }, { category: 'cache', confidence: 'high' });
runTest('User Cache', { path: '/home/user/.cache/mozilla', type: 'directory' }, { category: 'cache', confidence: 'high' });

// 5. System
runTest('Usr Bin', { path: '/usr/bin/node', type: 'file' }, { category: 'system', confidence: 'high' });
runTest('Lib64', { path: '/lib64/ld-linux.so', type: 'file' }, { category: 'system', confidence: 'high' });

// 6. Kernels
runTest('Vmlinuz', { path: '/boot/vmlinuz-5.15.0', type: 'file' }, { category: 'kernels', confidence: 'high' });
runTest('Initrd', { path: '/boot/initrd.img', type: 'file' }, { category: 'kernels', confidence: 'high' });
// Non-kernel boot file
runTest('Grub Config', { path: '/boot/grub/grub.cfg', type: 'file' }, { category: 'unclassified', confidence: 'low' }); // Or system/unclassified, check code behavior. Code falls through to unclassified.

// 7. User Data
runTest('User Docs', { path: '/home/user/Documents', type: 'directory' }, { category: 'user-data', confidence: 'high' });
runTest('User Pic', { path: '/home/user/Pictures/photo.jpg', type: 'file' }, { category: 'user-data', confidence: 'high' });

// 8. Unclassified
runTest('Unknown Root', { path: '/opt/myapp', type: 'directory' }, { category: 'unclassified', confidence: 'low' });
runTest('Tmp', { path: '/tmp/files', type: 'directory' }, { category: 'unclassified', confidence: 'low' });

console.log('\n--- Tests Complete ---');
