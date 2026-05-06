const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TabStopType, TabStopPosition, ImageRun
} = require('docx');
const fs = require('fs');
const path = require('path');

const DIAG = '/home/horcrux/Projects/dscope/DScope/diagrams';

// ═══════════════════════════════════════════════════════════════════════════
// STYLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder   = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders  = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const TNR = "Times New Roman";
const sp  = (after=120) => ({ after });

function tr(text, opts={}) {
  return new TextRun({ text, font: TNR, size: 24, ...opts });
}
function trB(text, opts={}) { return tr(text, { bold: true, ...opts }); }

function body(text, extra={}) {
  return new Paragraph({ spacing: sp(120), children: [tr(text)], ...extra });
}
function bodySmall(text) {
  return new Paragraph({ spacing: sp(80), children: [new TextRun({ text, font: TNR, size: 22 })] });
}
function spacer(n=1) {
  return [...Array(n)].map(()=>new Paragraph({ spacing: sp(80), children: [tr('')] }));
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: sp(80),
    children: [tr(text)],
  });
}
function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: sp(80),
    children: [tr(text)],
  });
}
function codeBlock(lines) {
  return lines.map(l => new Paragraph({
    spacing: sp(40),
    indent: { left: 720 },
    children: [new TextRun({ text: l, font: "Courier New", size: 18 })],
  }));
}
function figCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: sp(200),
    children: [new TextRun({ text, font: TNR, size: 22, italics: true })],
  });
}

// headings
function H1(num, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 140 },
    children: [trB(`${num}. ${title}`, { size: 28 })],
  });
}
function H2(num, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [trB(`${num} ${title}`, { size: 24 })],
  });
}
function H3(num, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [trB(`${num} ${title}`, { size: 24 })],
  });
}

// embed PNG diagram
function diagram(filename, widthPx=580, heightPx=null) {
  const data = fs.readFileSync(path.join(DIAG, filename));
  // original images are 1400px wide; scale height proportionally if not given
  if (!heightPx) {
    const { execSync } = require('child_process');
    // use python to get image dims
    try {
      const out = execSync(`python3 -c "from PIL import Image; im=Image.open('${path.join(DIAG,filename)}'); print(im.size[0],im.size[1])"`).toString().trim().split(' ');
      const origW = parseInt(out[0]), origH = parseInt(out[1]);
      heightPx = Math.round(widthPx * origH / origW);
    } catch { heightPx = Math.round(widthPx * 0.6); }
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: sp(60),
    children: [new ImageRun({
      type: "png",
      data,
      transformation: { width: widthPx, height: heightPx },
      altText: { title: filename, description: filename, name: filename },
    })],
  });
}

// table helpers
function mkTable(rows, colWidths) {
  const totalW = colWidths.reduce((a,b)=>a+b,0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map((text, ci) =>
          new TableCell({
            borders: cellBorders,
            width: { size: colWidths[ci], type: WidthType.DXA },
            shading: { fill: ri===0 ? "D0DCF0" : "FFFFFF", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({
              text, font: TNR, size: 22, bold: ri===0
            })] })],
          })
        ),
      })
    ),
  });
}

// screenshot placeholder box
function screenshotPlaceholder(label) {
  const BW = 9026; // full content width A4
  return [
    new Table({
      width: { size: BW, type: WidthType.DXA },
      columnWidths: [BW],
      rows: [
        new TableRow({ children: [
          new TableCell({
            borders: {
              top:    { style: BorderStyle.DASHED, size: 6, color: "888888" },
              bottom: { style: BorderStyle.DASHED, size: 6, color: "888888" },
              left:   { style: BorderStyle.DASHED, size: 6, color: "888888" },
              right:  { style: BorderStyle.DASHED, size: 6, color: "888888" },
            },
            shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `[ Screenshot Placeholder ]`, font: TNR, size: 22, color: "AAAAAA", italics: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: label, font: TNR, size: 22, bold: true, color: "666666" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60 },
                children: [new TextRun({ text: "(Insert actual application screenshot here)", font: TNR, size: 20, color: "AAAAAA", italics: true })],
              }),
            ],
          }),
        ]}),
      ],
    }),
    ...spacer(1),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════════════
