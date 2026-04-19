# DScope Complete Technical Documentation

## 1. Project Identity

Name: DScope

Tagline in app: Linux Disk Space Visualization Tool

Primary goal:
DScope is a Linux desktop application that scans filesystem usage, classifies files/folders into meaningful categories (cache, containers, system, user data, and more), computes historical deltas, and presents the result in two major UX modes:
- Overview mode: category-level intelligence with size and growth/shrink deltas.
- Directory mode: navigable tree with inline explanations and risk indicators.

Core user value:
- Understand where disk space is being consumed.
- Understand why a category is growing.
- Explore large folders/files quickly with visual and textual context.
- Track changes between scans through snapshot comparison.

Target platform:
- Linux desktop (Electron shell + React frontend + Node backend)


## 2. High-Level Architecture

DScope is a 3-part architecture in one repository:

1. Electron desktop shell
- Starts backend service process.
- Hosts frontend inside BrowserWindow.
- Exposes safe IPC bridge for selected host capabilities.

2. Backend service (Node + Express)
- Performs scanning and analysis.
- Classifies and explains nodes.
- Persists historical snapshots.
- Computes diffs between previous and current snapshot.
- Maps raw tree to UI-focused payload.

3. Frontend client (React + TypeScript + Vite)
- Drives scan target selection.
- Calls backend /present endpoint.
- Handles scan lifecycle (start/cancel/error/success).
- Renders Overview, Drilldown, Directory explorer.

Data flow summary:
Selection -> /present request -> scan -> classify -> explain -> snapshot load -> diff -> snapshot save (if safe path) -> map to UI -> compress/serialize safety checks -> frontend render.


## 3. Repository Structure (Important)

Root:
- package.json: Electron app metadata and packaging config.
- package_linux.sh: Linux packaging pipeline script.
- electron/: desktop process and preload bridge.
- client/: React UI application.
- server/: Express backend and domain logic.

Server domain folders:
- src/core: raw filesystem scanning engine.
- src/intelligence: classification and explanation logic.
- src/history: snapshot persistence + diff computation.
- src/presentation: backend-to-frontend presentation mapping.
- tests: simple Node-based test scripts for each domain.


## 4. Runtime Components In Detail

### 4.1 Electron Main Process

Main file: electron/main.js

Responsibilities:
- Creates BrowserWindow with secure defaults:
  - contextIsolation: true
  - nodeIntegration: false
  - preload script enabled
- Starts backend as child process.
- Supports privileged restart path for full-system scans.
- Provides IPC handlers:
  - get-home-dir
  - get-external-devices
  - restart-backend
- Loads built frontend from client/dist/index.html
- Kills backend process on app quit.

Backend process startup behavior:
- Development mode:
  - command: node
  - server entry: ../server/src/index.js
  - privileged path uses pkexec node
- Packaged mode:
  - uses process.execPath (Electron executable) with ELECTRON_RUN_AS_NODE=1
  - privileged path uses pkexec env ELECTRON_RUN_AS_NODE=1 process.execPath serverPath

Mounted external devices lookup:
- Scans mount roots:
  - /media/<username>
  - /run/media/<username>
- Returns list of detected devices with name and path.

### 4.2 Preload Bridge

File: electron/preload.js

Exposed window.api capabilities:
- checkBackendStatus(): calls GET http://localhost:3000/health
- getHomeDir(): IPC call
- getExternalDevices(): IPC call
- restartBackend(privileged): IPC call

This keeps frontend isolated from direct Node APIs.

### 4.3 Electron index.html

File: electron/index.html

Role:
- Lightweight status page shell.
- Polls backend health up to 10 attempts.
- Shows backend running / not reachable state.

Note:
Main desktop window ultimately loads built React app, but this page exists as part of bundled assets.


## 5. Backend Service (Express)

Entry: server/src/index.js

Port: 3000

Middleware:
- express.json()

Endpoints:

1) GET /health
- Returns: { status: "ok" }

2) POST /scan
- Input: { path: string }
- Behavior:
  - Validates input path.
  - Runs raw scanDirectory only.
  - Supports abort when client disconnects.
- Success: raw tree JSON.
- Errors:
  - 400 invalid path
  - 499 cancelled
  - 500 internal error

3) POST /analyze
- Input: { path: string }
- Behavior:
  - Runs scan + enrichTree (classify + explain).
  - Supports cancellation.
