# DScope

DScope is a Linux desktop disk-usage intelligence platform built with Electron, React, and Node.js. It combines filesystem scanning, rule-based classification, historical snapshot diffs, and explainable UI output to help operators and end users understand where storage is going and why.

## Table Of Contents
1. Product Overview
2. Key Capabilities
3. Architecture
4. Repository Layout
5. Runtime Requirements
6. Quick Start (Local Development)
7. Operating The Application
8. API Contract
9. Data Model
10. Security And Safety Controls
11. Performance And Scale Controls
12. Testing
13. Packaging And Distribution (Linux)
14. Troubleshooting
15. Limitations
16. Extended Documentation

## Product Overview

DScope addresses common gaps in traditional disk analyzers:
- Not just size totals, but semantic categorization (cache, system, containers, apps, media).
- Historical drift awareness through snapshot comparison.
- Human-readable explanation per category or directory node.
- Linux-specific operating model with optional privileged system-wide scans.

Primary user workflows:
- Analyze Home Directory for safe cleanup opportunities.
- Analyze Entire System for deep capacity diagnosis.
- Analyze External Device mount points.

## Key Capabilities

- Recursive filesystem scanning with cancellation support.
- Rule-based node classification with confidence levels.
- Explanation layer with risk-level hints.
- Snapshot persistence at ~/.local/share/dscope/snapshots.
- Delta engine comparing previous and current category sizes.
- Two UX modes:
- Overview: category totals + growth/shrink indicators.
- Directory: expandable tree with inline explanations.
- External device discovery from Linux mount roots.

## Architecture

DScope is implemented as a local 3-tier desktop stack:

```text
Electron Shell (main + preload)
        |
        | IPC bridge
        v
Local Backend Service (Express on :3000)
        |
        | fs/lstat traversal + intelligence pipeline
        v
Linux Filesystem
```

Request pipeline for primary flow (POST /present):
1. Scan directory tree.
2. Enrich tree (classification + explanation).
3. Load previous snapshot.
4. Compute category diff.
5. Save current snapshot (policy-gated).
6. Map to UI model.
7. Apply payload compression/safety guards.
8. Return presentation response.

## Repository Layout

```text
DScope/
        electron/
                main.js                # App process, backend spawn, IPC handlers
                preload.js             # Safe renderer bridge
        client/
                src/
                        App.tsx              # App orchestration and view state
                        pages/
                                Overview.tsx
                                Directory.tsx
                                DrilldownList.tsx
                        components/
                                ScanTargetSelection.tsx
        server/
                src/
                        index.js             # Express API
                        core/scanner.js
                        intelligence/
                                classifier.js
                                explainer.js
                        history/
                                snapshotStore.js
                                diffEngine.js
                        presentation/
                                presentationMapper.js
                tests/                 # Script-based backend test suite
        package_linux.sh         # Linux packaging pipeline
```

## Runtime Requirements

- OS: Linux (primary target)
- Node.js: current LTS recommended
- npm: compatible with selected Node.js
- Desktop dependencies for Electron packaging (varies by distro)
- pkexec available for full-system privileged scans

## Quick Start (Local Development)

From repository root:

1. Install root dependencies (Electron tooling)

```bash
npm install
```

2. Install and build client

```bash
cd client
npm install
npm run build
cd ..
```

3. Install server dependencies

```bash
cd server
npm install
cd ..
```

4. Start desktop app

```bash
npm start
```

Note: the Electron app loads built assets from client/dist. Build the client before launching.

## Operating The Application

1. Open DScope.
2. Select scan scope:
         - Home Directory
         - Entire System (may prompt for admin privileges)
         - External Device
3. Wait for analysis completion.
4. Use:
         - Overview for category-level diagnostics and deltas.
         - Directory for path-level exploration and inline explanations.
5. Use Cancel to abort long-running scans safely.

Snapshot location:

```text
~/.local/share/dscope/snapshots/
```

## API Contract

Base URL: http://localhost:3000

### GET /health

Purpose: liveness probe.

Success response:

```json
{ "status": "ok" }
```

### POST /scan

Purpose: raw scan tree only.

Request:

```json
{ "path": "/home/user" }
```

Responses:
- 200: raw tree
- 400: invalid path
- 499: scan cancelled
- 500: server error

### POST /analyze

Purpose: scan + classification + explanation.

Request:

```json
{ "path": "/home/user" }
```

Responses:
- 200: enriched tree
- 400: invalid path
- 499: scan cancelled
- 500: server error

### POST /present

Purpose: full analysis + history diff + UI mapping.

Request:

```json
{ "path": "/home/user" }
```

Responses:
- 200: presentation model with overview and directory payloads
- 400: invalid path
- 499: scan cancelled
- 500: internal error or payload too large

## Data Model

Core categories used by backend intelligence:
- containers
- packages
- logs
- cache
- system
- kernels
- user-data
- unclassified

UI-level overview categories:
- photos
- videos
- documents
- apps
- cache
- containers
- system
- other

Snapshot schema:

```json
{
        "timestamp": "ISO-8601",
        "totalSize": 123456,
        "categories": {
                "cache": 123,
                "system": 456
        }
}
```

## Security And Safety Controls

- Renderer isolation: contextIsolation enabled, nodeIntegration disabled.
- Narrow preload bridge for controlled host access.
- Symlinks skipped during scanning to avoid traversal loops.
- Virtual/pseudo filesystem exclusions to reduce unsafe noise.
- Permission failures handled gracefully.
- Request abort support with AbortSignal and client disconnect handling.
- Payload-size guard before response transmission.

## Performance And Scale Controls

Scanner safeguards include:
- maximum recursion depth
- maximum tree depth returned to UI
- maximum node budget
- maximum path length
- batched directory-entry processing

Presentation safeguards include:
- child-node truncation with aggregated "other" bucket
- category file list capping

## Testing

Backend includes script-based tests in server/tests:
- scanner behavior and safety
- progress/cancellation
- classifier and explainer rules
- diff engine
- snapshot persistence
- presentation mapper
- API cancellation scenario

Run selected tests manually from server directory, for example:

```bash
cd server
node tests/test_scanner.js
node tests/test_classifier.js
node tests/test_explainer.js
node tests/test_diffEngine.js
node tests/test_snapshotStore.js
node tests/test_presentationMapper.js
node tests/test_features.js
```

## Packaging And Distribution (Linux)

Use the provided pipeline:

```bash
./package_linux.sh
```

Pipeline behavior:
- cleans prior dist artifacts
- builds frontend
- installs backend production dependencies
- produces Electron artifacts (AppImage, deb, rpm)

Artifacts are written to dist/.

## Troubleshooting

1. App opens but UI is blank
- Ensure client build exists.
- Re-run client build: cd client && npm run build

2. Backend not reachable
- Confirm localhost:3000 is available.
- Restart desktop app.

3. Entire-system scan fails
- Verify pkexec is installed and policy permits elevation.
- Retry scan and accept privilege prompt.

4. Scan cancelled unexpectedly
- Check whether UI Cancel was triggered or renderer closed request early.

5. Large scan fails with response-too-large behavior
- Narrow scan path scope (for example, start with /home).

## Limitations

- Linux-first implementation.
- No integrated scheduler for periodic scans yet.
- Current test suite is script-based, not a unified test runner pipeline.
- Some placeholder files exist and are not active runtime modules.

## Extended Documentation

For full deep-dive technical documentation (component-by-component), see:
- DSCOPE_FULL_DOCUMENTATION.md

---



