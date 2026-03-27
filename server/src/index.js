const express = require('express');
const { scanDirectory } = require('./core/scanner');
const { classifyNode } = require('./intelligence/classifier');
const { explainClassification } = require('./intelligence/explainer');
const { saveSnapshot, loadLatestSnapshot } = require('./history/snapshotStore');
const { computeCategoryDiff } = require('./history/diffEngine');
const { mapToUI } = require('./presentation/presentationMapper');

const app = express();
const PORT = 3000;

app.use(express.json());

// --- HELPERS ---

// Helper to recursively enrich the tree (mutates in place)
function enrichTree(node) {
    if (!node) return;

    // 1. Classify
    const classification = classifyNode(node);

    // 2. Explain
    const explanation = explainClassification(classification);

    // 3. Decorate
    node.category = classification.category;
    node.confidence = classification.confidence;

    node.classification = { ...classification };

    node.explanation = explanation.explanation;
    node.title = explanation.title;
    node.riskLevel = explanation.riskLevel;

    // 4. Recurse
    if (node.children) {
        node.children.forEach(enrichTree);
    }
    return node;
}

// Reusable analysis pipeline
async function analyzePath(pathStr, signal) {
    // 1. Scan
    const rawTree = await scanDirectory(pathStr, { signal });

    // 2. Enrich (Classify + Explain)
    // We modify the tree in-place
    enrichTree(rawTree);

    return rawTree;
}

// Generate snapshot from enriched tree (Backend categories only)
function generateSnapshot(tree) {
    const snapshot = {
        timestamp: new Date().toISOString(),
        totalSize: tree.size || 0,
        categories: {}
    };

    function traverse(node) {
        // Aggregate categories from files only to avoid double counting if directories have categories
        if (node.type === 'file' && node.category) {
            snapshot.categories[node.category] = (snapshot.categories[node.category] || 0) + node.size;
        }

        if (node.children) {
            node.children.forEach(traverse);
        }
    }

    traverse(tree);
    return snapshot;
}

// Compress tree for safe JSON serialization — keeps largest children, merges rest
function compressTreeForUI(node, maxChildren = 200) {
    if (!node || !node.children) return node;

    // Sort children by size descending — biggest first
    node.children.sort((a, b) => (b.size || 0) - (a.size || 0));

    if (node.children.length > maxChildren) {
        const kept = node.children.slice(0, maxChildren);

        const otherSize = node.children
            .slice(maxChildren)
            .reduce((sum, c) => sum + (c.size || 0), 0);

        kept.push({
            name: 'other',
            type: 'directory',
            size: otherSize,
            aggregated: true
        });

        node.children = kept;
    }

    // Recurse into kept children
    node.children.forEach(child => compressTreeForUI(child, maxChildren));

    return node;
}

// --- ENDPOINTS ---

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/scan', async (req, res) => {
    const { path: pathStr } = req.body;

    if (!pathStr || typeof pathStr !== 'string') {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const controller = new AbortController();
    const { signal } = controller;

    res.on('close', () => {
        if (!res.writableEnded) {
            console.log(`Request cancelled by client for ${pathStr}`);
            controller.abort();
        }
    });

    try {
        const tree = await scanDirectory(pathStr, { signal });
        res.json(tree);
    } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
            return res.status(499).json({ error: 'Scan cancelled' });
        }
        console.error('Scan error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/analyze', async (req, res) => {
    const { path: pathStr } = req.body;

    if (!pathStr || typeof pathStr !== 'string') {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const controller = new AbortController();
    const { signal } = controller;

    res.on('close', () => {
        if (!res.writableEnded) {
            controller.abort();
        }
    });

    try {
        const enrichedTree = await analyzePath(pathStr, signal);
        res.json(enrichedTree);
    } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
            return res.status(499).json({ error: 'Scan cancelled' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/present', async (req, res) => {
    const { path: pathStr } = req.body;

    if (!pathStr || typeof pathStr !== 'string') {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const controller = new AbortController();
    const { signal } = controller;

    res.on('close', () => {
        if (!res.writableEnded) {
            controller.abort();
        }
    });

    try {
        // 1. Analyze
        const tree = await analyzePath(pathStr, signal);

        // 2. History & Snapshot Logic
        const previousSnapshot = await loadLatestSnapshot();
        const currentSnapshot = generateSnapshot(tree);

        // 3. Diff (Plan B)
        const diffResult = computeCategoryDiff(previousSnapshot, currentSnapshot);

        // 4. Save Snapshot (Only for main system paths)
        // Skip for external media to avoid skewing history
        const isExternal = pathStr.startsWith('/media') || pathStr.startsWith('/run/media') || pathStr.startsWith('/mnt');
        const isSafeToSnapshot = !isExternal && (pathStr === '/' || pathStr.startsWith('/home'));

        if (isSafeToSnapshot) {
            await saveSnapshot(currentSnapshot);
        } else {
            console.log(`Skipping snapshot for external/non-root path: ${pathStr}`);
        }

        // 5. Present (Plan C1)
        const uiData = mapToUI(tree, previousSnapshot, diffResult);

        // Compress tree to prevent JSON serialization crash
        const safeData = compressTreeForUI(uiData);

        // Final safety check on JSON size
        let jsonStr;
        try {
            jsonStr = JSON.stringify(safeData);
        } catch (e) {
            console.error('JSON serialization failed:', e.message);
            return res.status(500).json({ error: 'Scan result too large for visualization' });
        }

        if (jsonStr.length > 50_000_000) {
            console.error(`Response too large: ${(jsonStr.length / 1_000_000).toFixed(1)}MB`);
            return res.status(500).json({ error: 'Scan result too large for visualization' });
        }

        res.setHeader('Content-Type', 'application/json');
        res.send(jsonStr);

    } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
            return res.status(499).json({ error: 'Scan cancelled' });
        }
        console.error('Present error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`DScope Server running on http://localhost:${PORT}`);
});