- Success: enriched tree JSON.
- Errors: 400, 499, 500

4) POST /present
- Input: { path: string }
- Full pipeline:
  1. analyzePath (scan + enrich)
  2. loadLatestSnapshot
  3. generateSnapshot from current tree
  4. computeCategoryDiff(previous, current)
  5. conditional snapshot save (for safe system paths only)
  6. mapToUI
  7. compressTreeForUI
  8. JSON serialization safety checks
- Snapshot save policy:
  - skip external paths: /media, /run/media, /mnt
  - save only if path is / or starts with /home
- Serialization safeguards:
  - catches JSON.stringify failure
  - rejects payloads > 50,000,000 chars
- Errors: 400, 499, 500

Server process bootstrap:
- app.listen on port 3000 with startup log.


## 6. Core Scanning Engine

File: server/src/core/scanner.js

Purpose:
Recursively scan filesystem and compute sizes while preventing runaway scans and unsafe traversal behavior.

Safety constants:
- MAX_SCAN_DEPTH = 20
- MAX_TREE_DEPTH = 4 (limits tree detail returned to UI)
- MAX_FILE_SIZE = 50 GB (clamp unrealistic values)
- MAX_NODES = 200000
- MAX_PATH_LENGTH = 1000

Excluded paths:
- /proc
- /sys
- /dev
- /run
- /tmp
- /snap

NTFS noisy names skipped:
- System Volume Information
- $Recycle.Bin

Behavior highlights:
- Uses fs.lstat to avoid symlink-follow loops.
- Skips symbolic links entirely.
- Handles permission and missing-entry errors gracefully.
- Processes directory entries in batches of 50.
- Supports cancellation through AbortSignal.
- Tracks progress counters: directoriesProcessed, filesProcessed, nodeCount.
- For nodes beyond MAX_TREE_DEPTH:
  - still contributes to total size
  - does not emit full child node list

Output node shape (directory):
- path
- size
- type: directory
- children
- truncated flag
- error field (nullable)

Output node shape (file):
- path
- size
- type: file


## 7. Intelligence Layer

### 7.1 Classifier

File: server/src/intelligence/classifier.js

Function: classifyNode(node)
Returns: { category, confidence }

Category rules:
- containers (high):
  - /var/lib/docker
  - /var/lib/containers
- packages:
  - /var/lib/snapd -> high
  - path includes /.var/app -> medium
- logs (high):
  - /var/log
- cache (high):
  - /var/cache
  - path includes /.cache
- system (high):
  - /usr, /lib, /lib64, /bin, /sbin
- kernels (high):
  - under /boot and filename starts with vmlinuz or initrd
- user-data (high):
  - /home (after cache/package rules)
- fallback:
  - unclassified, low

### 7.2 Explainer

File: server/src/intelligence/explainer.js

Function: explainClassification({ category, confidence })
Returns:
- title
- explanation
- riskLevel

Risk levels used:
- low
- normal
- medium
- user
- unknown

Confidence behavior:
- low confidence appends uncertainty text.
- medium confidence prefixes explanation with Likely:.


## 8. History Layer

### 8.1 Snapshot Store

File: server/src/history/snapshotStore.js

Base path:
- ~/.local/share/dscope/snapshots

Functions:
- saveSnapshot(snapshot)
  - ensures directory exists
  - writes timestamped file (colons replaced by dashes)
  - writes latest.json
  - returns boolean success
- loadLatestSnapshot()
  - returns parsed latest snapshot or null

Snapshot schema:
- timestamp (ISO)
- totalSize (number)
- categories object keyed by backend category

### 8.2 Diff Engine

File: server/src/history/diffEngine.js

Function: computeCategoryDiff(previousSnapshot, currentSnapshot)
Returns:
- baseline (boolean)
- totalDelta (number)
- categoryDeltas object (only non-zero entries)

Rules:
- No previous snapshot => baseline true, zero deltas.
- Uses union of all category keys from previous and current.
- Omits zero-value category changes.


## 9. Presentation Mapping Layer

File: server/src/presentation/presentationMapper.js

Purpose:
Transform enriched analysis tree + historical diff into frontend-ready structures.

mapToUI output shape:
- overview:
  - categories[]
  - lastSnapshot timestamp
- directory:
  - root node