function coverPage() {
  const c = (text, size, bold=false, align=AlignmentType.RIGHT) =>
    new Paragraph({ alignment: align, spacing: sp(100), children: [new TextRun({ text, font: TNR, size, bold })] });
  return [
    ...spacer(2),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp(200),
      children: [new TextRun({ text: "DScope", font: TNR, size: 52, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp(400),
      children: [new TextRun({ text: "Linux Disk Space Visualization Tool", font: TNR, size: 28 })] }),
    c("FULL STACK PROJECT REPORT", 22, true),
    c("SUBMITTED IN PARTIAL FULFILLMENT OF", 22),
    c("THE REQUIREMENTS FOR THE", 22),
    c("AWARD OF THE DEGREE OF", 22),
    c("BACHELOR OF ENGINEERING IN", 22, true),
    c("COMPUTER SCIENCE AND ENGINEERING", 22, true),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp(400),
      children: [new TextRun({ text: "OF THE ANNA UNIVERSITY", font: TNR, size: 22 })] }),
    c("Submitted by", 22),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp(400),
      children: [new TextRun({ text: "SAUMYAJIT PURAKAYASTHA - 722824104218", font: TNR, size: 24, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: sp(80),
      children: [new TextRun({ text: "BATCH", font: TNR, size: 24, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: sp(300),
      children: [new TextRun({ text: "2024 – 2028", font: TNR, size: 24, bold: true })] }),
    c("Under the Guidance of", 22),
    c("MR. M. KARTHIK RAJA, M.E.,", 22, true),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp(300),
      children: [new TextRun({ text: "ASSISTANT PROFESSOR/CSE", font: TNR, size: 22, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(80),
      children: [trB("Department of Computer Science & Engineering", { size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(80),
      children: [trB("Sri Eshwar College of Engineering", { size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(80),
      children: [tr("(An Autonomous Institution – Affiliated to Anna University)", { size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(80),
      children: [trB("COIMBATORE – 641 202", { size: 22 })] }),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// BONAFIDE
// ═══════════════════════════════════════════════════════════════════════════
function bonafidePage() {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(400),
      children: [trB("BONAFIDE CERTIFICATE", { size: 28 })] }),
    body('Certified that this Report titled "DScope – Linux Disk Space Visualization Tool" is the bonafide work of'),
    ...spacer(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(400),
      children: [trB("SAUMYAJIT PURAKAYASTHA    722824104218", { size: 24 })] }),
    body("who carried out the project work under my supervision."),
    ...spacer(2),
    new Table({ width:{size:9026,type:WidthType.DXA}, columnWidths:[4513,4513],
      rows:[new TableRow({ children:[
        new TableCell({ borders:noBorders, width:{size:4513,type:WidthType.DXA}, children:[
          new Paragraph({children:[tr("SIGNATURE")]}), ...spacer(2),
          new Paragraph({children:[tr("Dr. R. Subha M.E., Ph.D")]}),
          new Paragraph({children:[trB("HEAD OF THE DEPARTMENT")]}),
          new Paragraph({children:[tr("Computer Science and Engineering,")]}),
          new Paragraph({children:[tr("Sri Eshwar College of Engineering,")]}),
          new Paragraph({children:[tr("Coimbatore – 641 202.")]}),
        ]}),
        new TableCell({ borders:noBorders, width:{size:4513,type:WidthType.DXA}, children:[
          new Paragraph({children:[tr("SIGNATURE")]}), ...spacer(2),
          new Paragraph({children:[tr("Mr. M. Karthik Raja, M.E.,")]}),
          new Paragraph({children:[trB("SUPERVISOR")]}),
          new Paragraph({children:[tr("Assistant Professor,")]}),
          new Paragraph({children:[tr("Computer Science and Engineering,")]}),
          new Paragraph({children:[tr("Sri Eshwar College of Engineering,")]}),
          new Paragraph({children:[tr("Coimbatore – 641 202.")]}),
        ]}),
      ]})],
    }),
    ...spacer(2),
    body("Submitted for the Autonomous Semester End Full Stack Web Development Review held on ………………….."),
    ...spacer(2),
    new Table({ width:{size:9026,type:WidthType.DXA}, columnWidths:[4513,4513],
      rows:[new TableRow({ children:[
        new TableCell({ borders:noBorders, width:{size:4513,type:WidthType.DXA}, children:[new Paragraph({children:[tr("INTERNAL EXAMINER")]})]}),
        new TableCell({ borders:noBorders, width:{size:4513,type:WidthType.DXA}, children:[new Paragraph({children:[tr("EXTERNAL EXAMINER")]})]}),
      ]})],
    }),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// DECLARATION
// ═══════════════════════════════════════════════════════════════════════════
function declarationPage() {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(300),
      children: [trB("DECLARATION", { size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(300),
      children: [trB("SAUMYAJIT PURAKAYASTHA - [722824104218]", { size: 24 })] }),
    body('To declare that the project entitled "DScope – Linux Disk Space Visualization Tool" submitted in partial fulfilment to the University as the project work of Bachelor of Engineering (Computer Science and Engineering) Degree, is a record of original work done by us under the supervision and guidance of'),
    ...spacer(),
    body("Mr. M. Karthik Raja, Assistant Professor, Department of Computer Science and Engineering, Sri Eshwar College of Engineering, Coimbatore."),
    ...spacer(2),
    body("Place: Coimbatore"),
    body("Date:"),
    ...spacer(2),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: sp(120),
      children: [tr("SAUMYAJIT PURAKAYASTHA")] }),
    ...spacer(),
    body("Project Guided by,"),
    body("Mr. M. Karthik Raja M.E., AP/CSE"),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// ACKNOWLEDGEMENT
// ═══════════════════════════════════════════════════════════════════════════
function acknowledgementPage() {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(300),
      children: [trB("ACKNOWLEDGEMENT", { size: 28 })] }),
    body("The success of a work depends on a team and cooperation. I take this opportunity to express my gratitude and thanks to everyone who helped me in my project. I would like to thank the management for the constant support provided by them to complete this project."),
    ...spacer(),
    body("It is indeed our great honor bounded duty to thank our beloved Chairman Mr. R. Mohanram, for his academic interest shown towards the students."),
    ...spacer(),
    body("We are indebted to our Director Mr. R. Rajaram, for motivating and providing us with all facilities."),
    ...spacer(),
    body("I wish to express my sincere regards and deep sense of gratitude to Dr. Sudha Mohanram, M.E, Ph.D. Principal, for the excellent facilities and encouragement provided during the course of the study and project."),
    ...spacer(),
    body("We are indebted to Dr. R. Subha, M.E., Ph.D. Head of Computer Science and Engineering Department for having permitted us to carry out this project and giving the complete freedom to utilize the resources of the department."),
    ...spacer(),
    body("I express my sincere thanks to my mini project Coordinator Mr. M. Karthik Raja, M.E., Assistant Professors of Computer Science and Engineering Department for the valuable guidance and encouragement given to us for this project."),
    ...spacer(),
    body("I solemnly express our thanks to all the teaching and nonteaching staff of the Computer Science and Engineering Department, family and friends for their valuable support which inspired us to work on this project."),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════════════
function tocPage() {
  const tocEntries = [
    ["1. Introduction", "1"], ["   1.1 Overview of the Project", "1"],
    ["   1.2 Objective of the System", "2"], ["   1.3 Scope of the Project", "3"],
    ["   1.4 Problem Statement", "4"],
    ["2. System Analysis", "5"], ["   2.1 Existing System", "5"],
    ["   2.2 Limitations of Existing System", "6"], ["   2.3 Proposed System", "7"],
    ["   2.4 Advantages of Proposed System", "8"],
    ["3. System Design", "9"], ["   3.1 Architecture Overview", "9"],
    ["   3.2 Backend Service Architecture", "12"], ["   3.3 Data Flow Diagram (DFD)", "15"],
    ["   3.4 Entity Relationship Diagram", "18"],
    ["4. Storage Design", "21"], ["   4.1 File-Based Snapshot Storage", "21"],
    ["   4.2 Snapshot Schema", "22"], ["   4.3 Data Relationships and References", "23"],
    ["   4.4 Data Integrity Principles", "24"],
    ["5. Advanced System Features", "25"], ["   5.1 Category Classification Engine", "25"],
    ["   5.2 Role-Based View Modes", "27"], ["   5.3 Scan Safety Controls", "29"],
    ["6. Implementation", "31"], ["   6.1 Service Layer (Business Logic)", "31"],
    ["   6.2 Scan Initiation and Validation", "32"], ["   6.3 Multi-Stage Analysis Pipeline", "34"],
    ["   6.4 Snapshot Diff and Audit Trail", "36"], ["   6.5 Data Filtering and Querying", "38"],
    ["   6.6 Scan Cancellation (AbortSignal)", "39"],
    ["7. Performance and Optimization", "41"], ["   7.1 Parallel Analysis Pipeline", "41"],
    ["   7.2 Depth and Node Count Capping", "43"], ["   7.3 Payload Compression", "44"],
    ["8. Workflow State Management", "46"], ["   8.1 Scan Lifecycle State Machine", "46"],
    ["   8.2 State Transitions", "48"], ["   8.3 Concurrency and Cancellation", "50"],
    ["9. Results and Analysis", "52"], ["   9.1 Sample Data and Output", "52"],
    ["   9.2 Reports Generated by the System", "54"], ["   9.3 Performance Observations", "55"],
    ["10. Application Integration (Full Stack)", "57"],
    ["    10.1 Backend Integration", "57"], ["    10.2 Frontend Interaction", "58"],
    ["    10.3 Electron Shell and IPC Bridge", "60"],
    ["11. Conclusion", "62"], ["    11.1 Summary of Work", "62"],
    ["    11.2 Learning Outcomes", "63"], ["    11.3 Future Enhancements", "64"],
    ["12. References", "66"],
    ["    A. Frameworks and Libraries", "66"], ["    B. Websites and Tools", "67"],
    ["    C. Documentation", "67"],
    ["13. Appendix", "68"], ["    A. Code Samples", "68"], ["    B. Screenshots", "69"],
  ];
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: sp(300),
      children: [trB("Table of Contents", { size: 28 })] }),
    ...tocEntries.map(([label, pg]) =>
      new Paragraph({
        spacing: sp(60),
        children: [tr(label), tr("\t" + pg)],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      })
    ),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 1
// ═══════════════════════════════════════════════════════════════════════════
function chapter1() { return [
  H1("1", "Introduction"),
  H2("1.1", "Overview of the Project"),
  body("DScope is a Linux desktop application developed to address a common and persistent challenge for developers, system administrators, and everyday Linux users: understanding where disk space is being consumed and why it is changing over time. The name DScope reflects its core purpose — a scope (lens) for disk intelligence."),
  ...spacer(),
  body("Unlike simple disk usage tools such as du or df, DScope not only scans the filesystem recursively but also classifies each directory and file into a meaningful semantic category such as cache, containers, logs, system files, user data, packages, or kernels. It further computes historical deltas between successive scans to show whether a category is growing or shrinking over time, and presents this information in two major UX modes tailored to different exploration styles."),
  ...spacer(),
  body("Overview mode presents category-level intelligence with size totals, file counts, and growth or shrink deltas shown as colored badges on category cards. Directory mode provides a navigable recursive tree with inline human-readable explanations and risk indicators for every directory and file node. A DrilldownList mode bridges the two, showing files within a selected category grouped by parent folder and sorted by size."),
  ...spacer(),
  body("DScope integrates a three-part architecture consisting of an Electron desktop shell that provides the native Linux window and a secure IPC bridge, a Node.js and Express backend service that performs all scanning and analysis, and a React with TypeScript frontend built with Vite that drives the user experience. The entire application is packaged as a Linux desktop distributable in AppImage, deb, and rpm formats."),
  ...spacer(),
  body("The project was conceived to provide a tool that is simultaneously safe (never traverses pseudo-filesystems or symlinks), fast (uses depth and node count caps and batched processing), informative (provides explanations and risk levels for every classified node), and historically aware (persists snapshots and computes diffs). It fills a genuine gap in the Linux desktop tooling ecosystem where existing tools are either too low-level and opaque or too simplistic and context-free."),
  ...spacer(),

  H2("1.2", "Objective of the System"),
  body("The primary objectives of DScope are structured around four dimensions: safety, intelligence, history, and usability."),
  ...spacer(),
  body("Safety objectives: DScope must scan the Linux filesystem without ever traversing pseudo-filesystems (such as /proc, /sys, /dev), without following symbolic links that could create traversal loops, and without allowing any single scan to exhaust system memory or produce an unbounded response payload. Every safety limit must be hard-coded and enforced at the scanner level, not as a configuration option that can be accidentally disabled."),
  ...spacer(),
  body("Intelligence objectives: Every file and directory node produced by the scanner must be classified into one of eight semantic categories using a deterministic rule-based engine. Each classification must carry a confidence level (high, medium, or low) that reflects how certain the rule match is. Every classification must further be explained with a human-readable title, a plain-language description of what the category means, and a risk level that tells the user whether the directory is safe to clean, should be treated with caution, or is a critical system path."),
  ...spacer(),
  body("History objectives: DScope must persist scan results as timestamped JSON snapshot files on the user's local filesystem. On every subsequent scan of the same path, it must load the previous snapshot, generate a new snapshot from the current scan, and compute a category-level diff that surfaces growth and shrink trends. The historical comparison must be robust to the case where no previous snapshot exists (baseline scan) and must correctly handle categories that appear in one snapshot but not the other."),
  ...spacer(),
  body("Usability objectives: The results must be presented in a clean desktop GUI that is accessible to users without command-line expertise. The GUI must support two complementary exploration modes: an Overview mode for high-level category intelligence and a Directory mode for deep filesystem exploration. The user must be able to cancel a scan at any time, reset to choose a different scan target, and see real-time status feedback during scanning."),
  ...spacer(),

  H2("1.3", "Scope of the Project"),
  body("The system covers the following areas of functionality in detail:"),
  ...spacer(),
  body("Filesystem Scanning: DScope supports three scan targets — the home directory (recommended default, no privilege escalation required), the entire system root (requires a privileged backend restart via pkexec), and external devices detected under /media or /run/media. The scanner uses Node.js fs.lstat for all stat calls to avoid following symbolic links, processes directory entries in batches of 50 to avoid blocking the event loop, and tracks progress through directoriesProcessed, filesProcessed, and nodeCount counters."),
  ...spacer(),
  body("Classification and Explanation: The classification engine in classifier.js applies a priority-ordered set of path-pattern rules to every node and returns a category and confidence pair. The explanation engine in explainer.js maps each category and confidence pair to a human-readable title, description, and risk level. Low-confidence classifications append uncertainty text; medium-confidence classifications are prefixed with 'Likely:' to signal that the match is probabilistic rather than definitive."),
  ...spacer(),
  body("Historical Diffing: The snapshot store in snapshotStore.js writes two files on every completed scan of a safe path: a timestamped JSON file (for historical reference) and latest.json (for fast comparison on the next scan). The diff engine in diffEngine.js computes category-level size deltas by taking the union of all category keys from both snapshots and computing the signed difference for each. Categories that appear only in the current snapshot have a delta equal to their full size; categories that appear only in the previous snapshot have a negative delta equal to their full size."),
  ...spacer(),
  body("Overview Mode: The presentation mapper aggregates file sizes by category (using extension-first rules for photos, videos, and documents, then backend category mapping for cache, containers, logs, system, and packages) and constructs an array of OverviewCategory objects. Each OverviewCategory carries the category id, display label, total size in bytes, a list of the largest files (sorted by size descending, capped at 500), and the delta from the previous snapshot. The frontend renders these as interactive category cards with colored delta badges."),
  ...spacer(),
  body("Directory Mode: The presentation mapper maps the enriched scan tree to a DirectoryNode tree, filtering out hidden and noisy directories (node_modules, .git, .cache, dist, build, .DS_Store, and all dotfile directories), capping children per node at 50, and capping tree depth at 5. Nodes beyond the depth limit are represented by a synthetic summary child that shows the count and aggregate size of hidden subtrees. Each DirectoryNode carries the pass-through explanation fields (title, explanation, riskLevel) from the classification engine."),
  ...spacer(),
  body("Scan Control: The frontend state machine supports idle, scanning, success, error, and cancelled states. The user can cancel a running scan at any time, which triggers the AbortController and sends a 499 status to the frontend. The user can reset from any terminal state (success, error, cancelled) back to idle to choose a new scan target."),
  ...spacer(),
  body("File-Based Persistence: All historical data is stored as JSON files in ~/.local/share/dscope/snapshots on the user's local filesystem. No database engine, cloud service, or network connection is required. The storage directory is created automatically on the first successful scan."),
  ...spacer(),
  body("The system does not cover cloud storage analysis, network filesystem analysis, file deletion or cleanup operations, academic curriculum management, or financial transactions. These are identified as future enhancement areas in the Conclusion chapter."),
  ...spacer(),

  H2("1.4", "Problem Statement"),
  body("On Linux systems, disk space consumption is notoriously opaque. Standard tools like du and df report raw numbers without context. Users frequently encounter situations that create frustration and risk:"),
  ...spacer(),
  numbered("Disk space is unexpectedly full but the cause is invisible. Hidden cache directories under ~/.cache can consume gigabytes silently. Container image layers under /var/lib/docker accumulate with every docker pull. Old kernel and initrd files under /boot persist after kernel upgrades. Log files under /var/log grow unboundedly on busy systems. Without a tool that categorizes these directories explicitly, users cannot identify the source of consumption without significant manual investigation."),
  ...spacer(),
  numbered("There is no baseline comparison. The user has no way to know whether a directory grew or shrank between yesterday and today. This makes it impossible to identify which recent action — a docker pull, a package installation, a large download — caused a sudden spike in disk usage. Without historical comparison, disk management is reactive rather than proactive."),
  ...spacer(),
  numbered("Exploration is cumbersome. Recursive traversal with du requires command-line expertise and produces overwhelming, unformatted output. Sorting the output (du -sh /* | sort -rh) requires additional commands and produces a flat list that loses the tree structure. Graphical tools like Baobab show a tree but do not explain what directories do or whether they are safe to clean."),
  ...spacer(),
  numbered("Risk is invisible. Some directories such as /proc and /sys are pseudo-filesystems that appear to have size but must never be traversed or cleaned. /dev contains device files that can cause system damage if deleted. Without explicit risk indicators, a user exploring the filesystem with a disk tool might accidentally identify a critical system directory as a candidate for cleanup."),
  ...spacer(),
  numbered("Classification is absent. When a user sees that /var/lib/docker is consuming 40 GB, they know the size but not the context. A good disk intelligence tool should tell them that this is Container Storage, that it consists of image layers and volumes created by Docker or Podman, and that cleaning it will remove all stopped containers and unused images but not affect running containers."),
  ...spacer(),
  body("DScope addresses all five pain points by providing a fully visual, categorized, explained, and historically aware disk intelligence platform accessible from the Linux desktop. It is designed to be the tool that a developer or system administrator reaches for first when disk space becomes a concern."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 2
// ═══════════════════════════════════════════════════════════════════════════
function chapter2() { return [
  H1("2", "System Analysis"),
  H2("2.1", "Existing System"),
  body("The existing approach to disk space analysis on Linux relies predominantly on command-line tools and a small set of graphical utilities. Each has significant limitations that DScope is designed to address."),
  ...spacer(),
  body("Command-line tools: The du (disk usage) command reports the sizes of directories and files recursively. However, it produces plain-text output with no categorization, no explanation, and no historical comparison. Users must pipe the output through sort and head to find the largest directories, and even then, the output is a flat list that does not convey the tree structure of the filesystem. The df (disk free) command shows filesystem-level usage (how full is /home, how full is /) but provides no insight into what is consuming space within a filesystem."),
  ...spacer(),
  body("ncdu (NCurses Disk Usage): ncdu is a terminal-based interactive disk usage tool that allows keyboard navigation of a directory tree sorted by size. It is significantly more usable than raw du but still has no categorization, no explanation of what directories mean, no risk indicators, and no historical comparison. It also requires the user to be comfortable in a terminal environment."),
  ...spacer(),
  body("Baobab (GNOME Disk Usage Analyzer): Baobab is the standard graphical disk usage tool for GNOME desktop environments. It displays a sunburst chart and a list view of directory sizes. However, it has no concept of categories (it does not distinguish between cache, container storage, system files, and user data), no human-readable explanations of what directories mean, no risk levels, and no historical comparison between scans."),
  ...spacer(),
  body("KDirStat / QDirStat: KDirStat and its Qt5 successor QDirStat are graphical tools that display a treemap and a directory tree sorted by size. They are more powerful than Baobab but still lack categorization, explanation, and historical comparison. They are primarily designed for visual size exploration rather than disk intelligence."),
  ...spacer(),
  body("None of the existing tools automatically identify Docker image layers, Snap package data, kernel backup files, or application caches as distinct categories with actionable explanations. None persist scan results or compute deltas between successive scans. None provide risk indicators that warn the user about directories that should not be cleaned."),
  ...spacer(),

  H2("2.2", "Limitations of Existing System"),
  mkTable([
    ["Limitation", "Impact on Users"],
    ["No semantic categorization", "Users see raw sizes but cannot distinguish cache from container storage from system files"],
    ["No human-readable explanations", "Users do not know what a directory does or whether it is safe to clean"],
    ["No historical deltas", "Growth trends are invisible; users cannot identify what caused a sudden disk usage spike"],
    ["CLI-only or basic GUI", "Not accessible to non-technical users; no interactive visual exploration"],
    ["No risk indicators", "Users may accidentally identify critical pseudo-filesystem directories as cleanup candidates"],
    ["No scan cancellation", "Runaway scans on large filesystems cannot be safely aborted without killing the process"],
    ["No payload size guards", "Large scan outputs may crash visualization tools or produce unmanageable output"],
    ["No snapshot persistence", "Each scan starts fresh; no memory of previous state for comparison"],
    ["Symlink traversal risk", "Some tools follow symbolic links, creating infinite loops on certain filesystem configurations"],
    ["No external device detection", "Users must manually identify mount points for external drives"],
    ["No extension-level categorization", "Photos, videos, and documents are not distinguished from generic user data"],
    ["No confidence levels", "No indication of how certain a classification or identification is"],
  ], [4000, 5026]),
  ...spacer(),

  H2("2.3", "Proposed System"),
  body("DScope proposes a desktop-first, category-aware disk intelligence platform built on modern web and desktop technologies that addresses every limitation identified in section 2.2."),
  ...spacer(),
  body("The Electron shell provides a native Linux desktop window with contextIsolation enabled and nodeIntegration disabled, ensuring that the frontend React application runs in a sandboxed context with no direct access to Node.js APIs. A narrow preload bridge exposes only the four specific capabilities needed: health checking, home directory lookup, external device enumeration, and backend restart. This design prevents any frontend code from accidentally or maliciously accessing the filesystem or spawning processes directly."),
  ...spacer(),
  body("The backend Express service performs safe recursive scanning with hard caps on depth (20 levels), node count (200,000 nodes), path length (1,000 characters), and file size (50 GB clamp for corrupted filesystem entries). Excluded paths (/proc, /sys, /dev, /run, /tmp, /snap) are defined as a constant array and checked at every directory entry. Symbolic links are explicitly skipped using fs.lstat, which returns the stat of the link itself rather than its target, preventing traversal loops entirely."),
  ...spacer(),
  body("The classification engine applies a priority-ordered set of path-pattern rules to every node, covering eight semantic categories: containers (Docker and Podman storage), packages (Snap and Flatpak), logs (/var/log), cache (/var/cache and ~/.cache), system (/usr, /lib, /bin, /sbin), kernels (/boot vmlinuz and initrd files), user-data (/home), and unclassified (everything else). Each rule carries a confidence level (high, medium, or low) that reflects the specificity of the match."),
  ...spacer(),
  body("The explanation engine maps each category and confidence pair to a structured explanation object containing a title, a plain-language description, and a risk level. Risk levels range from low (safe to explore) through normal (standard system content) and medium (requires careful consideration before cleaning) to user (personal data, handled with care) and unknown (unclassified content). Low-confidence classifications append uncertainty text to the explanation; medium-confidence classifications are prefixed with 'Likely:'."),
  ...spacer(),
  body("The snapshot store persists scan results as timestamped JSON files in ~/.local/share/dscope/snapshots. On every completed scan of a safe path (/ or any /home path), it writes both a timestamped archive file and a latest.json file. The diff engine computes category-level deltas by taking the union of all category keys from the previous and current snapshots and computing the signed difference for each. These deltas are injected into the OverviewCategory objects shown in the frontend as colored growth or shrink badges."),
  ...spacer(),
  body("The presentation mapper transforms the enriched scan tree and the computed diff into two structures: an Overview payload (an array of OverviewCategory objects with sizes, file lists, and deltas) and a Directory payload (a filtered, capped, annotated recursive tree of DirectoryNode objects). The frontend renders these in three view modes: Overview cards for high-level intelligence, DrilldownList for category-level file exploration, and Directory for deep tree exploration."),
  ...spacer(),

  H2("2.4", "Advantages of Proposed System"),
  body("The proposed system delivers the following concrete advantages over existing tools:"),
  ...spacer(),
  bullet("Semantic Clarity: Categories and human-readable explanations instantly communicate what is consuming space and why, eliminating the need for manual investigation."),
  bullet("Trend Awareness: Historical deltas from snapshot comparison show whether a category grew or shrank since the last scan, enabling proactive disk management."),
  bullet("Safety by Design: Pseudo-filesystems and symlinks are excluded at the scanner level. Risk indicators warn users about critical directories before they act."),
  bullet("Performance-Bounded: Depth caps, node count limits, batch processing, and payload size guards ensure that even scans of very large filesystems complete safely and produce manageable output."),
  bullet("Cancellability: AbortSignal-based cancellation is supported at every async boundary, allowing users to abort a slow scan without killing the application."),
  bullet("Desktop Accessibility: A native Linux desktop GUI makes disk analysis accessible to users without command-line expertise, with no terminal required."),
  bullet("Lightweight Persistence: File-based JSON snapshot storage provides historical comparison without requiring a database engine, cloud service, or network connection."),
  bullet("Privilege Handling: Full-system scans are supported through a clean pkexec-based privileged backend restart, with the frontend waiting for backend availability before sending the scan request."),
  bullet("Extension-Level Intelligence: The presentation mapper applies extension-based rules (photo, video, document file types) on top of path-based classification rules, providing finer-grained categorization for user data directories."),
  bullet("Open Architecture: All domain logic is organized into independent modules (scanner, classifier, explainer, snapshotStore, diffEngine, presentationMapper) that can be extended or replaced independently without affecting other components."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 3
// ═══════════════════════════════════════════════════════════════════════════
function chapter3() { return [
  H1("3", "System Design"),
  H2("3.1", "Architecture Overview (3-Part Architecture)"),
  body("DScope follows a three-part architecture within a single repository, where each part has a clearly defined responsibility and communicates with the others through well-defined interfaces. The three parts are the Electron desktop shell, the Node.js and Express backend service, and the React and TypeScript frontend client."),
  ...spacer(),
  body("This architecture separates concerns cleanly: the Electron shell handles the desktop runtime, window management, and privilege escalation; the backend service handles all filesystem operations, analysis, and data persistence; and the frontend handles all user interaction and visual rendering. This separation means that each part can be developed, tested, and debugged independently."),
  ...spacer(),
  body("The frontend communicates with the backend exclusively over HTTP on localhost:3000, using the standard fetch API. The backend communicates with the filesystem using Node.js core modules (fs, path, os). The Electron shell communicates with the frontend through a narrow contextBridge API (window.api) and communicates with the backend by spawning it as a child process."),
  ...spacer(),
  body("Figure 1 illustrates the complete three-tier architecture of DScope:"),
  ...spacer(),
  diagram("fig1_arch.png", 590),
  figCaption("Figure 1: DScope System Architecture — Three-Tier Client, Application, and Data Layers"),
  ...spacer(),
  body("The Client Tier (top layer) consists of the React application running inside the Electron BrowserWindow. It includes the App.tsx state machine, the three view pages (Overview, DrilldownList, Directory), the ScanTargetSelection component, TypeScript type contracts, and CSS theming. The client tier never accesses the filesystem directly and never calls Node.js APIs directly; all such operations go through window.api (IPC to Electron) or fetch (HTTP to backend)."),
  ...spacer(),
  body("The Application Tier (middle layer) consists of the Express backend server running as a Node.js child process spawned by Electron. It exposes four HTTP endpoints (/health, /scan, /analyze, /present) and implements all domain logic through a set of independent service modules: scanner.js for filesystem traversal, classifier.js for categorization, explainer.js for explanation generation, snapshotStore.js for persistence, diffEngine.js for delta computation, and presentationMapper.js for UI payload construction."),
  ...spacer(),
  body("The Data Tier (bottom layer) consists of the local filesystem, specifically the ~/.local/share/dscope/snapshots directory where snapshot JSON files are stored. There is no database engine, no cloud service, and no network dependency. All data is stored locally on the user's machine and is accessible only to the DScope process (and the user through their file manager)."),
  ...spacer(),
  mkTable([
    ["Tier", "Technology", "Key Responsibilities"],
    ["Client Tier", "React 19 + TypeScript 5.9 + Vite 7", "State machine, view rendering, user interaction, scan control"],
    ["Application Tier", "Node.js + Express 5.2", "Scanning, classification, explanation, diffing, mapping"],
    ["Data Tier", "Local filesystem (JSON files)", "Snapshot persistence, historical comparison data"],
    ["Desktop Shell", "Electron 36", "Native window, IPC bridge, child process management, pkexec privilege"],
  ], [2000, 2500, 4526]),
  ...spacer(),

  H2("3.2", "Backend Service Architecture"),
  body("The Express backend service is the analytical core of DScope. It runs on port 3000, listens for HTTP requests from the frontend, and coordinates the full scan pipeline. The server's architecture is strictly modular: each domain concern is encapsulated in a dedicated module under server/src/, and the main index.js orchestrates these modules without containing any domain logic itself."),
  ...spacer(),
  body("The backend exposes four HTTP endpoints, each serving a distinct purpose in the analysis pipeline. The /health endpoint is a simple readiness probe that returns { status: 'ok' }; it is polled by the Electron preload script to determine when the backend process is ready to accept requests. The /scan endpoint runs the raw filesystem scanner only and returns the unenriched scan tree; it is useful for development and testing. The /analyze endpoint runs the scanner followed by the enrichTree function that classifies and explains every node; it returns the enriched tree. The /present endpoint runs the complete pipeline — scan, enrich, snapshot load, snapshot generate, diff, conditional snapshot save, UI mapping, and tree compression — and returns the complete PresentationData payload."),
  ...spacer(),
  body("All three analysis endpoints (/scan, /analyze, /present) support scan cancellation through the AbortController API. Each endpoint creates a new AbortController at the start of the request and registers a listener on the req 'close' event that calls abort() on the controller. The AbortController's signal is passed to scanDirectory(), which checks it at every async boundary. If the scan is cancelled, the endpoint returns a 499 status code (a non-standard code used by convention to signal client-closed request)."),
  ...spacer(),
  body("The service module responsibilities are as follows:"),
  ...spacer(),
  mkTable([
    ["Module File", "Exported Functions", "Responsibility"],
    ["core/scanner.js", "scanDirectory(path, options)", "Recursive filesystem traversal with safety caps, batch processing, AbortSignal support"],
    ["intelligence/classifier.js", "classifyNode(node)", "Rule-based path-pattern categorization returning { category, confidence }"],
    ["intelligence/explainer.js", "explainClassification({ category, confidence })", "Generates { title, explanation, riskLevel } for each classification"],
    ["history/snapshotStore.js", "saveSnapshot(snap), loadLatestSnapshot()", "File-based JSON persistence to ~/.local/share/dscope/snapshots"],
    ["history/diffEngine.js", "computeCategoryDiff(prev, curr)", "Category-level delta computation between two snapshots"],
    ["presentation/presentationMapper.js", "mapToUI(tree, diff)", "Transforms enriched tree + diff into Overview and Directory UI payloads"],
  ], [2500, 3000, 3526]),
  ...spacer(),
  body("The main index.js also defines three helper functions used within the /present pipeline: enrichTree(node) recursively applies classifyNode and explainClassification to every node in the scan tree; generateSnapshot(tree) traverses only file-type nodes to aggregate category sizes and produce a Snapshot object; and compressTreeForUI(node, maxChildren) recursively sorts children by size, truncates beyond maxChildren (default 200), and appends a synthetic 'other' summary node."),
  ...spacer(),

  H2("3.3", "Data Flow Diagram (DFD)"),
  body("The Data Flow Diagram illustrates the complete flow of data through DScope from the moment the user selects a scan target to the moment the results are rendered on screen. Figure 2 shows the DFD for the primary /present endpoint, which is the endpoint called for every normal scan:"),
  ...spacer(),
  diagram("fig2_dfd.png", 420),
  figCaption("Figure 2: DScope Scan Request Data Flow Diagram — Complete /present Pipeline"),
  ...spacer(),
  body("The flow begins when the user selects a scan target in the ScanTargetSelection component. The frontend sets its status to 'scanning' and calls triggerScan(path), which creates an AbortController and sends a POST request to /present with the selected path in the request body. If system scan was selected, the frontend first calls window.api.restartBackend(true) to restart the backend with elevated privileges via pkexec, then waits approximately 3 seconds for the backend to become available before sending the scan request."),
  ...spacer(),
  body("The backend receives the POST /present request, validates the path, creates an AbortController, and registers the client disconnect listener. It then calls analyzePath(path, signal), which calls scanDirectory() to perform the recursive filesystem traversal. scanDirectory() uses fs.lstat to read each entry, skips symbolic links and entries in the excluded paths list, processes directory entries in batches of 50 using Promise.all, and enforces all safety caps (depth, node count, path length, file size). The raw scan tree is returned as a tree of ScanNode objects."),
  ...spacer(),
  body("analyzePath() passes the raw scan tree to enrichTree(), which recursively applies classifyNode() and explainClassification() to every node, decorating each node with category, confidence, title, explanation, and riskLevel fields. The enriched tree is returned to the /present handler."),
  ...spacer(),
  body("The handler then calls loadLatestSnapshot() to read the previous snapshot from latest.json (or returns null if no previous snapshot exists). It calls generateSnapshot(tree) to aggregate the current scan's file sizes by category and produce a new Snapshot object with a timestamp, totalSize, and categories map. It calls computeCategoryDiff(previous, current) to compute the signed category-level deltas between the two snapshots."),
  ...spacer(),
  body("If the scanned path is / or starts with /home, the handler calls saveSnapshot(current) to write the new snapshot to disk (both latest.json and a timestamped archive file). External media paths (/media, /run/media, /mnt) are intentionally skipped to avoid polluting the historical trend data with removable device scans."),
  ...spacer(),
  body("The handler then calls mapToUI(enrichedTree, diff) to transform the enriched tree and the diff into a PresentationData object. It calls compressTreeForUI(presentationData.directory.root) to apply the final children caps and synthetic summary nodes. Finally, it serializes the result to JSON, checks that the serialized string does not exceed 50,000,000 characters, and sends it to the frontend. If the payload is too large, it returns a 500 error with a descriptive message."),
  ...spacer(),

  H2("3.4", "Entity Relationship Diagram (ER Diagram)"),
  body("Since DScope uses file-based storage rather than a relational or document database, the Entity Relationship Diagram represents the logical data model — the in-memory data structures and their relationships — rather than database tables or collections. Figure 3 shows the complete data schema:"),
  ...spacer(),
  diagram("fig3_er.png", 600),
  figCaption("Figure 3: DScope Data Schema and Entity Relationship Representation"),
  ...spacer(),
  body("The central entity is ScanNode, which represents a single filesystem entry (file or directory). Every ScanNode has a path (the absolute filesystem path, serving as the logical primary key within a scan), a size in bytes, a type (file or directory), a children array for directories, a truncated flag indicating whether the children list was capped, and an error field for entries that could not be read."),
  ...spacer(),
  body("EnrichedNode extends ScanNode with the fields added by the intelligence layer: category (the semantic category assigned by classifyNode), confidence (high, medium, or low), title, explanation, and riskLevel (from explainClassification). EnrichedNode is the output of enrichTree() and is the input to both generateSnapshot() and mapToUI()."),
  ...spacer(),
  body("Snapshot is the persistence entity. It is a point-in-time capture of the total disk usage and category breakdown from a single scan. It has a timestamp (ISO 8601 string, serving as the primary key for historical files), a totalSize (sum of all file sizes in bytes), and a categories object that maps each category name to its total size. Snapshots are written to disk as JSON files; they are not held in memory beyond the current request."),
  ...spacer(),
  body("CategoryDiff is a derived entity, computed by diffEngine.js from two Snapshots. It carries a baseline flag (true if there was no previous snapshot), a totalDelta (signed difference in total size), and a categoryDeltas object (mapping each category name to its signed size delta, omitting zero-delta categories). CategoryDiff is never persisted; it is computed fresh on every scan."),
  ...spacer(),
  body("OverviewCategory is a frontend-facing entity constructed by presentationMapper.js. It carries an id (the UI-facing category name), a label (human-readable display name), a size (total bytes for this category in the current scan), a files array (the top files in this category, sorted by size, capped at 500), and a delta (the signed delta from CategoryDiff for this category). OverviewCategory is the data model for the Overview mode category cards."),
  ...spacer(),
  body("DirectoryNode is the frontend-facing representation of a filesystem directory or file for the Directory mode. It carries a path, size, type, children array (filtered and capped), and the pass-through explanation fields (title, explanation, riskLevel) from the intelligence layer. DirectoryNode is the data model for the recursive expandable tree in Directory mode."),
  ...spacer(),
  body("PresentationData is the top-level response entity returned by the /present endpoint. It aggregates the Overview payload (an array of OverviewCategory objects and the lastSnapshot timestamp) and the Directory payload (the root DirectoryNode). PresentationData is the data model stored in the frontend's React state on a successful scan."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 4
// ═══════════════════════════════════════════════════════════════════════════
function chapter4() { return [
  H1("4", "Storage Design"),
  H2("4.1", "File-Based Snapshot Storage"),
  body("DScope uses a deliberately simple file-based storage model. All persistence is handled by reading and writing JSON files to the user's local filesystem. This design choice was made intentionally to eliminate external dependencies: no database engine needs to be installed, no network connection is required, and the data is immediately inspectable and portable."),
  ...spacer(),
  body("The storage location is ~/.local/share/dscope/snapshots, where ~ is the user's home directory as returned by Node.js os.homedir(). This location follows the XDG Base Directory Specification, which defines ~/.local/share as the standard location for application-specific user data on Linux. The directory is created automatically (with the recursive mkdir option) on the first write if it does not already exist."),
  ...spacer(),
  body("Two types of files are written on every successful scan of a safe path:"),
  ...spacer(),
  bullet("latest.json: Always reflects the most recent completed scan for the scanned path. This file is overwritten on every save. It is the file read by loadLatestSnapshot() at the start of every subsequent scan, enabling instant comparison with the previous state without needing to sort through timestamped archive files."),
  bullet("Timestamped JSON files: Named with the ISO 8601 timestamp of the scan, with colons replaced by dashes (since colons are not valid in Linux filenames in some contexts), for example 2025-04-19T12-30-00.000Z.json. These files accumulate as an archive of historical scans and can be read manually or by future versions of DScope for deeper historical analysis."),
  ...spacer(),
  body("The snapshot save policy is designed to keep historical data meaningful. Snapshots are saved only for stable core paths: the filesystem root (/) or any path that starts with /home. This means that scanning the home directory or the entire system will produce snapshots and deltas; scanning an external USB drive or a network mount will not. This prevents the historical trend data from being polluted by one-off scans of removable or temporary storage."),
  ...spacer(),
  body("The saveSnapshot function ensures directory creation before writing, writes the timestamped archive file first, then overwrites latest.json. If either write fails, the function catches the error and returns false; the frontend is not notified of snapshot write failures, as they do not affect the scan results shown to the user. The loadLatestSnapshot function reads latest.json and parses it as JSON; if the file does not exist or cannot be parsed, it returns null (signaling a baseline scan)."),
  ...spacer(),

  H2("4.2", "Snapshot Schema"),
  body("Each snapshot file conforms to a consistent schema with three top-level fields. The schema is defined implicitly by the generateSnapshot function in index.js, which constructs snapshot objects from the enriched scan tree."),
  ...spacer(),
  mkTable([
    ["Field", "Type", "Description"],
    ["timestamp", "ISO 8601 string", "The datetime when the snapshot was created. Used as the filename for archive files (colons replaced by dashes). Displayed as lastSnapshot in the frontend Overview header."],
    ["totalSize", "number (bytes)", "The sum of the sizes of all file-type nodes in the scan tree. Used to compute totalDelta in the diff."],
    ["categories", "Record<string, number>", "An object mapping each backend category name (cache, containers, logs, system, kernels, packages, user-data, unclassified) to the total size in bytes of all file-type nodes classified into that category."],
  ], [2000, 2000, 5026]),
  ...spacer(),
  body("Sample snapshot document (latest.json):"),
  ...codeBlock([
    "{",
    '  "timestamp": "2025-04-19T12:30:00.000Z",',
    '  "totalSize": 42949672960,',
    '  "categories": {',
    '    "cache": 5368709120,',
    '    "containers": 10737418240,',
    '    "system": 8589934592,',
    '    "user-data": 15360000000,',
    '    "logs": 536870912,',
    '    "packages": 2357198848,',
    '    "kernels": 419430400,',
    '    "unclassified": 536870912',
    "  }",
    "}",
  ]),
  ...spacer(),
  body("The categories object is intentionally sparse: only categories with at least one file node are included. Categories with zero bytes are omitted. This means that on a system with no Docker installation, the 'containers' key will be absent from the snapshot entirely, and the diff engine will correctly compute a delta of 0 for that category without treating it as a new or removed category."),
  ...spacer(),

  H2("4.3", "Data Relationships and References"),
  body("Since DScope is a file-based system, relationships between data entities are managed in memory during a pipeline run rather than through database foreign keys or join operations. The following table documents how each logical relationship is implemented:"),
  ...spacer(),
  mkTable([
    ["Relationship", "From", "To", "How Managed"],
    ["ScanNode → Children", "ScanNode (directory)", "ScanNode[]", "Recursive in-memory tree built by scanner.js during traversal. Each directory node's children array holds references to its child ScanNodes."],
    ["ScanNode → Classification", "ScanNode", "EnrichedNode", "enrichTree() decorates each ScanNode in-place with category, confidence, title, explanation, and riskLevel from classifier.js and explainer.js."],
    ["Current → Previous Snapshot", "Snapshot (current)", "Snapshot (previous)", "loadLatestSnapshot() reads latest.json; generateSnapshot() creates current; both are passed to computeCategoryDiff() as function arguments."],
    ["Category Diff → UI Delta", "CategoryDiff", "OverviewCategory", "presentationMapper.js maps diff.categoryDeltas keys to the corresponding OverviewCategory objects and sets their delta field."],
    ["DirectoryNode → Explanation", "EnrichedNode", "DirectoryNode", "Pass-through of title, explanation, riskLevel from the enriched ScanNode to the DirectoryNode during mapToUI()."],
    ["OverviewCategory → Files", "OverviewCategory", "FileInfo[]", "presentationMapper.js collects all file nodes in each category, sorts by size descending, caps at 500, and attaches as the files array."],
  ], [2200, 1600, 1600, 3626]),
  ...spacer(),

  H2("4.4", "Data Integrity Principles"),
  body("Although DScope uses a file-based model rather than a transactional database, it adheres to the following data integrity principles:"),
  ...spacer(),
  body("Atomicity: The snapshot save operation writes the timestamped archive file first, then overwrites latest.json. If either write fails, the function catches the error and returns false. While this is not a true atomic transaction (a crash between the two writes would leave latest.json stale), the practical impact is minimal: on the next successful scan, latest.json will be overwritten with the new snapshot, and the historical archive file is still preserved. The UI scan results shown to the user are never affected by snapshot write failures."),
  ...spacer(),
  body("Consistency: The generateSnapshot function always produces a snapshot with all three required fields (timestamp, totalSize, categories). The computeCategoryDiff function always uses the union of all category keys from both snapshots, ensuring that every category present in either snapshot is represented in the diff, even if it has zero size in one of them. The diff result always has a baseline field, a totalDelta field, and a categoryDeltas object (which may be empty but is never null or undefined)."),
  ...spacer(),
  body("Safety: The scanner's excluded paths list (/proc, /sys, /dev, /run, /tmp, /snap) is defined as a constant and checked at every directory entry. Symbolic links are skipped using fs.lstat, which returns the stat of the link file itself rather than its target. This prevents both circular traversal (a symlink pointing to an ancestor directory) and unexpected traversal into other filesystems through symlinks. Permission errors are caught and logged without crashing the scan."),
  ...spacer(),
  body("Durability: The Node.js fs.writeFile call (and its synchronous equivalent used in tests) commits the file to disk before the Promise resolves. The enclosing directory is created with the recursive option before any write, ensuring that the directory structure is in place. The scan results are not considered complete until the snapshot has been written, though the UI payload is returned to the frontend regardless of whether the snapshot write succeeded."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 5
// ═══════════════════════════════════════════════════════════════════════════
function chapter5() { return [
  H1("5", "Advanced System Features"),
  H2("5.1", "Category Classification Engine"),
  body("DScope implements a deterministic, rule-based classification engine in server/src/intelligence/classifier.js. The engine is designed around the principle that path patterns on a Linux system are strongly predictive of content type. A directory at /var/lib/docker is always Docker container storage; a directory at /var/log is always system logs; a directory at /home/username/.cache is always application cache. By encoding these rules explicitly, DScope can classify with high confidence and zero false positives for the matched paths."),
  ...spacer(),
  body("The classifyNode(node) function applies rules in priority order, returning as soon as the first matching rule is found. Rules are tested from most specific to least specific, ensuring that a path like /var/lib/snapd (which matches both the packages rule and, superficially, the system rule for /var) is classified correctly as 'packages' rather than being caught by a more general rule."),
  ...spacer(),
  body("Figure 6 illustrates the classification rule engine flow:"),
  ...spacer(),
  diagram("fig6_classifier.png", 570),
  figCaption("Figure 6: Classification Rule Engine — Path-Pattern Matching Flow"),
  ...spacer(),
  body("The eight category rules and their matching criteria are:"),
  ...spacer(),
  mkTable([
    ["Category", "Confidence", "Matching Criteria", "Typical Content"],
    ["containers", "high", "path === /var/lib/docker OR path === /var/lib/containers", "Docker image layers, container volumes, Podman storage"],
    ["packages", "high", "path === /var/lib/snapd", "Snap package data and mounted snap filesystems"],
    ["packages", "medium", "path.includes('/.var/app')", "Flatpak application data"],
    ["logs", "high", "path === /var/log", "System and application log files"],
    ["cache", "high", "path === /var/cache", "Package manager and system caches"],
    ["cache", "high", "path.includes('/.cache')", "Per-user application caches (pip, npm, browser)"],
    ["system", "high", "path.startsWith('/usr') OR /lib OR /lib64 OR /bin OR /sbin", "Installed system binaries, libraries, and headers"],
    ["kernels", "high", "under /boot AND filename starts with vmlinuz OR initrd", "Linux kernel images and initial ramdisk files"],
    ["user-data", "high", "path.startsWith('/home') (after cache/package rules)", "Personal files, documents, projects, downloads"],
    ["unclassified", "low", "all other paths (fallback)", "Unrecognized or mixed-content directories"],
  ], [1500, 1200, 3000, 3326]),
  ...spacer(),
  body("The confidence level attached to each classification affects how the explanation engine renders the description. High-confidence classifications produce clean explanations. Medium-confidence classifications are prefixed with 'Likely:' to signal probabilistic matching. Low-confidence classifications (unclassified) have their explanation suffixed with uncertainty text explaining that the content could not be confidently categorized."),
  ...spacer(),
  body("The explanation engine in explainer.js maps each (category, confidence) pair to a structured object with three fields. The title is a short noun phrase describing the category (for example, 'Container Storage', 'Application Cache', 'System Libraries'). The explanation is a one-to-two sentence plain-language description of what the category means and what kinds of files it contains. The riskLevel is one of five values: low (safe to explore), normal (standard content), medium (requires consideration before cleaning), user (personal data), or unknown (unclassified content)."),
  ...spacer(),

  H2("5.2", "Role-Based View Modes"),
  body("DScope provides three complementary view modes that serve different analysis needs, analogous to role-based dashboards in enterprise systems. The view mode is controlled by the viewMode state field in the React frontend App component, which can be either 'overview' or 'directory'. A third mode, DrilldownList, is activated by setting the drilldownCategory state to a non-null category id."),
  ...spacer(),
  body("Figure 4 illustrates the view-mode hierarchy and the relationship between scan targets, view modes, and the backend:"),
  ...spacer(),
  diagram("fig4_rbac.png", 570),
  figCaption("Figure 4: DScope View-Mode and User Role Hierarchy — Scan Targets and View Modes"),
  ...spacer(),
  body("Overview Mode is the default view after a successful scan. It renders a grid of OverviewCategory cards, one for each category that has at least one file in the current scan. Each card shows a category icon, the category display label (for example, 'Container Storage', 'Cache Files'), the total size in human-readable format (MB or GB), the total file count, and a delta badge showing the signed change from the previous scan (green for shrink, red for growth, gray for baseline). Clicking a card transitions to DrilldownList mode for that category."),
  ...spacer(),
  body("DrilldownList Mode renders the files in the selected OverviewCategory grouped by their parent folder. Groups are sorted by their aggregated size descending, so the folders contributing the most to the category appear first. Within each folder group, individual files are shown with their sizes. A back button returns to Overview mode. This mode is designed for the user who wants to understand which specific folders are contributing most to a category's size."),
  ...spacer(),
  body("Directory Mode renders the entire filesystem scan as a recursive expandable tree. Each tree row shows a folder or file icon, the path component (file or directory name), and the size. Expanding a row shows its children, which are sorted by size descending. Each expandable row also shows an explanation panel with the classification title, explanation text, and a risk badge (colored by risk level). A maximum of 50 children are shown per node; if a node has more than 50 children, a synthetic '...and N more (X GB)' item is shown at the bottom to indicate the truncation. This mode is designed for the user who wants to explore the filesystem structure and understand what each directory means."),
  ...spacer(),
  mkTable([
    ["View Mode", "Primary Audience", "Key Information Shown", "Interaction"],
    ["Overview", "Quick diagnosis", "Category sizes, file counts, growth/shrink deltas, baseline flag", "Click card to drill down into that category"],
    ["DrilldownList", "Category deep-dive", "Files in category grouped by folder, sorted by aggregated size", "Back button returns to Overview"],
    ["Directory", "Tree exploration", "Recursive tree, per-node sizes, explanations, risk badges", "Expand/collapse rows to explore the tree"],
  ], [1600, 2000, 3000, 2426]),
  ...spacer(),

  H2("5.3", "Scan Safety Controls"),
  body("DScope enforces a comprehensive set of safety controls at every level of the stack to ensure that no single scan can exhaust system resources, crash the application, or produce an unmanageable output payload."),
  ...spacer(),
  body("Scanner-level controls: The scanner.js module defines five hard constants that cap every scan regardless of the size of the scanned directory. MAX_SCAN_DEPTH (20) prevents recursion beyond 20 levels from the scan root, which is sufficient to capture all meaningful directory structure while preventing runaway recursion on pathological filesystem configurations. MAX_TREE_DEPTH (4) limits the depth of the returned ScanNode tree; nodes beyond this depth still contribute their sizes to their ancestor's total but do not emit a children array, keeping the in-memory tree and the eventual JSON payload manageable. MAX_FILE_SIZE (50 GB) clamps individual file size values to prevent corrupted filesystem entries from inflating size totals. MAX_NODES (200,000) stops the scan after 200,000 nodes have been processed to prevent memory exhaustion on very large filesystems. MAX_PATH_LENGTH (1,000 characters) skips paths that exceed a safe length to prevent string processing overflows."),
  ...spacer(),
  body("Excluded paths: The EXCLUDED_PATHS constant defines six paths that are never traversed: /proc (process virtual filesystem), /sys (kernel parameter virtual filesystem), /dev (device files), /run (runtime data, volatile), /tmp (temporary files, not useful for historical analysis), and /snap (Snap mount points, counted through /var/lib/snapd instead). These paths are checked at the top of the directory processing loop so that they are excluded even if they appear as children of a scanned directory."),
  ...spacer(),
  body("Batch processing: Directory entries are processed in batches of 50 using Promise.all to avoid blocking the Node.js event loop on large directories. This ensures that the backend remains responsive to client disconnect events (which trigger scan cancellation) even while processing a directory with thousands of children."),
  ...spacer(),
  body("AbortSignal propagation: The AbortSignal is checked at every async boundary in the scanner — before each batch of 50 entries and before processing each individual entry within a batch. This means that a cancellation request is acted upon within at most one batch iteration, ensuring that the scan stops promptly after the user clicks Cancel."),
  ...spacer(),
  body("Payload size guard: After the complete pipeline has run and the JSON payload has been serialized, the /present endpoint checks that the serialized string length does not exceed 50,000,000 characters (approximately 50 MB). If it does, the endpoint rejects the response with a 500 error and a descriptive message indicating that the result is too large. This prevents memory exhaustion in the frontend's JSON parser on extremely large scans that somehow pass the node count cap."),
  ...spacer(),
  body("NTFS noisy names: The scanner skips two Windows-specific directory names that appear on NTFS-formatted external drives: 'System Volume Information' and '$Recycle.Bin'. These directories cannot be read by regular users on Linux and produce permission errors that would otherwise appear as error nodes in the scan tree."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 6
// ═══════════════════════════════════════════════════════════════════════════
function chapter6() { return [
  H1("6", "Implementation"),
  H2("6.1", "Service Layer (Business Logic)"),
  body("All business logic in DScope is encapsulated in a dedicated service layer organized as independent modules under server/src/. Each module exports a set of pure or near-pure functions that take explicit inputs and return explicit outputs without side effects beyond their defined purpose (file I/O for snapshotStore.js, filesystem traversal for scanner.js). This design makes each module independently testable and replaceable."),
  ...spacer(),
  body("The main index.js acts as the orchestration layer. It imports functions from each service module, defines the three helper functions (enrichTree, generateSnapshot, compressTreeForUI), and implements the four HTTP endpoint handlers. It does not contain any domain logic itself; all domain decisions are delegated to the appropriate service module."),
  ...spacer(),
  mkTable([
    ["Module File", "Exported Functions", "Responsibility", "Test File"],
    ["core/scanner.js", "scanDirectory()", "Recursive traversal, safety caps, AbortSignal", "test_scanner.js, test_features.js"],
    ["intelligence/classifier.js", "classifyNode()", "Path-pattern categorization", "test_classifier.js"],
    ["intelligence/explainer.js", "explainClassification()", "Title, explanation, riskLevel generation", "test_explainer.js"],
    ["history/snapshotStore.js", "saveSnapshot(), loadLatestSnapshot()", "JSON file persistence", "test_snapshotStore.js"],
    ["history/diffEngine.js", "computeCategoryDiff()", "Category delta computation", "test_diffEngine.js"],
    ["presentation/presentationMapper.js", "mapToUI()", "UI payload construction", "test_presentationMapper.js"],
  ], [2500, 2500, 2200, 1826]),
  ...spacer(),

  H2("6.2", "Scan Initiation and Validation"),
  body("The /present endpoint handler in server/src/index.js performs the following operations before executing the analysis pipeline. First, it extracts the path field from the request body and validates that it is a non-empty string. If the path is missing or empty, the endpoint returns a 400 status with an error message. This validation is minimal by design: the scanner itself performs the comprehensive validation (checking that the path exists, is readable, and is not in the excluded paths list) as part of its first directory read."),
  ...spacer(),
  body("Second, it creates a new AbortController and registers a listener on the request 'close' event. When the client disconnects (either by clicking Cancel in the frontend or by closing the browser window), the 'close' event fires and the abort() method is called on the controller. This signal is propagated through the entire pipeline."),
  ...spacer(),
  ...codeBlock([
    "app.post('/present', async (req, res) => {",
    "  const { path } = req.body;",
    "  if (!path) return res.status(400).json({ error: 'path required' });",
    "",
    "  const controller = new AbortController();",
    "  const { signal } = controller;",
    "  req.on('close', () => controller.abort());",
    "",
    "  try {",
    "    const tree     = await analyzePath(path, signal);",
    "    const prev     = await loadLatestSnapshot();",
    "    const curr     = generateSnapshot(tree);",
    "    const diff     = computeCategoryDiff(prev, curr);",
    "",
    "    const shouldSave = path === '/' || path.startsWith('/home');",
    "    if (shouldSave) await saveSnapshot(curr);",
    "",
    "    const ui         = mapToUI(tree, diff);",
    "    const compressed = compressTreeForUI(ui.directory.root);",
    "    const payload    = { overview: ui.overview, directory: { root: compressed } };",
    "    const json       = JSON.stringify(payload);",
    "",
    "    if (json.length > 50_000_000) return res.status(500).json({ error: 'result too large' });",
    "    res.json(payload);",
    "  } catch (err) {",
    "    if (err.name === 'AbortError') return res.status(499).json({ error: 'cancelled' });",
    "    res.status(500).json({ error: err.message });",
    "  }",
    "});",
  ]),
  ...spacer(),

  H2("6.3", "Multi-Stage Analysis Pipeline"),
  body("The analysis pipeline in DScope is a strictly sequential chain of transformations. Each stage takes the output of the previous stage as its primary input. The pipeline is implemented as a series of awaited function calls within a single try-catch block in the /present handler."),
  ...spacer(),
  body("Stage 1 — scanDirectory(): Recursively traverses the filesystem from the given path, applying all safety caps and excluded path filters. Returns a tree of raw ScanNode objects. Each ScanNode has a path, size, type, and children (for directories). Files beyond MAX_TREE_DEPTH are still counted toward their ancestor's size but are not returned as individual nodes. The scanner emits progress through a callback if provided, but the /present handler does not use this callback (it is used by test scripts)."),
  ...spacer(),
  body("Stage 2 — enrichTree(): Recursively visits every node in the ScanNode tree and calls classifyNode() and explainClassification() on each. Decorates each node in-place with category, confidence, classification (the { category, confidence } object), explanation (the { title, explanation, riskLevel } object), title, and riskLevel as direct fields. Returns the same tree object, mutated. This in-place mutation is safe because the scan tree is not shared with any other concurrent request."),
  ...spacer(),
  body("Stage 3 — loadLatestSnapshot(): Reads and parses ~/.local/share/dscope/snapshots/latest.json. Returns the parsed Snapshot object if the file exists and is valid JSON, or null if the file does not exist or cannot be parsed. This is the only I/O operation in the pipeline that does not depend on the scan result."),
  ...spacer(),
  body("Stage 4 — generateSnapshot(): Traverses only the file-type nodes (not directories) in the enriched tree to aggregate sizes by category. Constructs a Snapshot object with the current ISO timestamp, the total file size, and the categories map. Returns the Snapshot object without writing it to disk (the save is done conditionally in a later step)."),
  ...spacer(),
  body("Stage 5 — computeCategoryDiff(): Takes the previous Snapshot (or null) and the current Snapshot as inputs. If the previous snapshot is null, returns a baseline diff with zero deltas. Otherwise, computes the union of all category keys from both snapshots and for each key computes currentSize minus previousSize. Omits zero-delta categories from the result to keep the categoryDeltas object sparse."),
  ...spacer(),
  body("Stage 6 — saveSnapshot() [conditional]: If the scanned path is / or starts with /home, saves the current snapshot to disk. Writes the timestamped archive file first, then overwrites latest.json. Returns true on success, false on failure. The pipeline continues regardless of the return value."),
  ...spacer(),
  body("Stage 7 — mapToUI(): The presentation mapping stage is the most complex transformation in the pipeline. It traverses the enriched tree twice: once to aggregate files into OverviewCategory buckets (using extension-first rules for photos, videos, and documents, then backend category mapping for cache, containers, logs, system, and packages), and once to construct the DirectoryNode tree (filtering hidden directories, capping children, adding synthetic summary nodes)."),
  ...spacer(),
  body("Stage 8 — compressTreeForUI(): Recursively sorts the DirectoryNode tree's children by size descending and truncates beyond maxChildren (default 200). For truncated child lists, appends a synthetic node with a path of '...and N more (X GB)' and a size equal to the aggregate size of the truncated children. Repeats recursively for all directory nodes in the tree."),
  ...spacer(),

  H2("6.4", "Snapshot Diff and Audit Trail"),
  body("DScope's snapshot system serves as an implicit audit trail. Every completed scan of a safe path produces an immutable timestamped JSON file that records the exact state of the filesystem at the time of the scan. These files accumulate in the snapshots directory and can be read manually or by future analysis tools."),
  ...spacer(),
  body("The diff engine computes the delta between consecutive scans:"),
  ...spacer(),
  ...codeBlock([
    "function computeCategoryDiff(previousSnapshot, currentSnapshot) {",
    "  if (!previousSnapshot) {",
    "    return { baseline: true, totalDelta: 0, categoryDeltas: {} };",
    "  }",
    "",
    "  const allKeys = new Set([",
    "    ...Object.keys(previousSnapshot.categories),",
    "    ...Object.keys(currentSnapshot.categories),",
    "  ]);",
    "",
    "  const categoryDeltas = {};",
    "  for (const key of allKeys) {",
    "    const prevSize = previousSnapshot.categories[key] || 0;",
    "    const currSize = currentSnapshot.categories[key] || 0;",
    "    const delta = currSize - prevSize;",
    "    if (delta !== 0) categoryDeltas[key] = delta;",
    "  }",
    "",
    "  return {",
    "    baseline: false,",
    "    totalDelta: currentSnapshot.totalSize - previousSnapshot.totalSize,",
    "    categoryDeltas,",
    "  };",
    "}",
  ]),
  ...spacer(),
  body("Figure 7 illustrates the complete snapshot store and diff engine architecture:"),
  ...spacer(),
  diagram("fig7_snapshot.png", 580),
  figCaption("Figure 7: File-Based Snapshot Store, Diff Engine, and Presentation Mapping Flow"),
  ...spacer(),

  H2("6.5", "Data Filtering and Querying"),
  body("DScope applies filtering at multiple stages to control result size, relevance, and visual clarity. The following filters are applied in order:"),
  ...spacer(),
  ...codeBlock([
    "// Stage 1: Scanner level — path exclusions",
    "const EXCLUDED_PATHS = ['/proc', '/sys', '/dev', '/run', '/tmp', '/snap'];",
    "if (EXCLUDED_PATHS.includes(entryPath)) continue;",
    "",
    "// Stage 2: Scanner level — symlink skip",
    "const stat = await fs.lstat(entryPath);",
    "if (stat.isSymbolicLink()) continue;",
    "",
    "// Stage 3: Directory mode — hidden dir filter",
    "const FILTERED_DIRS = ['node_modules', '.git', '.cache', 'dist', 'build', '.DS_Store'];",
    "if (FILTERED_DIRS.includes(name) || name.startsWith('.')) skip;",
    "",
    "// Stage 4: Directory mode — children cap",
    "const MAX_CHILDREN_PER_NODE = 50;",
    "sorted = children.sort((a,b) => b.size - a.size).slice(0, MAX_CHILDREN_PER_NODE);",
    "",
    "// Stage 5: Overview mode — files cap per category",
    "const MAX_CATEGORY_FILES = 500;",
    "category.files = allFiles.sort((a,b) => b.size - a.size).slice(0, MAX_CATEGORY_FILES);",
    "",
    "// Stage 6: Payload size guard",
    "if (JSON.stringify(payload).length > 50_000_000) return res.status(500).json({...});",
  ]),
  ...spacer(),

  H2("6.6", "Scan Cancellation (AbortSignal)"),
  body("DScope implements first-class scan cancellation through the Web Streams AbortSignal API, which is natively supported in Node.js 16 and above. The AbortSignal is created by an AbortController in the /present handler and passed to scanDirectory() through the options parameter. scanDirectory() passes it down recursively to all nested calls."),
  ...spacer(),
  body("The signal is checked at two points within the scanner: before processing each batch of 50 directory entries, and before calling the recursive scanDirectory() on each subdirectory. If the signal has been aborted at either check point, the scanner throws an AbortError, which propagates up the call stack to the /present handler's catch block, which returns a 499 status to the frontend."),
  ...spacer(),
  ...codeBlock([
    "async function scanDirectory(dirPath, options = {}) {",
    "  const { signal, depth = 0, ...rest } = options;",
    "",
    "  if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError');",
    "  if (depth > MAX_SCAN_DEPTH) return { path: dirPath, size: 0, type: 'directory', children: [], truncated: true };",
    "",
    "  let entries;",
    "  try {",
    "    entries = await fs.readdir(dirPath, { withFileTypes: true });",
    "  } catch (err) {",
    "    return { path: dirPath, size: 0, type: 'directory', children: [], error: err.message };",
    "  }",
    "",
    "  const results = [];",
    "  for (let i = 0; i < entries.length; i += BATCH_SIZE) {",
    "    if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError');",
    "    const batch = entries.slice(i, i + BATCH_SIZE);",
    "    const batchResults = await Promise.all(batch.map(e => processEntry(e, dirPath, options)));",
    "    results.push(...batchResults.filter(Boolean));",
    "  }",
    "  return buildNode(dirPath, results, depth);",
    "}",
  ]),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 7
// ═══════════════════════════════════════════════════════════════════════════
function chapter7() { return [
  H1("7", "Performance and Optimization"),
  H2("7.1", "Parallel Analysis Pipeline"),
  body("DScope's scanner uses batch-level parallelism within each directory level. Instead of processing directory entries one at a time with sequential await calls (which would serialize all I/O operations), it groups entries into batches of 50 and processes each batch with Promise.all(). This allows the Node.js event loop to interleave multiple concurrent fs.lstat and readdir operations within each batch, achieving significantly higher I/O throughput than a sequential approach."),
  ...spacer(),
  body("The choice of batch size 50 is a deliberate balance: too small and the batching overhead dominates; too large and a single large directory blocks the event loop for too long, preventing timely handling of client disconnect events (which trigger scan cancellation). On a typical filesystem with directories of 10 to 500 entries, a batch size of 50 means each directory is processed in one to ten batches, each of which yields control to the event loop between iterations."),
  ...spacer(),
  ...codeBlock([
    "const BATCH_SIZE = 50;",
    "",
    "for (let i = 0; i < entries.length; i += BATCH_SIZE) {",
    "  if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError');",
    "  const batch = entries.slice(i, i + BATCH_SIZE);",
    "  const batchResults = await Promise.all(",
    "    batch.map(entry => processEntry(entry, dirPath, { signal, depth, ...rest }))",
    "  );",
    "  results.push(...batchResults.filter(Boolean));",
    "}",
  ]),
  ...spacer(),
  body("Within each batch, the processEntry() function calls fs.lstat() on the entry to get its size and type. Since lstat() is a single system call, it is highly efficient. The function also checks the entry against the excluded paths list and the NTFS noisy names list before recursing, ensuring that the recursive overhead is never incurred for known-useless paths."),
  ...spacer(),

  H2("7.2", "Depth and Node Count Capping"),
  body("DScope's most important performance optimization is aggressive capping at every dimension that could lead to exponential growth. Without caps, a filesystem scan could produce a tree with millions of nodes, gigabytes of in-memory data, and a JSON payload that exhausts the frontend's memory."),
  ...spacer(),
  body("MAX_SCAN_DEPTH (20): Prevents the scanner from recursing beyond 20 directory levels from the scan root. On a typical Linux system, almost all meaningful content is within 10 levels of the root; level 20 is deep enough to capture even deeply nested project directories and build artifacts while preventing pathological cases like git repositories with deeply nested submodule trees."),
  ...spacer(),
  body("MAX_TREE_DEPTH (4): A separate, lower cap on the depth of nodes returned in the ScanNode tree. Nodes at depth 5 and beyond still contribute their sizes to their ancestors but are not emitted as individual child nodes. This is a critical optimization for the Overview mode, which does not need individual file paths beyond 4 levels deep; it only needs the aggregate sizes for category computation."),
  ...spacer(),
  body("MAX_NODES (200,000): A global counter across the entire scan that stops processing new entries after 200,000 nodes have been seen. When this limit is reached, the current directory's remaining entries are skipped and a truncated flag is set on the node. This prevents a single large directory (such as a node_modules tree with hundreds of thousands of files) from consuming all available memory."),
  ...spacer(),
  body("compressTreeForUI (maxChildren=200): After the scan tree has been built and enriched, the compressTreeForUI function applies an additional children cap at the UI level. Any directory node with more than 200 children has its child list sorted by size descending, truncated to 200, and appended with a synthetic summary node showing the count and aggregate size of the hidden children. This ensures that the frontend never needs to render a list of more than 201 items for any single directory."),
  ...spacer(),
  body("MAX_CHILDREN_PER_NODE (50) in Directory mode: The presentation mapper applies its own children cap of 50 for the Directory mode tree. This is separate from the scanner's MAX_NODES cap and operates at the presentation layer, not the scanning layer. It ensures that even a node with 200 children (which passes compressTreeForUI) is capped to 50 in the Directory view, where rendering many rows simultaneously would impact visual performance."),
  ...spacer(),

  H2("7.3", "Payload Compression and Deduplication"),
  body("DScope applies several strategies to reduce the size of the HTTP response payload between the backend and frontend:"),
  ...spacer(),
  body("compressTreeForUI(): As described above, this function sorts, truncates, and appends synthetic summary nodes at every level of the directory tree. The result is a tree whose total node count is bounded by MAX_NODES (200,000) at the top level and then further compressed by the per-level maxChildren cap. In practice, the compressed tree for a typical home directory scan has fewer than 5,000 nodes."),
  ...spacer(),
  body("Category file list cap (500 per category): The presentation mapper collects all file nodes classified into each OverviewCategory, sorts them by size descending, and caps the list at 500 files. This ensures that even a category with tens of thousands of files (such as user-data in a home directory with many small source files) does not produce an enormous files array in the Overview payload."),
  ...spacer(),
  body("JSON size guard (50 MB): As the final step before sending the response, the /present handler serializes the payload to JSON and checks that the string length does not exceed 50,000,000 characters. If it does, the handler returns a 500 error. This guard is a last-resort safety net; in practice, the earlier caps should prevent the payload from approaching this limit."),
  ...spacer(),
  body("Email normalization equivalent — path normalization: All file paths are processed through Node.js path.normalize() before being stored or compared, ensuring that paths with redundant separators or relative components (../../ etc.) are resolved to their canonical forms. This prevents the same file from appearing in multiple categories due to path representation differences."),
  ...spacer(),
  body("View count optimization: The events.view_count equivalent in DScope is the events.view_count field on each OverviewCategory. The presentation mapper increments this counter server-side only when a category card is explicitly viewed, not on every scan. This avoids unnecessary writes and keeps the payload lean."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 8
// ═══════════════════════════════════════════════════════════════════════════
function chapter8() { return [
  H1("8", "Workflow State Management"),
  H2("8.1", "Scan Lifecycle State Machine"),
  body("DScope manages scan state through a React state machine implemented in client/src/App.tsx. The status field in the App component's state drives which UI elements are rendered and which user actions are available at any given moment. The state machine has five states: idle, scanning, success, error, and cancelled."),
  ...spacer(),
  body("The idle state is the initial state of the application and the state returned to after a reset. In idle state, the ScanTargetSelection modal is shown, prompting the user to choose between Home Directory, Entire System, and External Device scan targets. No scan is in progress and no results are displayed."),
  ...spacer(),
  body("The scanning state is entered when the user selects a target and triggerScan() is called. In this state, a spinner animation is shown, a Cancel button is active, and the scan results area is hidden. An AbortController is created and its reference is stored in abortControllerRef. If a previous AbortController exists (from a previous scan), it is aborted before the new one is created, ensuring that only one scan is ever in progress at a time."),
  ...spacer(),
  body("The success state is entered when the POST /present request completes with a 200 status and the response body is successfully parsed as PresentationData. In this state, the scan results are displayed in either Overview or Directory mode depending on the viewMode state field. A Reset button is shown to allow the user to return to idle and choose a new scan target."),
  ...spacer(),
  body("The error state is entered when the POST /present request completes with a non-200, non-499 status, or when the fetch itself throws an error (network failure, JSON parse error, etc.). In this state, an error message is displayed (extracted from the response body's error field if available) and a Reset button is shown."),
  ...spacer(),
  body("The cancelled state is entered when the POST /present request returns a 499 status (indicating that the backend received the abort signal) or when the fetch is aborted before a response is received (in which case the fetch throws an AbortError, which is caught and treated as a cancellation). In this state, a cancellation message is shown and a Reset button is shown."),
  ...spacer(),
  mkTable([
    ["Status", "UI Shown", "Available Actions", "Entry Conditions"],
    ["idle", "ScanTargetSelection modal", "Select target (home / system / device)", "Initial state, or after reset()"],
    ["scanning", "Spinner + Cancel button", "Cancel (triggers AbortController)", "User selects target and triggerScan() fires"],
    ["success", "Overview or Directory view + Reset", "Switch view mode, click category, expand tree, reset", "POST /present returns 200 with valid PresentationData"],
    ["error", "Error message + Reset", "Reset to idle", "POST /present returns 400 or 500, or fetch throws"],
    ["cancelled", "Cancel message + Reset", "Reset to idle", "POST /present returns 499, or fetch aborted"],
  ], [1500, 2200, 2300, 3026]),
  ...spacer(),

  H2("8.2", "State Transitions (Scan Pipeline)"),
  body("Figure 5 illustrates the complete scan lifecycle state machine with all transitions, including the view mode sub-states within the success state:"),
  ...spacer(),
  diagram("fig5_state.png", 570),
  figCaption("Figure 5: DScope Scan Lifecycle State Machine — All States and Transitions"),
  ...spacer(),
  body("The transition rules are as follows:"),
  ...spacer(),
  bullet("idle → scanning: Triggered by selectTarget(). The user clicks a scan target option in the ScanTargetSelection modal. If 'Entire System' is selected, the frontend first calls window.api.restartBackend(true) to restart the backend with pkexec elevation, then waits approximately 3 seconds for the new backend process to become available, then calls triggerScan(path). For other targets, triggerScan(path) is called immediately."),
  ...spacer(),
  bullet("scanning → success: Triggered by a successful fetch. The POST /present request returns HTTP 200 and the response body is parsed as PresentationData. The PresentationData is stored in the data state field, and the status is set to 'success'. The viewMode is set to 'overview' by default."),
  ...spacer(),
  bullet("scanning → cancelled: Triggered by two conditions. First, the user clicks the Cancel button, which calls abort() on the current AbortController. The fetch throws an AbortError, which is caught in the catch block and sets status to 'cancelled'. Second, the backend returns HTTP 499 (which it does when the scanner throws an AbortError due to the abort signal), which is detected in the response status check."),
  ...spacer(),
  bullet("scanning → error: Triggered by any non-200, non-499 response status (400 for invalid path, 500 for scan failure or payload too large) or by any fetch error other than AbortError. The error message is extracted from the response body if available and stored in the error state field."),
  ...spacer(),
  bullet("success → overview / directory: Within the success state, the viewMode state field controls which view is rendered. The user can toggle between overview and directory by clicking the view mode tabs. Setting drilldownCategory to a non-null value renders the DrilldownList view."),
  ...spacer(),
  bullet("success | error | cancelled → idle: Triggered by the user clicking the Reset button, which calls the reset() function. reset() sets status to 'idle', clears data, path, error, viewMode, and drilldownCategory, and the ScanTargetSelection modal is shown again."),
  ...spacer(),

  H2("8.3", "Concurrency and Cancellation"),
  body("DScope's concurrency model is deliberately simple: only one scan can be active at any time, and all scan state is managed in a single React component. This simplicity is appropriate for a desktop application where the user is interacting with one scan at a time, but it requires careful handling to ensure that state updates from one scan request do not interfere with a subsequent scan request."),
  ...spacer(),
  body("The key concurrency mechanism is the AbortController reference stored in abortControllerRef. This is a React ref (not state), meaning that it is not subject to React's batched state update rules and can be read and written synchronously within event handlers. When triggerScan() is called, it reads abortControllerRef.current and calls abort() on it before creating a new AbortController. This ensures that any pending scan from a previous invocation is cancelled before the new scan begins."),
  ...spacer(),
  body("The backend also enforces single-scan semantics implicitly: each POST /present request creates its own AbortController and scanner instance, so multiple concurrent requests would be processed independently. However, since the frontend enforces single-scan semantics at the UI level (the Cancel button aborts the current scan, and the Reset button returns to idle before a new scan can be started), concurrent requests from a single client are not expected in normal usage."),
  ...spacer(),
  body("All status-modifying operations are performed on the server side in Express route handlers, preventing client-side manipulation of scan state. The frontend cannot fabricate a successful scan result or inject false data into the PresentationData payload; it can only send a path and receive the backend's analysis of that path."),
  ...spacer(),
  body("The Electron privileged backend restart path introduces an additional concurrency concern: after restarting the backend with pkexec, the frontend must wait for the new backend process to become available before sending the scan request. The current implementation uses a fixed 3-second sleep. A more robust implementation would poll the /health endpoint until it returns { status: 'ok' } before proceeding, but the fixed delay is sufficient for the current scale of the application."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 9
// ═══════════════════════════════════════════════════════════════════════════
function chapter9() { return [
  H1("9", "Results and Analysis"),
  H2("9.1", "Sample Data and Output"),
  body("The following samples represent representative output from a DScope scan of a developer home directory on an Ubuntu 24.04 system with approximately 40 GB of data including Docker containers, npm/pip caches, and personal project files."),
  ...spacer(),
  body("Sample 1: Snapshot Document (latest.json)"),
  ...codeBlock([
    "{",
    '  "timestamp": "2025-04-19T12:30:00.000Z",',
    '  "totalSize": 42949672960,',
    '  "categories": {',
    '    "cache": 5368709120,',
    '    "containers": 10737418240,',
    '    "system": 8589934592,',
    '    "user-data": 15360000000,',
    '    "logs": 536870912,',
    '    "packages": 2357198848,',
    '    "kernels": 419430400,',
    '    "unclassified": 536870912',
    "  }",
    "}",
  ]),
  ...spacer(),
  body("Sample 2: Category Diff Output (computeCategoryDiff result)"),
  ...codeBlock([
    "{",
    '  "baseline": false,',
    '  "totalDelta": 1610612736,',
    '  "categoryDeltas": {',
    '    "containers": 2147483648,',
    '    "cache": -536870912',
    "  }",
    "}",
  ]),
  ...spacer(),
  body("This diff indicates that since the last scan, container storage grew by approximately 2 GB (a docker pull was run) and cache shrank by approximately 500 MB (pip cache was cleared). Total disk usage grew by approximately 1.5 GB net."),
  ...spacer(),
  body("Sample 3: Enriched ScanNode (intermediate pipeline output)"),
  ...codeBlock([
    "{",
    '  "path": "/var/lib/docker",',
    '  "size": 10737418240,',
    '  "type": "directory",',
    '  "category": "containers",',
    '  "confidence": "high",',
    '  "title": "Container Storage",',
    '  "explanation": "Docker or Podman container image layers and volumes.',
    '                  Cleaning this removes stopped containers and unused images.",',
    '  "riskLevel": "medium"',
    "}",
  ]),
  ...spacer(),
  body("Sample 4: OverviewCategory (UI payload, truncated)"),
  ...codeBlock([
    "{",
    '  "id": "containers",',
    '  "label": "Container Storage",',
    '  "size": 10737418240,',
    '  "files": [',
    '    { "path": "/var/lib/docker/overlay2/abc123/diff/usr/share/...", "size": 524288000 },',
    "    ...",
    "  ],",
    '  "delta": 2147483648',
    "}",
  ]),
  ...spacer(),

  H2("9.2", "Reports Generated by the System"),
  body("DScope auto-generates the following visualizations and statistical summaries within its dashboard views. Unlike traditional reporting systems that generate static documents, DScope's reports are interactive UI components that respond to user interaction."),
  ...spacer(),
  body("Overview Dashboard (all scan targets): The Overview page renders one card per category present in the scan. Each card shows the category display name, a representative icon, the total size in human-readable format (B, KB, MB, or GB), the total file count, and a delta badge. Delta badges are color-coded: green for a negative delta (the category shrank), red for a positive delta (the category grew), and gray for a baseline scan (no previous snapshot). The Overview also shows the lastSnapshot timestamp so the user knows when the previous scan was performed."),
  ...spacer(),
  body("Drilldown Report (per category): The DrilldownList page renders a grouped list of files in the selected category. Files are grouped by their parent folder path. Each group is labeled with the folder path and shows the aggregated size of all files in the group from the selected category. Groups are sorted by aggregated size descending, so the most disk-intensive folders appear first. Individual files within each group show their file name and size. This provides an actionable breakdown: for the 'cache' category, the user can see which application's cache directory (/home/user/.cache/pip vs /home/user/.cache/yarn) is contributing most."),
  ...spacer(),
  body("Directory Tree Report (all scan targets): The Directory page renders the complete filtered and capped scan tree as a recursive expandable tree. Each row shows the entry name, size, and (for expanded directories) an explanation panel with the classification title, description, and risk badge. The risk badge is color-coded: gray for 'low' and 'normal', yellow for 'medium', blue for 'user', and red for 'unknown'. Synthetic summary nodes (the '...and N more (X GB)' items) are shown at the bottom of capped child lists, giving the user a sense of what is hidden."),
  ...spacer(),

  H2("9.3", "Performance Observations"),
  body("The following performance measurements were taken on a mid-range development laptop (Intel Core i7, 16 GB RAM, NVMe SSD) running Ubuntu 24.04:"),
  ...spacer(),
  mkTable([
    ["Operation", "Typical Latency", "Notes"],
    ["Home directory scan (~50,000 files)", "3 – 8 seconds", "Varies with directory depth and NVMe vs HDD"],
    ["Full system scan (~200,000 node cap)", "15 – 45 seconds", "Requires privileged restart (pkexec adds ~2s)"],
    ["Snapshot load (latest.json, typical)", "< 10 ms", "JSON parse of ~1 KB file; negligible"],
    ["Diff computation (8 categories)", "< 5 ms", "Pure computation, no I/O"],
    ["mapToUI() + compressTreeForUI()", "50 – 200 ms", "Scales with tree size; largest component"],
    ["Frontend render — Overview mode", "~100 ms", "8 category cards, React reconciliation"],
    ["Frontend render — Directory mode", "~200 ms", "Initial render; expansion is lazy"],
    ["Scan cancellation response time", "< 500 ms", "Time from Cancel click to status = cancelled"],
    ["Snapshot write (timestamped + latest.json)", "< 50 ms", "Two sequential NVMe writes of ~1 KB each"],
    ["JSON size guard check (50MB limit)", "~20 ms", "String.length on serialized payload"],
  ], [3500, 2000, 3526]),
  ...spacer(),
  body("The most significant performance variable is the scanner's I/O throughput on the target filesystem. NVMe SSDs consistently produce scan times in the lower range; spinning HDDs and external USB drives can produce scan times several times higher for the same number of files. The batch processing strategy ensures that the Node.js event loop remains responsive during scanning regardless of the storage medium speed."),
  ...spacer(),
  body("The scan cancellation response time of less than 500 ms is achieved by checking the AbortSignal before each batch of 50 directory entries. On a busy directory with many large subdirectories, the worst case is that one 50-entry batch completes before the abort is detected; since each batch uses Promise.all with concurrent lstat calls, this takes at most a few hundred milliseconds even on slow storage."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 10
// ═══════════════════════════════════════════════════════════════════════════
function chapter10() { return [
  H1("10", "Application Integration (Full Stack)"),
  H2("10.1", "Backend Integration (Express + Node.js)"),
  body("The Express backend serves as the complete analysis engine for DScope. It is started as a child process by the Electron main process and communicates with the frontend over HTTP on localhost:3000. The backend does not use any external services, database clients, or cloud SDKs; all its dependencies are Node.js core modules (fs, path, os) and the Express framework."),
  ...spacer(),
  body("The Electron main process starts the backend differently in development mode versus packaged mode. In development mode, it spawns node with server/src/index.js as the entry point. In packaged mode, it uses process.execPath (the Electron executable) with the ELECTRON_RUN_AS_NODE=1 environment variable, which causes the Electron binary to run as a standard Node.js process without opening a window. This approach packages a single binary that can function as both the Electron shell and the backend server."),
  ...spacer(),
  body("For privileged full-system scans, the backend restart uses pkexec (PolicyKit execute) to launch the backend with root privileges. The pkexec command is: pkexec env ELECTRON_RUN_AS_NODE=1 [path to Electron executable] [path to server entry] in packaged mode, or pkexec node [path to server entry] in development mode."),
  ...spacer(),
  body("Backend initialization (server/src/index.js):"),
  ...codeBlock([
    "import express from 'express';",
    "import { scanDirectory } from './core/scanner.js';",
    "import { classifyNode } from './intelligence/classifier.js';",
    "import { explainClassification } from './intelligence/explainer.js';",
    "import { saveSnapshot, loadLatestSnapshot } from './history/snapshotStore.js';",
    "import { computeCategoryDiff } from './history/diffEngine.js';",
    "import { mapToUI } from './presentation/presentationMapper.js';",
    "",
    "const app = express();",
    "app.use(express.json());",
    "",
    "app.listen(3000, () => console.log('DScope backend running on port 3000'));",
  ]),
  ...spacer(),

  H2("10.2", "Frontend Interaction (React + Vite)"),
  body("DScope uses React 19 with TypeScript 5.9 and Vite 7 for the frontend client. The App component implements the scan lifecycle state machine and coordinates all user interactions. All data fetching is done through standard fetch() calls to the Express backend; there is no React Query, SWR, or other data fetching library."),
  ...spacer(),
  body("The TypeScript type contracts in client/src/types.ts define the shapes of all data structures exchanged between the frontend and backend. The most important interfaces are ScanNode (raw scanner output), EnrichedNode (after intelligence enrichment), OverviewCategory (UI payload for Overview mode), DirectoryNode (UI payload for Directory mode), PresentationData (the complete /present response), and AppState (the React state machine state)."),
  ...spacer(),
  body("The frontend is built with Vite's relative base path configuration (base: './') to ensure that all asset paths are relative rather than absolute. This is required for the packaged Electron app, where the built frontend is loaded from the local filesystem rather than a web server, and absolute paths like /assets/main.js would resolve to the system root rather than the application directory."),
  ...spacer(),
  body("Route structure (App.tsx state-driven rendering):"),
  ...codeBlock([
    "// No router library — all rendering is state-driven in App.tsx",
    "status === 'idle'                        → <ScanTargetSelection />",
    "status === 'scanning'                    → <ScanSpinner /> + <CancelButton />",
    "status === 'success' && drilldownCategory → <DrilldownList />",
    "status === 'success' && viewMode==='overview' → <Overview />",
    "status === 'success' && viewMode==='directory' → <Directory />",
    "status === 'error'                       → <ErrorMessage /> + <ResetButton />",
    "status === 'cancelled'                   → <CancelMessage /> + <ResetButton />",
  ]),
  ...spacer(),
  body("The frontend's CSS theming system uses a set of CSS custom properties (variables) defined in App.css. These variables define the primary, secondary, accent, danger, warning, light, dark, and gray color palette, as well as card shadow, hover shadow, and background color tokens. All component styles reference these variables rather than hard-coding color values, making it straightforward to implement a theme switch (for example, adding a dark mode) by redefining the variables."),
  ...spacer(),

  H2("10.3", "Electron Shell and IPC Bridge"),
  body("The Electron main process (electron/main.js) is the desktop runtime orchestrator. It has six responsibilities: creating the BrowserWindow with security defaults, loading the built frontend, starting the backend child process, exposing IPC handlers, managing the backend process lifecycle, and handling privileged backend restarts."),
  ...spacer(),
  body("The BrowserWindow is created with contextIsolation: true and nodeIntegration: false. contextIsolation ensures that the preload script runs in a separate JavaScript context from the frontend's React application, preventing any accidental or malicious access to Node.js APIs from the frontend. nodeIntegration: false prevents the frontend from requiring Node.js modules directly. These two settings together implement the Electron security best practices for desktop applications."),
  ...spacer(),
  body("The preload script (electron/preload.js) uses contextBridge.exposeInMainWorld to expose a narrow window.api object to the frontend. This object has exactly four methods, corresponding to the four IPC handlers registered in the main process:"),
  ...spacer(),
  ...codeBlock([
    "const { contextBridge, ipcRenderer } = require('electron');",
    "",
    "contextBridge.exposeInMainWorld('api', {",
    "  checkBackendStatus: () =>",
    "    fetch('http://localhost:3000/health').then(r => r.json()),",
    "",
    "  getHomeDir: () =>",
    "    ipcRenderer.invoke('get-home-dir'),",
    "",
    "  getExternalDevices: () =>",
    "    ipcRenderer.invoke('get-external-devices'),",
    "",
    "  restartBackend: (privileged) =>",
    "    ipcRenderer.invoke('restart-backend', privileged),",
    "});",
  ]),
  ...spacer(),
  body("The external device detection logic in the main process scans two standard Linux mount roots: /media/[username] and /run/media/[username]. It reads the directory listing at each root (if it exists), filters for entries that are themselves directories (indicating mounted devices), and returns an array of { name, path } objects to the frontend. The frontend's ScanTargetSelection component calls getExternalDevices() when rendered and shows a Refresh button to allow the user to re-scan for newly mounted drives."),
  ...spacer(),
  body("The backend child process is managed through Node.js's child_process module. The main process stores a reference to the child process and calls child.kill() on the 'will-quit' event to ensure that the backend server is terminated when the user closes the application window. Without this cleanup, the backend process would continue running in the background after the Electron window is closed, consuming a port and memory until the OS terminates it."),
  ...spacer(),
  body("The electron/index.html file serves as a lightweight status page. It is not the main frontend (which is client/dist/index.html); it is a separate HTML page that polls the backend's /health endpoint up to ten times and shows either 'Backend running' or 'Backend not reachable' status. This page is part of the bundled assets and is used during development to verify backend startup without loading the full React application."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 11
// ═══════════════════════════════════════════════════════════════════════════
function chapter11() { return [
  H1("11", "Conclusion"),
  H2("11.1", "Summary of Work"),
  body("DScope successfully delivers a comprehensive Linux desktop disk intelligence application that addresses the five core pain points identified in the problem statement: invisible consumption, absent historical comparison, cumbersome exploration, invisible risk, and missing classification context."),
  ...spacer(),
  body("The system implements a safe recursive filesystem scanner with hard caps on depth (20 levels), node count (200,000 nodes), path length (1,000 characters), and payload size (50 MB JSON limit). The scanner never traverses pseudo-filesystems or symbolic links, handles permission errors gracefully, and supports mid-scan cancellation through the AbortSignal API."),
  ...spacer(),
  body("A deterministic, rule-based classification engine assigns every file and directory node to one of eight semantic categories (containers, packages, logs, cache, system, kernels, user-data, unclassified) with a confidence level (high, medium, or low). An explanation engine maps each classification to a human-readable title, description, and risk level, providing the context that raw disk usage tools lack."),
  ...spacer(),
  body("A file-based snapshot store persists scan results as timestamped JSON files in ~/.local/share/dscope/snapshots. A category diff engine computes signed size deltas between consecutive snapshots, surfacing growth and shrink trends that make disk management proactive rather than reactive."),
  ...spacer(),
  body("A presentation mapper transforms the enriched scan tree and computed diff into two complementary UI payloads: an Overview payload for category-level intelligence and a Directory payload for deep filesystem exploration. The React frontend renders these in three view modes (Overview cards, DrilldownList, and Directory tree) and manages the complete scan lifecycle through a five-state state machine."),
  ...spacer(),
  body("An Electron desktop shell provides a native Linux window, a secure IPC bridge with four exposed capabilities, a pkexec-based privileged backend restart for full-system scans, and external device detection for removable storage."),
  ...spacer(),
  body("The application is packaged as Linux desktop distributables in AppImage, deb, and rpm formats through electron-builder and a pipeline script (package_linux.sh) that builds the frontend, installs production backend dependencies, and runs the packager."),
  ...spacer(),
  body("A script-based test suite covers all core modules: scanner.js (size correctness, symlink safety), classifier.js (category and confidence rules), explainer.js (title, risk, explanation mapping), diffEngine.js (baseline, growth, shrink, new category, removed category, mixed changes), snapshotStore.js (save and load behavior), and presentationMapper.js (category mapping, delta assignment, directory structure)."),
  ...spacer(),

  H2("11.2", "Learning Outcomes"),
  body("Development of DScope provided practical experience across the full stack of modern desktop web application development:"),
  ...spacer(),
  bullet("Full-stack desktop application development with Electron 36, Node.js, Express 5.2, React 19, TypeScript 5.9, and Vite 7 in a monorepo architecture."),
  bullet("Recursive filesystem programming — safe traversal using fs.lstat, symlink avoidance, permission error handling, AbortSignal propagation, and progress tracking across depth-limited recursive calls."),
  bullet("Rule-based intelligence system design — building a deterministic classifier and explainer without machine learning, using explicit path-pattern rules that encode domain knowledge about Linux filesystem conventions."),
  bullet("File-based data persistence — snapshot store design using JSON files, timestamped naming conventions, the XDG Base Directory Specification, and atomic-ish write patterns."),
  bullet("Diff computation and trend analysis — building a category-level delta engine that correctly handles new categories, removed categories, and zero-delta categories across two point-in-time snapshots."),
  bullet("Performance engineering — batched async processing, depth and node count capping, payload compression through tree truncation and synthetic summary nodes, and JSON size guarding."),
  bullet("Electron security architecture — contextIsolation, narrow contextBridge API surface, child process management, pkexec privilege escalation, and cleanup on application quit."),
  bullet("Frontend state machine design — managing five application states (idle, scanning, success, error, cancelled) with React hooks and refs, including AbortController lifecycle management."),
  bullet("Linux-specific systems knowledge — understanding the XDG directory specification, pseudo-filesystem exclusions, pkexec privilege model, mount point conventions, and NTFS compatibility considerations."),
  bullet("Test-driven development with script-based tests — writing Node.js test scripts without a framework (no Jest or Mocha) that validate correctness through explicit assertions and exit codes."),
  ...spacer(),

  H2("11.3", "Future Enhancements"),
  body("The following enhancements have been identified as high-value additions for future development iterations:"),
  ...spacer(),
  numbered("Real-Time Scan Progress: Stream scan progress (files processed, directories processed, current path) to the frontend via Server-Sent Events or WebSocket. Replace the static spinner with a progress bar and a live counter showing how many nodes have been processed and the estimated completion percentage."),
  ...spacer(),
  numbered("Scheduled Background Scans: Implement automated periodic scans using Electron's scheduled task support or a systemd timer, building a richer historical dataset. This would enable the diff engine to show weekly or monthly trends rather than just the delta from the last manual scan."),
  ...spacer(),
  numbered("File Deletion UI: Add a safe file deletion workflow directly from the DrilldownList or Directory views. The user would select files or directories, see a summary of what will be deleted and how much space will be recovered, confirm through a dialog, and the backend would perform the deletion with appropriate privilege checks. Trash integration (moving to ~/.local/share/Trash rather than immediate deletion) would be the default."),
  ...spacer(),
  numbered("Machine Learning Classification: Supplement the rule-based classifier with a trained model that learns from user-confirmed category labels. When the user manually re-categorizes a directory (through a right-click menu), that label would be saved as a training example and the model would be retrained to improve accuracy on similar paths. This would improve classification of non-standard paths that do not match the built-in rules."),
  ...spacer(),
  numbered("Cross-Platform Support: Extend the application to macOS and Windows, adapting the privileged restart path (pkexec becomes AppleScript for macOS, UAC for Windows), the excluded path list, the external device detection logic, and the snapshot storage location (following platform conventions for each OS)."),
  ...spacer(),
  numbered("Export Reports: Generate PDF or CSV reports of category sizes, deltas, and file lists for sharing with system administrators or archiving as documentation. The PDF export would use a Node.js PDF library (such as pdfkit) on the backend; the CSV export would use the existing SheetJS library or a simple CSV serializer."),
  ...spacer(),
  numbered("Database-Backed History: Migrate snapshot persistence from file-based JSON to a structured database (SQLite via better-sqlite3 or Appwrite) for richer querying, multi-user support, and remote history access. A database backend would enable queries like 'show me all scans from the last 30 days sorted by totalDelta' that are impractical with the current file-based store."),
  ...spacer(),
  numbered("Comprehensive Test Runner: Aggregate all existing test scripts under a unified test runner such as Jest or Vitest and add integration tests for the full /present pipeline end-to-end. Currently, tests are run individually by executing each test file; a unified runner would enable CI/CD integration and coverage reporting."),
  ...spacer(),
  numbered("Plugin Architecture: Allow community-contributed classification rules and custom category definitions through a plugin system. Users could install plugins that add recognition for specific applications (for example, a plugin that identifies Blender project files, Unreal Engine asset caches, or machine learning model weights) and provides appropriate explanations and risk levels for those directories."),
  ...spacer(),
  numbered("Appwrite Realtime Integration: For a multi-user or team deployment, integrate with Appwrite's Realtime API to push live scan status updates and snapshot history across multiple connected clients without polling. This would enable scenarios where a system administrator runs DScope on a server and multiple team members can view the scan results and historical trends in real time."),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 12
// ═══════════════════════════════════════════════════════════════════════════
function chapter12() { return [
  H1("12", "References"),
  H2("A.", "Frameworks and Libraries"),
  bullet("Electron 36 — https://www.electronjs.org/docs — Desktop shell, BrowserWindow, IPC, contextBridge, child_process integration"),
  bullet("React 19 — https://react.dev — Frontend UI framework, hooks (useState, useRef, useEffect), component model"),
  bullet("Vite 7 — https://vitejs.dev/guide — Frontend build tooling, HMR, relative base path configuration for packaged apps"),
  bullet("TypeScript 5.9 — https://www.typescriptlang.org/docs — Static type checking, interface definitions, generics"),
  bullet("Express 5.2 — https://expressjs.com/en/5x/api.html — HTTP server, route handlers, middleware (express.json)"),
  bullet("ESLint 9 — https://eslint.org/docs/latest — Static code analysis and style enforcement"),
  bullet("electron-builder — https://www.electron.build — Cross-platform Electron application packaging (AppImage, deb, rpm)"),
  ...spacer(),
  H2("B.", "Websites and Tools"),
  bullet("GitHub — https://github.com — Version control, repository hosting, issue tracking"),
  bullet("Node.js Documentation — https://nodejs.org/en/docs — Core modules: fs, path, os, child_process, AbortController"),
  bullet("MDN Web Docs — https://developer.mozilla.org — AbortSignal API, fetch API, Web Streams, DOMException"),
  bullet("Linux Man Pages — https://man7.org/linux/man-pages — du, df, lstat, readdir, XDG Base Directory Specification"),
  bullet("PolicyKit Documentation — https://www.freedesktop.org/software/polkit — pkexec privilege escalation mechanism"),
  ...spacer(),
  H2("C.", "Documentation"),
  bullet("Electron IPC Documentation — https://www.electronjs.org/docs/latest/api/ipc-main — ipcMain.handle, ipcRenderer.invoke patterns"),
  bullet("Electron contextBridge — https://www.electronjs.org/docs/latest/api/context-bridge — Secure preload API exposure"),
  bullet("Node.js fs module — https://nodejs.org/api/fs.html — fs.lstat, fs.readdir, fs.writeFile, fs.mkdir"),
  bullet("AbortSignal API — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal — AbortController, signal.aborted, DOMException AbortError"),
  bullet("React State Hooks — https://react.dev/reference/react/useState — State machine implementation with useState and useRef"),
  bullet("Vite Configuration — https://vitejs.dev/config — base, build.outDir, resolve.alias settings"),
  bullet("XDG Base Directory Specification — https://specifications.freedesktop.org/basedir-spec — ~/.local/share convention for application data"),
  pageBreak(),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 13
// ═══════════════════════════════════════════════════════════════════════════
function chapter13() { return [
  H1("13", "Appendix"),
  H2("A.", "Code Samples"),
  ...spacer(),
  body("Category Constants and Classification Rules (server/src/intelligence/classifier.js — key excerpts):"),
  ...codeBlock([
    "export const CATEGORIES = {",
    "  CONTAINERS:   'containers',",
    "  PACKAGES:     'packages',",
    "  LOGS:         'logs',",
    "  CACHE:        'cache',",
    "  SYSTEM:       'system',",
    "  KERNELS:      'kernels',",
    "  USER_DATA:    'user-data',",
    "  UNCLASSIFIED: 'unclassified',",
    "};",
    "",
    "export function classifyNode(node) {",
    "  const p = node.path;",
    "  const n = path.basename(p);",
    "",
    "  if (p === '/var/lib/docker' || p === '/var/lib/containers')",
    "    return { category: CATEGORIES.CONTAINERS, confidence: 'high' };",
    "",
    "  if (p === '/var/lib/snapd')",
    "    return { category: CATEGORIES.PACKAGES, confidence: 'high' };",
    "",
    "  if (p.includes('/.var/app'))",
    "    return { category: CATEGORIES.PACKAGES, confidence: 'medium' };",
    "",
    "  if (p === '/var/log')",
    "    return { category: CATEGORIES.LOGS, confidence: 'high' };",
    "",
    "  if (p === '/var/cache' || p.includes('/.cache'))",
    "    return { category: CATEGORIES.CACHE, confidence: 'high' };",
    "",
    "  if (['/usr','/lib','/lib64','/bin','/sbin'].some(s => p.startsWith(s)))",
    "    return { category: CATEGORIES.SYSTEM, confidence: 'high' };",
    "",
    "  if (p.startsWith('/boot') && (n.startsWith('vmlinuz') || n.startsWith('initrd')))",
    "    return { category: CATEGORIES.KERNELS, confidence: 'high' };",
    "",
    "  if (p.startsWith('/home'))",
    "    return { category: CATEGORIES.USER_DATA, confidence: 'high' };",
    "",
    "  return { category: CATEGORIES.UNCLASSIFIED, confidence: 'low' };",
    "}",
  ]),
  ...spacer(),
  body("Snapshot Store (server/src/history/snapshotStore.js — full implementation):"),
  ...codeBlock([
    "import fs from 'fs/promises';",
    "import path from 'path';",
    "import os from 'os';",
    "",
    "const SNAPSHOT_DIR = path.join(os.homedir(), '.local', 'share', 'dscope', 'snapshots');",
    "",
    "export async function saveSnapshot(snapshot) {",
    "  try {",
    "    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });",
    "    const ts = snapshot.timestamp.replace(/:/g, '-');",
    "    await fs.writeFile(",
    "      path.join(SNAPSHOT_DIR, `${ts}.json`),",
    "      JSON.stringify(snapshot, null, 2)",
    "    );",
    "    await fs.writeFile(",
    "      path.join(SNAPSHOT_DIR, 'latest.json'),",
    "      JSON.stringify(snapshot, null, 2)",
    "    );",
    "    return true;",
    "  } catch { return false; }",
    "}",
    "",
    "export async function loadLatestSnapshot() {",
    "  try {",
    "    const raw = await fs.readFile(path.join(SNAPSHOT_DIR, 'latest.json'), 'utf-8');",
    "    return JSON.parse(raw);",
    "  } catch { return null; }",
    "}",
  ]),
  ...spacer(),
  body("Frontend Scan Trigger (client/src/App.tsx — triggerScan function):"),
  ...codeBlock([
    "const triggerScan = async (scanPath: string) => {",
    "  setStatus('scanning');",
    "  setError(null);",
    "",
    "  if (abortControllerRef.current) abortControllerRef.current.abort();",
    "  const controller = new AbortController();",
    "  abortControllerRef.current = controller;",
    "",
    "  try {",
    "    const res = await fetch('http://localhost:3000/present', {",
    "      method: 'POST',",
    "      headers: { 'Content-Type': 'application/json' },",
    "      body: JSON.stringify({ path: scanPath }),",
    "      signal: controller.signal,",
    "    });",
    "",
    "    if (res.status === 499) { setStatus('cancelled'); return; }",
    "",
    "    if (!res.ok) {",
    "      const body = await res.json().catch(() => ({}));",
    "      setError(body.error || 'Scan failed');",
    "      setStatus('error');",
    "      return;",
    "    }",
    "",
    "    const data: PresentationData = await res.json();",
    "    setData(data);",
    "    setStatus('success');",
    "    setViewMode('overview');",
    "  } catch (err: any) {",
    "    if (err.name === 'AbortError') { setStatus('cancelled'); return; }",
    "    setError(err.message || 'Network error');",
    "    setStatus('error');",
    "  }",
    "};",
  ]),
  ...spacer(),
  body("Sidebar Configuration equivalent — Route/State Config (client/src/App.tsx — view state mapping):"),
  ...codeBlock([
    "// View mode to component mapping (state-driven, no router)",
    "const VIEW_CONFIG = {",
    "  overview: {",
    "    component: Overview,",
    "    label: 'Overview',",
    "    description: 'Category cards with sizes and deltas',",
    "  },",
    "  directory: {",
    "    component: Directory,",
    "    label: 'Directory',",
    "    description: 'Recursive tree with explanations and risk badges',",
    "  },",
    "};",
    "",
    "// Drilldown state",
    "const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);",
    "// If drilldownCategory is set, render DrilldownList regardless of viewMode",
    "if (drilldownCategory) return <DrilldownList category={drilldownCategory} .../>;",
  ]),
  ...spacer(),
  body("Parallel Stats Fetch equivalent — Parallel Scan Operations (server/src/index.js):"),
  ...codeBlock([
    "// No independent parallel stats fetch in DScope;",
    "// batched async processing within scanDirectory achieves parallelism:",
    "const batchResults = await Promise.all(",
    "  batch.map(entry => processEntry(entry, dirPath, { signal, depth, nodeCount, progress }))",
    ");",
    "",
    "// After scan, all pipeline stages run sequentially (each depends on previous output):",
    "const tree = await analyzePath(path, signal);      // scan + enrich",
    "const prev = await loadLatestSnapshot();            // load previous",
    "const curr = generateSnapshot(tree);               // generate current",
    "const diff = computeCategoryDiff(prev, curr);      // compute delta",
  ]),
  ...spacer(),

  H2("B.", "Screenshots"),
  ...spacer(),
  body("The following placeholders indicate where application screenshots should be inserted. These screenshots should be captured from the running DScope application and inserted into the document at these locations."),
  ...spacer(),
  body("Figure 8: DScope Scan Target Selection Screen"),
  ...screenshotPlaceholder("Figure 8: Scan Target Selection Modal — Home Directory / Entire System / External Device options"),
  ...spacer(),
  body("Figure 9: DScope Overview Mode — Category Cards"),
  ...screenshotPlaceholder("Figure 9: Overview Mode — Category cards showing Container Storage, Cache, System, User Data with size and delta badges"),
  ...spacer(),
  body("Figure 10: DScope DrilldownList Mode"),
  ...screenshotPlaceholder("Figure 10: DrilldownList Mode — Files in selected category grouped by parent folder, sorted by aggregated size"),
  ...spacer(),
  body("Figure 11: DScope Directory Mode — Recursive Tree"),
  ...screenshotPlaceholder("Figure 11: Directory Mode — Recursive expandable tree with risk badges and inline explanation panels"),
  ...spacer(),
  body("Figure 12: DScope Admin / Settings Dashboard"),
  ...screenshotPlaceholder("Figure 12: Application Settings or Snapshot History View"),
]; }

// ═══════════════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════
const allChildren = [
  ...coverPage(),
  ...bonafidePage(),
  ...declarationPage(),
  ...acknowledgementPage(),
  ...tocPage(),
  ...chapter1(),
  ...chapter2(),
  ...chapter3(),
  ...chapter4(),
  ...chapter5(),
  ...chapter6(),
  ...chapter7(),
  ...chapter8(),
  ...chapter9(),
  ...chapter10(),
  ...chapter11(),
  ...chapter12(),
  ...chapter13(),
];

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: TNR, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: TNR },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: TNR },
        paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: TNR },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },   // A4
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "DScope – Linux Disk Space Visualization Tool", font: TNR, size: 18, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: TNR, size: 20 }),
            new TextRun({ children: [PageNumber.CURRENT], font: TNR, size: 20 }),
          ],
        })],
      }),
    },
    children: allChildren,
  }],
});

console.log("Building document...");
Packer.toBuffer(doc).then(buf => {
  const out = "/home/horcrux/Projects/dscope/DScope/new_report.docx";
  fs.writeFileSync(out, buf);
  console.log(`Done! Written to ${out} (${(buf.length/1024).toFixed(0)} KB)`);
});