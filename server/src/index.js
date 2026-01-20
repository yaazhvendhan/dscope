const express = require('express');
const { scanDirectory } = require('./core/scanner');
const { classifyNode } = require('./intelligence/classifier');
const { explainClassification } = require('./intelligence/explainer');

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * Recursive helper to enrich the scan tree with intelligence.
 * Mutates the node in place (acceptable for the response object).
 */
function enrichTree(node) {
    if (!node) return;

    // Classify
    const classification = classifyNode(node);

    // Explain
    const explanation = explainClassification(classification);

    // Merge results
    Object.assign(node, classification, explanation);

    // Recurse
    if (node.children) {
        node.children.forEach(child => enrichTree(child));
    }
}

// POST /scan
app.post('/scan', async (req, res) => {
    const { path } = req.body;

    if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const controller = new AbortController();
    const { signal } = controller;

    // Hook into request close for cancellation
    req.on('close', () => {
        controller.abort();
    });

    try {
        const result = await scanDirectory(path, { signal });
        res.json(result);
    } catch (err) {
        if (err.code === 'ABORT_ERR') {
            // 499 Client Closed Request (common for cancelled operations)
            return res.status(499).json({ error: 'Scan cancelled' });
        }
        console.error(err); // Minimal logging for server errors
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /analyze
app.post('/analyze', async (req, res) => {
    const { path } = req.body;

    if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Invalid path' });
    }

    const controller = new AbortController();
    const { signal } = controller;

    req.on('close', () => {
        controller.abort();
    });

    try {
        // 1. Scan
        const result = await scanDirectory(path, { signal });

        // 2. Enrich (Classify + Explain)
        enrichTree(result);

        res.json(result);
    } catch (err) {
        if (err.code === 'ABORT_ERR') {
            return res.status(499).json({ error: 'Scan cancelled' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, 'localhost', () => {
    console.log(`DScope Server running on http://localhost:${PORT}`);
});