### 9.1 Overview Aggregation

Process:
- Traverses files only (not directories) to avoid double counting.
- Extension-first categorization priority:
  - photos extensions set
  - videos extensions set
  - documents extensions set
- Then backend category mapping:
  - cache -> cache
  - containers -> containers
  - logs/system/kernels -> system
  - packages/dependencies -> apps
- Fallback -> other

Each overview category includes:
- id
- label
- size
- files[] (top files)
- delta

Payload guards:
- per category files are sorted by size descending
- capped at 500 files per category

### 9.2 Delta Projection

Diff mapping to UI categories:
- apps <- packages
- cache <- cache
- containers <- containers
- system <- logs + system + kernels
- other <- unclassified (and a user-data mapping path appears in one place)

### 9.3 Directory Mapping

Directory controls:
- MAX_DIRECTORY_DEPTH = 5
- MAX_CHILDREN_PER_NODE = 50

Hidden/noisy dirs filtered in directory mode:
- node_modules
- .git
- .cache
- dist
- build
- .DS_Store
- names starting with dot

If max depth reached:
- emits synthetic summary child indicating hidden count and summed size.

If too many children:
- keeps top 50 by size and appends synthetic ...and N more item.

Pass-through explanation fields:
- title
- explanation
- riskLevel


## 10. Additional Server Helpers In index.js

### enrichTree(node)
- Recursively classifies and explains each node.
- Decorates node with:
  - category
  - confidence
  - classification object
  - explanation
  - title
  - riskLevel

### analyzePath(path, signal)
- scanDirectory -> enrichTree -> return enriched tree.

### generateSnapshot(tree)
- Aggregates categories from files only.
- Creates timestamp + totalSize + categories map.

### compressTreeForUI(node, maxChildren=200)
- Sorts children by size descending.
- Truncates child list beyond limit.
- Adds synthetic other node containing aggregate size.
- Repeats recursively.


## 11. Frontend Application

Entry files:
- client/src/main.tsx
- client/src/App.tsx

### 11.1 App State Machine

State fields:
- status: idle | scanning | success | error | cancelled
- data: PresentationData | null
- path: string
- error: string | null

Additional UI state:
- targetSelected
- scanScope: Home Directory | Entire System | External Device
- viewMode: overview | directory
- drilldownCategory
- abortControllerRef

### 11.2 Scan Lifecycle

Target selection:
- User chooses home/system/device in modal.
- Path set immediately.
- If system scan:
  - asks Electron main process to restart backend in privileged mode.
  - waits ~3 seconds for backend availability.
- Calls triggerScan(path).

triggerScan:
- sets scanning status
- aborts previous pending request if any
- POST /present with abort signal
- handles response statuses:
  - 499 => cancelled
  - other non-ok => error from response JSON
- on success stores PresentationData

Cancel behavior:
- abort controller triggers fetch abort
- status set to cancelled

Reset behavior:
- returns to initial target selection state

### 11.3 Views

1) Overview page
- Card grid by category.
- Shows icon, description, size, file count, delta.
- Delta explanation text by category.
- Card click opens drilldown for category.

2) DrilldownList page
- Groups category files by parent folder.
- Sorts groups by aggregated size.
- Shows each file with size.
- Back button returns to overview.

3) Directory page
- Recursive expandable tree rows.
- Displays folder/file icon and size.
- Expands to show explanation panel and nested children.
- Shows risk badge for notable risk levels.

### 11.4 Scan Target Selection UI

Component: client/src/components/ScanTargetSelection.tsx

Options:
- Home Directory (recommended)
- Entire System (advanced)
- External Device list (dynamic)

External device handling:
- Uses window.api.getExternalDevices()
- Refresh button to rescan mounts

### 11.5 Additional Component

client/src/components/ResultsView.tsx exists and renders recursive node tree with badges and explanations.
It appears not wired into current App flow (Directory and Overview are primary visible modes).


## 12. Frontend Type Contracts

File: client/src/types.ts

Important interfaces:
- ScanNode
- FileInfo
- OverviewCategory
- DirectoryNode
- PresentationData
- AppState

Risk levels typed for DirectoryNode:
- low | normal | medium | user | unknown


## 13. Frontend Styling System

Primary CSS files:
- client/src/App.css
- client/src/index.css

