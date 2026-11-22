# Official Institutional Reporting Stationery & Consultant Roster

This document outlines the official Post Graduate Medical Institute (PGMI) / Lahore General Hospital (LGH) / Ameer-Ud-Din Medical College Department of Radiology reporting stationery, the centralized consultant roster, 1-click patient printout workflows, and cross-format export parity (Print, PDF, Word).

---

## 1. Overview & Architectural Principles

Radiologists frequently require instant, physical paper printouts for patients and attendants waiting at the reporting desk, as well as formal PDF and Word (`.docx`) exports for electronic record handovers.

### Key Architectural Invariants:
1. **Zero New Manual Editors (Reuse Prebuilt Editors)**:
   - Radiologists continue authoring reports using Rad Suite's prebuilt reporting interfaces (Quick Report Modal or full `/workstation` Zen editor).
   - The institutional template acts strictly as an output theme and print preview modal (`LghReportModal` / `LghReportSheet`), preventing redundant UI clutter.
2. **Standard Legible Text Sizing**:
   - Report body text is standardized to `13.5px` (`text-[13px] sm:text-[13.5px]`, line height `1.55`) in HTML/Print previews, and `9.5pt` / `10pt` in PDF and Word exports.
   - Microscopic font sizes that strain clinical reading under hospital lighting are eliminated.
3. **Cross-Format Visual Parity**:
   - Exact parity across Browser / Tauri Desktop Print (`window.print()`), PDF export (`jspdf`), and Word export (`docx`).

---

## 2. Institutional Stationery Structure

The layout replicates the institutional standard defined in `radiology_reporting.html`:

- **Dual Emblem Header**:
  - Left Emblem: Post Graduate Medical Institute (`/PGMI.jpg`).
  - Right Emblem: Lahore General Hospital (`/LGH.jpg`).
  - Titles: *Post Graduate Medical Institute / Lahore General Hospital / Ameer-Ud-Din Medical College, Lahore*.
  - Department Banner: *DEPARTMENT OF RADIOLOGY* in high-contrast institutional bar.
- **Demographics Table**:
  - Standardized 6-field clinical block: Patient Name, Age/Sex, Registration / MR No, Examination Date & Time, Referred By, Examination / Study Description.
- **Clinical Body & Typography**:
  - Section hierarchy: **Clinical Indication**, **Technique / Protocol**, **Findings**, and **Impression / Conclusion**.
  - Consistent bold labels and line-height.
- **Sign-off Block**:
  - Side-by-side signature stamps for the reporting resident and the supervising consultant radiologist.
- **18-Faculty Institutional Footer**:
  - Full 6-column × 3-row faculty grid enumerating all department professors, associate professors, assistant professors, and senior registrars.
  - Legal disclaimer bar: `NOT VALID FOR COURT OF LAW`.

---

## 3. Centralized Consultant Roster & Reusable Picker

### Roster Library (`src/lib/consultants.ts`)
Houses the complete official faculty list (`FACULTY_CONSULTANTS`), ranks, qualifications, and formatting helpers:
- **Professors**: Prof. Dr. Nighat Haroon (Head of Department), Prof. Dr. Sikandar Hayat Gondal, Prof. Dr. Rahat Sarfraz.
- **Associate Professors**: Dr. Muhammad Tariq, Dr. Asif Hanif, Dr. Asim Shaukat.
- **Assistant Professors**: Dr. Munawar Ali, Dr. Muhammad Umair, Dr. Sana Jahangir, Dr. Samina, Dr. Abdul Mannan, Dr. Ayesha, Dr. Asma.
- **Senior Registrars**: Dr. Bilal, Dr. Awais, Dr. Sabeen, Dr. Farwah, Dr. Afzaal.

