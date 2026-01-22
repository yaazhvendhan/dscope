const { mapToUI } = require('../src/presentation/presentationMapper');

// MOCK DATA
const tree = {
    name: "root",
    path: "/root",
    size: 1000,
    children: [
        { name: "pic.jpg", size: 100, category: "user-data" }, // Photo
        { name: "mov.mp4", size: 200, category: "user-data" }, // Video
        { name: "doc.pdf", size: 50, category: "user-data" },  // Document
        { name: "node_modules", size: 300, category: "packages", children: [] }, // App
        { name: "cache_dir", size: 50, category: "cache" },    // Cache
        { name: "sys.log", size: 100, category: "logs" },      // System
        { name: "misc.dat", size: 100, category: "unclassified" }, // Other
        { name: "unknown_user_file", size: 100, category: "user-data" } // Other (user-data non-media)
    ]
};

const diff = {
    baseline: false,
    totalDelta: 50,
    categoryDeltas: {
        logs: 10,
        cache: -5,
        packages: 20,
        unclassified: 5
    }
};

async function runTests() {
    console.log('--- Testing Presentation Mapper ---');

    const result = mapToUI(tree, null, diff);

    // TEST 1: Overview Categories Existence & Sizing
    console.log('Testing Overview Categorization...');
    const catMap = result.overview.categories.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

    if (catMap.photos.size === 100) console.log('✅ Photos size correct');
    else console.error('❌ Photos size mismatch:', catMap.photos.size);

    if (catMap.videos.size === 200) console.log('✅ Videos size correct');
    else console.error('❌ Videos size mismatch');

    if (catMap.documents.size === 50) console.log('✅ Documents size correct');
    else console.error('❌ Documents size mismatch');

    if (catMap.apps.size === 300) console.log('✅ Apps size correct');
    else console.error('❌ Apps size mismatch');

    if (catMap.system.size === 100) console.log('✅ System (logs) size correct');
    else console.error('❌ System size mismatch');

    // "Other" calculation: unclassified (100) + unknown_user_file (100) = 200
    if (catMap.other.size === 200) console.log('✅ Other size correct');
    else console.error('❌ Other size mismatch:', catMap.other.size);


    // TEST 2: Delta Mapping
    console.log('Testing Delta Mapping...');

    // Photos should be null (no history)
    if (catMap.photos.delta === null) console.log('✅ Photos delta is null');
    else console.error('❌ Photos delta should be null');

    // Apps should map to 'packages' delta (20)
    if (catMap.apps.delta === 20) console.log('✅ Apps delta correct');
    else console.error('❌ Apps delta mismatch');

    // System should map to 'logs' delta (10)
    if (catMap.system.delta === 10) console.log('✅ System delta correct');
    else console.error('❌ System delta mismatch');

    // Other should map to 'unclassified' delta (5). User-data ignored.
    if (catMap.other.delta === 5) console.log('✅ Other delta correct');
    else console.error('❌ Other delta mismatch');


    // TEST 3: Directory Structure
    console.log('Testing Directory Mapping...');
    const root = result.directory.root;

    if (root.children.length === 8) console.log('✅ Correct number of children');
    else console.error('❌ Child count mismatch');

    const nodeModules = root.children.find(c => c.name === 'node_modules');
    if (!nodeModules.children) console.log('✅ Children are lazy (undefined/stripped)');
    // In my logic I used map, filtering children out or mapping them to props. 
    // Wait, the children array of node_modules (the child) likely exists but is empty in source? 
    // In source it has children: []. 
    // The mapper logic for children of root maps them to { name, ..., hasChildren: ... }. 
    // It does NOT include a `children` array for the children.
    if (!nodeModules.children) console.log('✅ Shallow mapping verified');


    console.log('\n--- Tests Complete ---');
}

runTests();