App.css theme tokens:
- primary/secondary/accent/danger/warning/light/dark/gray
- card and hover shadows
- background color

Implemented UI patterns:
- responsive dashboard and header
- status area with spinner animation
- view toggle tabs
- card hover effects
- directory explorer layout
- drilldown grouped list
- risk tags and risk badges
- target selection modal overlay
- custom scrollbars

Note on index.css:
- still contains Vite starter defaults including color-scheme light dark.
- App.css overrides most runtime visuals for DScope UI.


## 14. Build, Packaging, and Tooling

### 14.1 Root package.json (Electron)

Name: dscope-desktop
Version: 1.0.0
Main: electron/main.js

Scripts:
- start: electron .
- dist: electron-builder

electron-builder config highlights:
- appId: com.dscope.app
- productName: DScope
- includes:
  - electron/main.js
  - electron/preload.js
  - electron/index.html
  - client/dist/**/*
  - server/**/*
- Linux targets:
  - AppImage
  - deb
  - rpm
- icon path:
  - client/src/assets/DScope_image.png

### 14.2 Linux packaging script

File: package_linux.sh

Pipeline:
1. cleanup previous dist and node_modules subset
2. build frontend in client/
3. install backend production dependencies in server/
4. build Electron distributables
5. attempts AppImage, deb, rpm (deb/rpm continue on failure)

### 14.3 Client toolchain

- React 19
- TypeScript 5.9
- Vite 7
- ESLint 9

Key scripts:
- dev
- build
- lint
- preview

Vite base:
- ./ (relative asset paths for packaged app compatibility)

### 14.4 Server toolchain

- Express 5.2
- Test script currently points to node tests/test_scanner.js only


## 15. Automated Test Coverage (Script-Based)

Location: server/tests

Existing scripts:
- test_scanner.js
  - validates size correctness on sandbox
  - validates symlink safety
- test_features.js
  - validates progress callback updates
  - validates abort cancellation behavior
- test_classifier.js
  - validates category/confidence rules
- test_explainer.js
  - validates title/risk/explanation mapping and confidence handling
- test_diffEngine.js
  - baseline/growth/shrink/new category/removed category/mixed changes
- test_snapshotStore.js
  - save/load behavior and filesystem creation checks
- test_presentationMapper.js
  - category mapping, delta assignment, directory structure assertions
- setup_api_test.js
  - creates api_test_data fixtures
- test_api_cancel.js
  - sends request then destroys it quickly to verify cancel path

Test style:
- plain Node scripts, no Jest/Mocha framework.
- pass/fail through console output and process exit code.


## 16. Data Persistence and History

Snapshot location:
- ~/.local/share/dscope/snapshots

Files written:
- latest.json
- timestamped JSON snapshots

When snapshots are saved:
- only for safe core paths (/ or /home*)
- intentionally skipped for external media and some non-root paths

Why this matters:
- avoids polluting historical trend data with removable/external device scans.


## 17. Security and Safety Controls

Implemented controls:
- Frontend sandboxed via contextIsolation + no nodeIntegration.
- Narrow preload API surface.
- Scanner skips pseudo-filesystems and symlinks.
- Permission errors handled gracefully.
- Request cancellation support to stop expensive scans.
- Output size guards to avoid huge payload crashes.
- Child process managed and cleaned up on quit.

Operational caveat:
- Entire-system scan may invoke privileged backend restart through pkexec.


## 18. Performance and Scale Controls

Backend controls:
- depth and node count caps
- path length caps
- batch processing of directory entries
- tree truncation for UI and response safety
- category file list cap (500)

Frontend controls:
- mode-based rendering (Overview vs Directory)
- Drilldown uses grouped view instead of giant flat lists

Potential high-load scenarios still possible:
- very large home directories can still produce heavy payloads before caps are hit.


## 19. Known Inconsistencies and Technical Gaps

1. server/index.js exists but is empty
- Real backend entry is server/src/index.js.

2. client/src/design/primitives.tsx and client/src/design/icons.tsx are empty placeholders.

3. client/src/components/ResultsView.tsx appears unused in current app routing/render flow.

4. server/package.json test script only runs one test file
- many additional test scripts exist but are not aggregated.

5. test_snapshotStore.js restores os.homedir by assigning function that returns previous value.
- works in script context but is a simplistic monkey-patch pattern.