### Canonical UI Component (`src/components/ui/consultant-picker.tsx`)
In accordance with Rule 8 (Single Reusable Component Invariant):
- Searchable combobox dropdown with fuzzy matching across names, ranks, and qualifications.
- Fallback custom text write-in mode allowing manual entry for visiting or temporary faculty.
- Automatic persistence of last selected consultant in `localStorage` (`radsuite_last_consultant`).
- Integrated into:
  1. **WhatsApp Handover Modal** (`worklist-whatsapp-modal.tsx`).
  2. **Official Report Print/Export Modal** (`lgh-report-modal.tsx`).

---

## 4. Quick 1-Click Patient Printouts

### Workstation Integration Points:
1. **My Cases & Worklist Rows**:
   - Each row item features a direct **"Print"** action button (`Printer` icon).
   - Clicking immediately opens `LghReportModal`. If the case findings have not yet been cached in the row summary, the modal automatically fetches the full report via `/api/reports?studyId=...`.
2. **Quick Report Modal Header**:
   - `WorklistReportModalHeader` includes a dedicated **"Print Report"** button alongside save and submit actions.

### Desktop App (Tauri) & Browser Print Compatibility
- Rad Suite desktop uses Tauri wrapping the Next.js frontend.
- Native `window.print()` triggers the Windows OS print dialog directly.
- `lgh-report-sheet.tsx` embeds strict print media styles:
  ```css
  @media print {
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    body {
      background: white !important;
      color: black !important;
    }
  }
  ```
- Ensures zero unwanted headers/footers, clean page margins, and crisp text rendering on A4 paper.

---

## 5. Export Services Parity (PDF & DOCX)

### PDF Export Service (`src/services/report-export-pdf.service.ts`)
- Dual institutional emblems rendered from bundled base64 image data.
- Header block matching official font sizes and margins.
- Standard demographics table with clean borders.
- Standard body font size (`9.5pt` with `13pt` line height).
- 18-faculty footer grid rendered at the base of every report page.

### Word (DOCX) Export Service (`src/services/report-export-docx.service.ts`)
- Generates Microsoft Word document with embedded header logos and institutional titles.
- Demographic metadata table formatted with cell borders.
- Clean paragraph styling for clinical findings and impressions.
- 6-column faculty roster table in the document footer.

---

## 6. Clinical Formatting & Deduplication Engine

To eliminate common discrepancies between raw draft storage, prebuilt editor artifacts, and official printouts, Rad Suite employs automatic sanitization utilities:

1. **History HTML Sanitization (`cleanClinicalHistory`)**:
   - Strips raw `<p>`, `<br>`, and other formatting tags from clinical history / indication strings, converting them to clean, readable plain text.
2. **Technique & Findings Deduplication (`splitTechniqueAndFindings`)**:
   - In prebuilt editors, technique is often saved embedded inside the findings HTML payload (e.g., `<h3>Technique</h3>...<h3>Findings</h3>...`).
   - The parser inspects the text, extracts any missing technique protocol, removes the redundant technique block from the findings body, and strips duplicate `Findings` headers.
3. **Structured Subheading Bolding (`lgh-report-renderers.tsx`)**:
   - Preserves HTML `<strong>` tags while also parsing plain text lines.
   - Detects anatomical bullet patterns (e.g., `• Curvature, Alignment & Vertebral Bodies:`) and bolds the label (`font-bold text-[13.5px]`), matching the official template styling.
   - Word (.docx) export mirrors this via `parseTextToParagraphs`, converting colon-separated subheadings into bold `TextRun` segments.

---

## 7. Global Quick Manual Report Action

To avoid header cluttering while keeping manual walk-in / offline case entry accessible from any view:
- **Sidebar Integration (`src/components/layout/sidebar.tsx`)**:
  - A dedicated **"New Manual Report"** action button (`FilePlus` icon) is embedded directly beneath the brand logo.
  - Supports full button view in expanded state and compact icon button in collapsed state.
  - Launches `WorklistManualCaseModal` without requiring navigation away from the active screen.
- **Mobile Responsive Drawer (`src/components/layout/mobile-nav-drawer.tsx`)**:
  - Equivalent quick-action button in the mobile navigation drawer for tablet and smartphone reporting workflows.
