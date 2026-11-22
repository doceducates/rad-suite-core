# Clinical Revision Diff Engine, Multi-Style Templates & Two-Tier Impression Architecture

## 1. Overview & Clinical Context
In high-volume hospital reporting (20–30+ MRI scans per shift at Lahore General Hospital), PGR Radiologists (Dr. Muhammad Mudassir) and Supervising Consultants experience rapid clinical handovers across three distinct phases:
1. **Phase 1 (PGR Initial Draft)**: Initial dictation and slice review. Milestone tagged as `v1_pgr_draft`.
2. **Phase 2 (Consultant Review & Edits)**: Live review with supervising consultant. Discrepancies are flagged, levels adjusted, and discussion notes synced. Milestone tagged as `v2_consultant_review`.
3. **Phase 3 (HMIS Submission)**: Finalized report approved and locked for the Punjab HMIS portal. Milestone tagged as `v3_hmis_ready`.

This documentation specifies the architecture of the **Clinical Revision Diff Engine**, **Multi-Style Report Template Engine**, and **Two-Tier Impression Generator**.

---

## 2. Module A: Clinical Git-Style Revision Diff Engine

### Zero-Dependency Myers / LCS Diff Engine (`src/lib/clinical-diff-engine.ts`)
- **Word-Level Diffing (`diffWords`)**: Uses the Longest Common Subsequence (LCS) algorithm to calculate atomic word additions (`+word` in green), deletions (`-word` strikethrough in red), and unchanged baseline tokens.
- **Level-Wise Structural Extraction (`diffByLevels`)**: Extracts spinal levels (`L1-L2` through `L5-S1`, `C1-C2` through `C7-T1`) and anatomical groups (`Alignment`, `Cord`, `Conus`, `Extraspinal`) into structured pairs, producing aligned level-by-level diff rows.
- **Sidebar vs Report Discrepancy Tracking (`compareSidebarWithReport`)**:
  - Detects items present in sidebar discussion notes (`discussion_json`) but missing from the main report body (`findings` / `impression`).
  - Detects findings in the main report body omitted from the sidebar.
  - Flags acuity conflicts (e.g. sidebar says "Extrusion", report says "Bulge").

### Visual Comparator Modal (`src/components/workstation/diff/clinical-diff-modal.tsx`)
- Accessible dialog supporting:
  - **PGR Draft ↔ Consultant Discussed**: Direct comparison between baseline draft and consultant review.
  - **Revision History Comparator**: Independent dropdown selection of any Revision A vs Revision B.
  - **Sidebar vs Report Discrepancies**: Highlighting un-synced points with severity badges.
  - **Side-by-Side View vs Unified Inline View** toggle.
  - **One-Click Revert & "Approve & Lock for HMIS"** actions.

### Zero-Hallucination Sidebar Sync Preview (`src/components/workstation/diff/sidebar-sync-preview-modal.tsx`)
- When the radiologist clicks "Sync to Report" in the positive findings rail, the system opens a visual diff preview modal before altering the report editor.
- Displays line-by-line additions and deletions, includes a finding checklist to toggle specific items, and applies changes only upon explicit user confirmation.

---

## 3. Module B: Multi-Style Report Template Engine

### The Two Clinical Formats
1. **Style 1: Categorized with Headings (`categorized_headings`)**
   - Standard academic / RSNA layout.
   - Enforces `<h3>Technique</h3>`, `<h3>Findings</h3>`, and bold anatomical subheadings.
2. **Style 2: Streamlined System-Wise / Pure Bullet-Point (`pure_bullets`)**
   - Hospital classic layout optimized for rapid neurosurgical and orthopedic scanability.
   - Zero `<h3>` subheadings anywhere in findings.
   - Clean, unbroken `<ul><li><p><strong>[Level]:</strong> [Finding]</p></li></ul>` list.

### Bidirectional Transformation Engine (`src/services/template-style-engine.service.ts`)
- `convertReportToStyle(html, targetStyle, technique)`: Transforms existing reports between Style 1 and Style 2 losslessly without losing findings text.
- `formatFindingsForStyle(findingsList, style, technique)`: Formats raw template arrays into either format.
- `detectReportStyle(html)`: Automatically detects active style based on `<h3>` presence.

