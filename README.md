# DScope

**DScope** is a Linux disk intelligence and visualization tool that analyzes filesystem usage and explains how storage is distributed across the system.  
Unlike traditional disk analyzers that only show sizes, DScope provides **categorized insights, growth tracking, and human-readable explanations** to help users understand *why* disk space changes over time.

---

## Features

- **Accurate Disk Usage Analysis**
  - Uses Linux filesystem metadata (`lstat`, allocated blocks) to measure real disk usage similar to `du`.

- **System-wide Storage Categorization**
  - Automatically groups files into meaningful categories:
  - System
  - Cache
  - Applications & Dependencies
  - Containers
  - Photos
  - Documents
  - Videos
  - Other

- **Growth Tracking**
  - Snapshot-based storage history
  - Detects and explains storage growth between scans.

- **Dual Visualization Modes**
  - **Overview Mode** – High-level categorized storage insights  
  - **Directory Mode** – Explorer-style directory navigation similar to VS Code.

- **Secure System Scanning**
  - Supports full system scans with privilege escalation using `pkexec`.

- **External Device Support**
  - Automatically detects mounted drives and external devices.

---

## Architecture
DScope follows a **desktop + local service architecture**:
Electron (Desktop Shell)
│
│ IPC
▼
Node.js + Express Backend
│
│ Filesystem APIs
▼
Linux Kernel (stat / lstat)


### Core Components

- **Scanner**
  - Recursively traverses the filesystem and computes disk usage.

- **Classifier**
  - Categorizes files into logical storage groups.

- **Explainer**
  - Generates human-readable explanations for storage categories.

- **Snapshot Engine**
  - Stores disk usage snapshots for historical comparison.

- **Diff Engine**
  - Calculates storage changes between scans.

---

## Tech Stack

- **Frontend**
  - React
  - JavaScript
  - HTML / CSS

- **Desktop Layer**
  - Electron

- **Backend**
  - Node.js
  - Express.js

- **System Integration**
  - Linux Filesystem APIs (`lstat`, POSIX metadata)
  - Process management (`child_process`)
  - Electron IPC

---


git clone https://github.com/yourusername/dscope.git
cd dscope

