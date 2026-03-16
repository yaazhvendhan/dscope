

# DScope

DScope is a Linux disk intelligence and visualization tool that analyzes filesystem usage and explains how storage is distributed across the system.

Unlike traditional disk analyzers that only show folder sizes, DScope provides categorized insights, growth tracking, and human-readable explanations to help users understand why disk space changes over time.

---

## Features

### Accurate Disk Usage Analysis

DScope measures real disk usage using Linux filesystem metadata (`lstat`, allocated blocks), similar to the `du` command.

### Intelligent Storage Categorization

Automatically groups files into meaningful categories such as:

* System
* Cache
* Applications & Dependencies
* Containers
* Photos
* Documents
* Videos
* Other

### Growth Tracking

DScope stores disk usage snapshots and compares them over time to explain how storage grows.

### Dual Visualization Modes

* **Overview Mode** – High-level categorized storage insights
* **Directory Mode** – Explorer-style navigation similar to VS Code

### Secure System Scanning

Supports full system scans using privilege escalation (`pkexec`) when required.

### External Device Detection

Automatically detects mounted external drives and USB storage devices.

---

## Architecture

DScope follows a desktop + local service architecture.

```
Electron Desktop Shell
        │
        │ IPC
        ▼
Node.js + Express Backend
        │
        │ Filesystem APIs
        ▼
Linux Kernel (stat / lstat)
```

---

## Core Components

### Scanner

Recursively traverses the filesystem and calculates disk usage.

### Classifier

Categorizes files into logical storage groups.

### Explainer

Generates human-readable explanations for storage categories.

### Snapshot Engine

Stores disk usage snapshots for historical comparison.

### Diff Engine

Calculates storage changes between scans.

### Presentation Layer

Transforms backend data into UI-ready structures.

---

## Tech Stack

### Frontend

* React
* JavaScript
* HTML
* CSS

### Desktop Layer

* Electron

### Backend

* Node.js
* Express.js

### System Integration

* Linux Filesystem APIs (`lstat`, POSIX metadata)
* Electron IPC
* Process management (`child_process`)
* Privilege escalation (`pkexec`)

---

## Installation

### Clone the repository

```
git clone https://github.com/YOUR_USERNAME/dscope.git
cd dscope
```

### Install dependencies

```
npm install
```

### Install frontend dependencies

```
cd client
npm install
npm run build
cd ..
```

### Run the application

```
npm start
```

---

## Usage

1. Launch DScope
2. Choose a **scan scope**:

   * Home directory
   * Entire system
   * External device
3. Start the scan
4. View results in:

   * **Overview** (categorized storage)
   * **Directory** (explorer-style browsing)

Snapshots are automatically stored at:

```
~/.local/share/dscope/snapshots/
```

---

## Project Structure

```
DScope
├── client                # React frontend
├── electron              # Electron main process
├── server
│   ├── core              # Filesystem scanner
│   ├── intelligence      # Classification & explanation engine
│   ├── history           # Snapshot storage and diff engine
│   └── presentation      # UI data mapping
```

---

## Future Improvements

* Storage cleanup suggestions
* Historical storage charts
* Scheduled background scans
* Cross-platform support