### Extended Clinical Catalog (`src/services/templates/catalog-extended-modalities.data.ts`)
Pre-configured templates for high-frequency workflows:
- MRI Lumbar Spine & MRI Cervical Spine
- MRI Brain Plain & Stroke Protocol
- CT Trauma Brain Plain (Urgent Emergency Protocol)
- CT Chest (Contrast / HRCT)
- CT Abdomen & Pelvis (CECT)

---

## 4. Module C: Two-Tier Impression Generator

### Two Clinical Flavors (`src/services/two-tier-impression.service.ts`)
1. **Flavor 1: Local High-Yield (`local_high_yield`)**
   - Max 2–3 atomic numbered bullets.
   - Punchy, high-speed hospital phrasing (e.g. *"Lumbar spondylotic changes with disc bulges, more marked at L4–L5 and L5–S1."*).
   - **Clinical Age Guardrail**: If patient age < 30 years, automatically suppresses "spondylosis" / "spondylotic changes" and substitutes age-appropriate terminology ("Disc bulges / annular fissure / Schmorl's nodes").
   - Highlights predominant levels ("more marked at..."), suppresses minor measurements, and appends actionable specialist advice ("Advise: Neurosurgical consultation.").
2. **Flavor 2: Academic ACR/RSNA Structured (`international_structured`)**
   - Formal ACR/RSNA structured taxonomy.
   - Explicit mild/moderate/severe grading for spinal canal and exit foraminal stenosis.

### Zero-Hallucination & Offline Fallback Engine
- When online: Calls LLM with temperature 0.05 and a strict zero-hallucination contract forbidding un-dictated descriptors.
- When offline: Automatically routes to `generateHeuristicImpression`, extracting positive findings directly from the verified text.

---

## 5. Architectural & Quality Invariants
1. **File Size Limit**: All files strictly adhere to `< 350 lines` (target `< 250 lines`).
2. **Database Invariant**: Zero schema destruction; `radsuite.db` backed up to `db_backups/` before any changes.
3. **Desktop & Web Parity**: Fully guarded for Tauri / PWA environments (`typeof window !== 'undefined'`).

---

## 6. Notion-Style TipTap Editor Architecture & Extensions
To match Notion's streamlined editing and AI interaction models, the clinical editor includes:
1. **Notion Block Side Handle & Gutter (`ClinicalBlockHandle`)**:
   - `+` Button: Inserts a new paragraph immediately below and automatically activates the slash menu (`/`) for immediate block insertion.
   - `⋮⋮` Six-Dot Handle: Drag to reorder blocks with drop indicator line, or click to open block conversion menu (`Turn into`, `Duplicate`, `Delete`, `AI Polish`).
2. **Right-Click Context Menu (`ClinicalContextMenu`)**:
   - Intercepts `contextmenu` inside the editor canvas.
   - Provides quick actions: *Add Discussion Note*, *AI Polish Selection*, *Turn into* (Heading 2, Heading 3, Bullet List, Critical Finding Callout, Recommendation Callout), *Copy Clean for HMIS*, *Duplicate Block*, and *Delete Block*.
3. **Notion AI Spacebar Trigger on Empty Blocks (`ClinicalEmptySpaceAi`)**:
   - When cursor is on an empty line, pressing `Space` triggers an inline AI floating modal with pre-configured clinical starters (*Normal Lumbar Spine MRI*, *Normal Cervical Spine MRI*, *Normal Brain Plain CT*, *Synthesize Findings Section*).
   - Empty block placeholder displays: `"Press 'space' for AI, '/' for templates & commands..."`.
4. **Zero-Pollution HMIS Sanitizer**:
   - `stripClinicalCommentMarks(html)` ensures all internal discussion anchors (`data-comment-id`) and highlights are 100% stripped before sending drafts to Punjab HMIS or copying to clipboard.

