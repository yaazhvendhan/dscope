const { computeCategoryDiff } = require('../src/history/diffEngine');

function runTest(name, result, expected) {
    const jsonResult = JSON.stringify(result);
    // Cheap deep check via stringify for simple objects

    const baselineMatch = result.baseline === expected.baseline;
    const totalMatch = result.totalDelta === expected.totalDelta;

    // Check keys and values of categoryDeltas
    const resKeys = Object.keys(result.categoryDeltas).sort();
    const expKeys = Object.keys(expected.categoryDeltas).sort();

    const keysMatch = JSON.stringify(resKeys) === JSON.stringify(expKeys);
    let valuesMatch = true;
    for (const k of expKeys) {
        if (result.categoryDeltas[k] !== expected.categoryDeltas[k]) {
            valuesMatch = false;
            break;
        }
    }

    if (baselineMatch && totalMatch && keysMatch && valuesMatch) {
        console.log(`✅ ${name}`);
    } else {
        console.error(`❌ ${name} Failed`);
        console.error('Expected:', expected);
        console.error('Got:', result);
        process.exitCode = 1;
    }
}

console.log('--- Testing Diff Engine ---');

// 1. Baseline Case
runTest('Baseline (No previous)',
    computeCategoryDiff(null, { totalSize: 100, categories: { logs: 100 } }),
    { baseline: true, totalDelta: 0, categoryDeltas: {} }
);

// 2. Growth Case
runTest('Growth (Log growth)',
    computeCategoryDiff(
        { totalSize: 100, categories: { logs: 100 } },
        { totalSize: 150, categories: { logs: 150 } }
    ),
    { baseline: false, totalDelta: 50, categoryDeltas: { logs: 50 } }
);

// 3. Shrinkage Case
runTest('Shrinkage (Cache clear)',
    computeCategoryDiff(
        { totalSize: 200, categories: { cache: 200 } },
        { totalSize: 50, categories: { cache: 50 } }
    ),
    { baseline: false, totalDelta: -150, categoryDeltas: { cache: -150 } }
);

// 4. New Category
runTest('New Category (Containers appeared)',
    computeCategoryDiff(
        { totalSize: 100, categories: { logs: 100 } },
        { totalSize: 200, categories: { logs: 100, containers: 100 } }
    ),
    { baseline: false, totalDelta: 100, categoryDeltas: { containers: 100 } }
);

// 5. Removed Category
runTest('Removed Category (Logs gone)',
    computeCategoryDiff(
        { totalSize: 100, categories: { logs: 100, cache: 50 } },
        { totalSize: 50, categories: { cache: 50 } }
    ),
    { baseline: false, totalDelta: -50, categoryDeltas: { logs: -100 } }
);

// 6. Mixed Changes + Unchanged Omission
runTest('Mixed (Logs up, Cache down, System same)',
    computeCategoryDiff(
        { totalSize: 300, categories: { logs: 100, cache: 100, system: 100 } },
        { totalSize: 350, categories: { logs: 200, cache: 50, system: 100 } }
    ),
    { baseline: false, totalDelta: 50, categoryDeltas: { logs: 100, cache: -50 } }
);

console.log('\n--- Tests Complete ---');