6. minor category mapping complexity in presentation mapper for other/user-data handling.
- behavior is intentional but should be monitored for semantic consistency.

7. index.css still includes default Vite starter theming tokens that may conflict conceptually with custom app theme.


## 20. End-to-End Functional Story

1. User opens DScope desktop app.
2. Modal asks scan target (home/system/external).
3. If system selected, backend restarted with elevated privileges path.
4. Frontend sends POST /present with selected path.
5. Backend scans filesystem safely with caps and cancellation support.
6. Each node is classified and explained.
7. Previous snapshot loaded if present.
8. Current snapshot created and diff computed.
9. Snapshot is conditionally saved for stable core paths.
10. Data transformed to Overview and Directory models.
11. Tree/payload compressed and guarded for serialization size.
12. Frontend renders:
- Overview cards with deltas and reasons.
- Drilldown file groups by folder.
- Directory tree with inline explanation and risk.
13. User may cancel scan, start a new scan, or reset to choose another target.


## 21. Configuration and Ignore Rules

Root .gitignore:
- node_modules (root/client/server)
- env files
- logs
- dist/build/out
- OS artifacts

Client .gitignore:
- logs
- node_modules
- dist
- editor temp files


## 22. Assets and Branding

Client assets:
- DScope_logo.png
- DScope_image.png
- react.svg

UI text branding examples:
- DScope Intelligence v1.0
- Designed for Linux Systems
- Linux Disk Space Visualization Tool


## 23. API Contract Summary

Health:
- GET /health
- Response: { status: "ok" }

Present scan:
- POST /present
- Request JSON: { path: string }
- Success response:
  - overview.categories[]
  - overview.lastSnapshot
  - directory.root
- Failure responses:
  - 400 invalid path
  - 499 scan cancelled
  - 500 scan failed or result too large

Raw scan:
- POST /scan
- Request JSON: { path: string }
- Returns raw scanner tree

Analyze:
- POST /analyze
- Request JSON: { path: string }
- Returns enriched tree with category/explanation metadata


## 24. Practical Operations Notes

Development launch pattern:
- Build frontend in client
- Run Electron shell from root
- Electron spawns backend process automatically

Production packaging:
- run package_linux.sh
- outputs artifacts under dist/

Backend snapshot artifact path on user machine:
- ~/.local/share/dscope/snapshots


## 25. Full Important File Index

Root:
- package.json
- package_linux.sh
- .gitignore

Electron:
- electron/main.js
- electron/preload.js
- electron/index.html

Server core:
- server/src/index.js
- server/src/core/scanner.js
- server/src/intelligence/classifier.js
- server/src/intelligence/explainer.js
- server/src/history/snapshotStore.js
- server/src/history/diffEngine.js
- server/src/presentation/presentationMapper.js

Server tests:
- server/tests/test_scanner.js
- server/tests/test_features.js
- server/tests/test_classifier.js
- server/tests/test_explainer.js
- server/tests/test_diffEngine.js
- server/tests/test_snapshotStore.js
- server/tests/test_presentationMapper.js
- server/tests/setup_api_test.js
- server/tests/test_api_cancel.js

Client app:
- client/src/main.tsx
- client/src/App.tsx
- client/src/types.ts
- client/src/utils/format.ts
- client/src/components/ScanTargetSelection.tsx
- client/src/components/ResultsView.tsx
- client/src/pages/Overview.tsx
- client/src/pages/Directory.tsx
- client/src/pages/DrilldownList.tsx
- client/src/App.css
- client/src/index.css
- client/index.html
- client/vite.config.ts
- client/eslint.config.js
- client/tsconfig.json
- client/tsconfig.app.json
- client/tsconfig.node.json

Placeholder/empty files currently present:
- server/index.js
- client/src/design/primitives.tsx
- client/src/design/icons.tsx


## 26. Final Summary

DScope is a Linux-focused desktop disk intelligence application with a clear layered design:
- Electron orchestrates desktop runtime and privileged transitions.
- Backend performs safe recursive scanning, deterministic classification/explanation, historical diffing, and UI mapping.
- Frontend delivers actionable, category-first and directory-deep analysis workflows.

The project already includes substantial safety logic for scanning and response size control, history tracking for trend analysis, and a practical set of script-based tests across core modules.

This document is intended to be the complete technical snapshot of the current codebase state in this repository.