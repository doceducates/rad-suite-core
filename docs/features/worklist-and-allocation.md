# Case Allocation, Discrepancy Matrix, Sorting & WhatsApp Handover

This document specifies the Departmental Worklist architecture, resident case allocation locks, multi-system discrepancy matrix, WhatsApp clinical handovers, and interactive multi-column sorting.

---

## 1. Resident Case Allocation & Discrepancy Matrix
- **Resident/PGR Allocation Locks**: High-volume daily caseloads (40–50 studies) are partitioned dynamically among reporting residents. `POST /api/cases/[accession]/claim` locks a study (`studies.assigned_radiologist_id`, `studies.claimed_at`) to prevent duplicate reporting, rejecting concurrent claims with 409 Conflict. `POST /api/cases/[accession]/release` returns the study back to the unassigned pool. Every allocation event generates HIPAA-compliant audit logs via `auditService.log()`.
- **Companion-Aware Case Release & Multi-Study Disappearance**: When a patient has multiple studies assigned to the clinician (e.g. Lumbar and Cervical Spine under the same MRN), releasing a study automatically releases all companion studies belonging to that patient assigned to the clinician (`releaseCompanions: true`). This ensures the patient completely clears from the clinician's active "My Cases" list, resetting study status from `in_progress` back to `scheduled`.
- **Batch Case Allocation & Release APIs**:
  - `POST /api/cases/batch-claim`: Atomically claims multiple studies for the active resident.
  - `POST /api/cases/batch-release`: Atomically releases multiple studies and their companions.
  - `POST /api/worklist/claim`: Universal compatibility endpoint supporting both `action: 'claim'` and `action: 'release'` for single accessions or arrays of accessions.
- **Workstation Header 1-Click Unassign**: The reporting header (`StitchHeader`) renders an immediate "Unassign" action (`RotateCcw`) when a case is claimed by the current doctor, enabling 1-click release back to the HMIS worklist pool directly from the workstation canvas without returning to the worklist.
- **Study-Wise Spine & Anatomical Sub-Region Filtering**: `unified-case.service.ts` provides clinical sub-region matching (`matchesBodyPart`) directly accessible via `WorklistFilterBar` and `WorklistAdvancedDrawer`. Supports discrete spine segments: All Spine (`spine`), LS Spine (`ls_spine`), Cervical Spine (`cervical`), Thoracic/Dorsal Spine (`thoracic`), and Whole Spine (`whole_spine`), alongside Neuro, Thorax/HRCT, Abdomen/KUB, and MSK.
- **Multi-System Presence & Discrepancy Matrix**: `case-reconciliation.service.ts` tracks study presence across Hospital PACS (`HMIS_PACS:8040`), Vitrea (`VITREA:104`), Local Disk (`E:\Cases`), Cloud S3/Drive, and Punjab HMIS Portal (`http://localhost:8080`). Automatic discrepancy flags highlight orphan console scans missing on the portal or registered orders missing imaging series.
- **Responsive Mobile Shell**: On screens below `md` breakpoint (`< 768px`), desktop fixed sidebars are completely hidden (`hidden md:flex`), and mobile navigation is triggered via a top navbar hamburger button opening `MobileNavDrawer`. Categorized tabs in `WorklistFilterBar` allow quick 1-tap switching between `Department Backlog`, `⭐ My Cases`, `Unassigned Pool`, and `⚠️ Discrepancies`.

---

## 2. Worklist Multi-Select & WhatsApp Clinical Handover Suite
- **Multi-Select & Bulk Case Orchestration**: The Worklist table (`WorklistTable`, `WorklistRowItem`) features page-level header toggle and individual case checkboxes. Clinicians can filter by tab (e.g. `⭐ My Cases`, `🚨 ER`, `Unassigned Pool`) and select arbitrary combinations of cases.
- **Uncluttered & Responsive Selection Bar (`WorklistSelectionBar` & `MyCasesSelectionBar`)**: Fixed floating bar (`fixed bottom-6 left-1/2 -translate-x-1/2 z-40`) rendered dynamically when $\ge 1$ case is selected. Displays a minimalist count badge (`{selectedCases.length}`) without redundant text ("Cases Selected" removed), fully responsive flex-wrap layout, 1-click **"Copy Summary"**, **"WhatsApp"** handover trigger, and clear action.
- **Dynamic Case Status & Summary Sync (`POST /api/worklist/sync-summary`)**:
  - Live synchronization endpoint joining `studies` and `reports` for requested accessions.
  - Automatically resolves real-time workflow statuses (`✅ Verified & Published`, `📤 Submitted to HMIS`, `📄 Reported (Needs Verification)`, `🎙️ PGR Preliminary`, `📝 Draft`, `⚠️ Pending`, `⏳ Awaiting Report`, `🔄 Amended`) both in `WorklistWhatsappModal` on open and before writing `handleQuickCopy` summaries to the clipboard.
- **Clinical WhatsApp Markdown Formatter (`whatsapp-handover.ts`)**: Formats cases into standard clinical handover summaries:
  - Header with optional Rad Suite Core branding banner (`🏥 Rad Suite Core — Clinical Case Review / Handover`), hospital name, resident name (defaults to current radiologist Dr. Muhammad Mudassir), date/time, and summary case counts with pending holds breakdown.
  - Per-case breakdown: Patient Name, Age/Sex, Accession Number, Clinical Status (Awaiting Report / Draft / Preliminary / Verified / Pending hold notes), Modality/Exam description, MRN, Key Diagnosis Highlights, Department (ER/OPD/Ward), Priority (STAT), and Critical Finding alerts.
  - Optional senior consultant name, custom clinical note/instructions, and HMIS Portal verification sign-off reminder.
- **Smart Responsive Fields Dropdown & Fast Presets (`WhatsappHandoverDropdown`)**:
  - **Zero-Clutter Popover Design**: Replaces monolithic checkbox clutter with a compact `Fields & Format ({active}/{total})` trigger button with responsive backdrop popover.
  - **Simple Mode Preset (`SIMPLE_HANDOVER_FIELDS`)**: 1-click preset that outputs ultra-concise handovers tailored for daily clinic shifts or evening classes (Senior Consultant, Date, Resident Radiologist, Patient Name, Accession Number, and Clinical Status only—omitting branding, MRN, department, and redundant fields).
  - **Full Mode Preset (`DEFAULT_HANDOVER_FIELDS`)**: 1-click preset restoring complete diagnostic metadata, highlights, alerts, and HMIS reminder.
  - **Fast Bulk Toggles**: "Select All" and "Clear All" buttons allow instant full-checklist selection or clearing.
  - **Categorized Granular Checklist**: Divided cleanly into *Header & Overview* (Branding, Consultant, Resident, Date/Time, Case Counts), *Per-Case Information* (Patient Name, Accession, Status & Notes, Age/Gender, Modality/Exam, MRN, Diagnosis Highlights, Department, Priority/Alerts), and *Footer & Notes* (Portal Reminder).
  - **Responsive & Touch-Friendly**: Constrained responsive width (`max-w-[calc(100vw-3rem)] sm:w-84`) and scrollable container with escape key / outside click dismissal, ensuring seamless operation across mobile screens, tablets, and 4K diagnostic monitors.
  - **Persistent Local Preferences**: Automatically persists selected field preferences to `localStorage` (`radsuite_whatsapp_handover_fields`) across sessions so your choices remain active for every reporting class.
- **Reporting Class Calendar Date Picker (`WhatsappClassDatePicker`)**:
  - Radiologists frequently conduct case reviews and reporting classes with supervising consultants on previous days (e.g. yesterday `17 Nov 2026`) but send the WhatsApp handover at a later time.
  - Features an interactive calendar picker popover powered by canonical `CalendarPicker`, complete with fast 1-click **"Today"** and **"Yesterday"** presets and month navigation.
  - Dynamically updates the message header to `📅 *Class Date:* 17 Nov 2026` when customized, eliminating misleading real-time dispatch timestamps.
  - Class dates and recent phone numbers are automatically remembered in `localStorage` (`radsuite_whatsapp_last_class_date`, `radsuite_whatsapp_last_phone`).
- **AI-First Clinical Highlights with Ultra-Concise Fallback**:
  - **AI Provider Synthesis (`generateAiDiagnosisHighlight`)**: Uses active provider (OpenRouter or local Ollama) to synthesize an ultra-concise primary finding takeaway (< 50 chars, 5–7 words) focusing strictly on `[Site] + [Pathology]`. Runs asynchronously in the background on report save without blocking workstation latency, and persists to `reports.diagnosisHighlight`.
  - **Deterministic Ultra-Concise Fallback (`extractDiagnosisHighlight`)**: When AI is unavailable or offline, deterministically extracts the primary numbered/bulleted impression clause, strips parentheticals and subordinate clauses (`with...`, `causing...`, `resulting in...`), and cleanly caps at word boundaries under ~58 chars.
  - **WhatsApp Handover Integration**: `HandoverFieldsConfig.includeDiagnosisHighlights` appends `• 🎯 *Key Diagnosis:* <highlight>` to formatted WhatsApp messages.
  - **Constrained Worklist Diagnostic Badges (`WorklistDiagnosisBadge`)**: Non-intrusive `🎯` diagnosis pill in `WorklistMultiStudyList` under study descriptions. Width strictly constrained (`max-w-[160px] sm:max-w-[185px]`) so table layout never clutters. Expands on click with `e.stopPropagation()` and shows full diagnosis tooltip on hover.
- **Universal WhatsApp App & Web URL Dispatcher**: Handles Pakistani local phone number formats (`0300xxxxxxx` -> `92300xxxxxxx` international E.164 normalization). Dispatches universal direct chat URLs (`https://api.whatsapp.com/send?phone=...&text=...`) or generic share links for instant group and senior consultant communication without copying and pasting manually.
- **Interactive Handover Modal (`WorklistWhatsappModal`)**: Provides live preview of generated handover markdown, live character counter, active preset badge ("Simple Mode"), direct clipboard copy feedback, and optional inputs for senior consultant name and WhatsApp number.

---

## 3. Interactive Multi-Column Worklist Sorting & Timestamp Parsing Engine
- **Two-Way Header Toggle Interaction**: Table column headers (`WorklistSortHeader`) in the Departmental Worklist are interactive. Clicking any column (Accession, Patient Details, Modality, Study Date & Time, Workflow Status, Assignment, Source) sorts ascending on the first click and toggles to descending on the second click.
- **Directional State Management & Visual Cues**: Active sorting headers display directional arrows (`ArrowUp` for ascending, `ArrowDown` for descending) highlighted in semantic `text-primary`. Inactive headers show subtle `ArrowUpDown` on hover (`opacity-0 group-hover:opacity-100`).
- **Comprehensive Timestamp Parsing (`parseStudyTimestamp`)**: `study-sorting.ts` normalizes both ISO 8601 strings (from database `scheduledAt`) and DICOM standard formats (`YYYYMMDD` + `HHMMSS`), enabling chronologically exact ordering across heterogeneous PACS and HMIS data sources.
- **Full-Dataset Sorting Integration**: `buildWorklistQueryParams` maps client sort column/direction to backend `sortBy` parameters (`date_asc`, `date_desc`, `accession_asc`, `accession_desc`, `patient_name_asc`, `patient_name_desc`, `modality_asc`, `modality_desc`, `status_asc`, `status_desc`, `priority_asc`, `priority_desc`, `source_asc`, `source_desc`), ensuring pagination respects the global sorted order.

---

## 4. Dedicated "My Cases" Workstation & Batch Action Suite (`/my-cases`)
- **Active Shift Default & Personal Queue Date Arrangement**: "My Cases" is arranged by the date/time the clinician took up each case (`claimedAt`). The default active shift filter (**Today + Yesterday** via `dateRange: 'shift'`) displays all cases claimed during the current shift—including older or prior month examinations taken up recently—while older claims (e.g. from 5+ days ago) are cleanly filtered out until expanding to Last 7 Days, Last 30 Days, All Archive, or **📅 Custom Range**. Conversely, the general Departmental HMIS Worklist evaluates strictly against the study examination date on the HMIS portal. Date sorting in "My Cases" sorts by taken up time so recently claimed cases appear at the top of the queue.
- **Ergonomic Clinical Filter Bar (`MyCasesFilterBar`)**:
  - **Clinical Status Dropdown**: Filter cases by reporting stage (`⏳ Awaiting Report`, `🎙️ PGR Preliminary`, `⚠️ Pending Info/Issue`, `📝 Discussed / Typing`, `📤 Submitted to HMIS`, `✅ Verified & Published`, `🔄 Amended`).
  - **Modality & Anatomy**: Filter by modality (`CT`, `MRI`, `CR/X-Ray`, `US`) and spine/anatomy segments (All Spine, LS Spine, Cervical Spine, Thoracic Spine, Whole Spine, Neuro, Thorax/HRCT, Abdomen, MSK).
  - **Department & Triage**: 1-click pills for `All Dept`, `🚨 ER`, `🏥 OPD`, `🛏️ Ward`, plus `🚨 STAT Only` priority toggle.
  - **PACS Image Readiness**: `📷 Images Ready` toggle restricts the table to cases with downloaded DICOM images ready on local storage or PACS.
  - **Film Charges & 1-Click Reset**: `🧾 Film Charges` toggle displays ancillary billing entries, and a reactive `RotateCcw` Reset button restores the clean active shift default.
- **Batch Lifecycle Status Dropdown Parity**: Floating selection bars (`MyCasesSelectionBar` and `WorklistSelectionBar`) match the table's exact 7 clinical statuses, allowing residents to update batches of cases (e.g. marking 10 cases as `🎙️ PGR Preliminary` or `📝 Discussed / Typing` simultaneously).
- **Batch HMIS Draft Save**: Sequential dispatch of selected cases to HMIS drafts (`action: 'save'`), adhering to the **Durable Local Vault First** invariant with live progress bar and status feedback.
- **WhatsApp Senior Consultant Verification & Daily PGR Handover**: Preset formatting options tailored for verification requests sent to senior consultants and PGR daily shift handovers.
- **Zero-Submit Hard Safety Lock**: Final case submission remains hard-locked (`🔒 Locked`) during testing phase per Punjab HMIS Critical Safety Invariants.

---

## 5. Multi-Study Patient Linking, Film Charges Filtering & Structured Quick Reporting
- **Multi-Study Single-Row Patient Consolidation (`📚 N Studies Order`)**:
  - Replaces duplicate table rows for the same patient with a consolidated single row per patient encounter (`consolidatePatientStudies` in `src/services/unified-case-grouping.ts`). For instance, if patient `61202523608470 Rameen Abid` has 3 distinct MRIs (Cervical, Lumbosacral, and Dorsal Spine), they appear as 1 unified patient row in `/worklist` and `/my-cases`.
  - **Explicit Accession Visibility & Workstation Routing**: Rendered via `WorklistMultiStudyList` (`src/components/worklist/worklist-multi-study-list.tsx`). Every individual accession number is explicitly displayed in monospace, accompanied by a 1-click `CopyButton` and direct link to `/workstation/[accession]`.
  - **Diagnostic Metrics & Priority Aggregation**: Total slice counts and series counts are summed across all studies. If any study in the order is flagged `priority: 'stat'` or contains critical findings, the consolidated row automatically adopts STAT priority and critical alerts so urgent multi-study patients are never missed.
  - **Strict MRN Integrity Guard**: Unlinked walk-ins, generic, or missing MRNs (`'unknown'`, `'n/a'`, `'none'`, `'-'`) are never merged together, preventing accidental grouping of unrelated walk-in cases.
  - **Full-Worklist Pagination & `groupBy` Support**: Grouping executes prior to limit/offset pagination, ensuring patients are never split across page boundaries. Callers can pass `groupBy: 'study'` to view unrolled individual study rows when desired.
  - **WhatsApp Clinical Handover Integration**: `whatsapp-handover.ts` formats multi-study patients by rendering a numbered sub-study list with each study's accession number, modality, and description.
  - Workstation reporting header (`StitchHeader`) displays a companion study quick-switcher banner so the radiologist can review and toggle between other exams of the same patient directly while dictating.
- **Film Charges Classification & On-Demand Backlog Toggle**:
  - Hospital reception often allocates separate accession numbers for film and media billing (e.g., `FILM CHARGES`, `MRI FILM CHARGES`, `CT FILM CHARGES`).
  - `unified-case-filters.ts` and `hmis-worklist-normalizer.ts` classify billing items using regex pattern `/film\s*charge|charges?\s*(for)?\s*film|printing\s*charge|cd\s*charge/i`, setting `isFilmCharges: true`.
  - **Hidden by default** from the worklist backlog (`hideFilmCharges: true`) to eliminate clutter and keep clinicians focused on diagnostic studies.
  - Filter bar features a dedicated toggle button `[ ] Billing (N)` showing the exact count of hidden billing items.
  - **Search Query Bypass**: Searching by accession number, MRN, or patient query text automatically bypasses the filter, surfacing billing studies on-demand so radiologists can report against them if the hospital staff did not bill the primary study.
  - Displayed in the worklist with an amber `🧾 Film Charges` badge.
- **Manual Case Indicator (`[✍️ Manual Entry]`)**: Visually flags manually created cases (`isManual: true` or `MAN-...` accession) to distinguish them from scraped/synced HMIS studies.
- **1-Click Reconciliation Dialog (`WorklistMergeModal`)**: Prompts the clinician to merge findings and impression from a manual draft case into an official HMIS accession and archive the duplicate (`POST /api/worklist/merge-manual`).
- **PACS Workstation Multi-Source Table (`/pacs`)**: Dedicated imaging table querying Local Disk (`E:\Cases`), S3 Cloud, Google Drive, Orthanc PACS, and Clinic Edge Nodes with storage source filter pills and direct RadiAnt launching.
- **Structured Quick Reporting & Text Formatting**: Quick report modal auto-detects anatomy from scan description and pre-fills structured templates with uppercase anatomical headings, bullet points (`• `), and numbered impressions (`1. `, `2. `). Includes 1-click toolbar helpers to insert bullets, numbers, and re-format lists sequentially.

---

## 6. HMIS Draft Dispatch & Revert Ownership Gating (Strict Claim Lock)
- **Zero Accidental Dispatch Guarantee**: Save to HMIS draft (`HMIS Draft`) and template revert (`Revert HMIS`) actions are strictly restricted to cases claimed by the active clinician.
- **Worklist Row Actions**: Row-level quick HMIS dispatch button (`WorklistQuickHmisButton`) is hidden unless `study.assignedRadiologistId === currentUserId`.
- **In-Place Report Modal & Full Workstation**:
  - If a study is unassigned, HMIS Draft and Revert buttons are replaced with a prominent 1-click **"Take Up Case"** button.
  - Clicking "Take Up Case" atomically calls `POST /api/cases/[accession]/claim`, claims the study in Rad Suite, reactively updates local state, and immediately unlocks the HMIS actions.
  - If a study was claimed by another clinician, a locked badge is displayed (`🔒 Claimed by [Doctor Name]`), preventing accidental overrides.
- **Backend Enforced Authorization (`/api/hmis/draft` and `/api/hmis/revert`)**:
  - The API verifies `studies.assigned_radiologist_id` against the authenticated session user.
  - If unassigned and requester is not admin: rejected with `400 Bad Request` ("Please take up this case in your worklist before saving drafts to HMIS.").
  - If assigned to another doctor and requester is not admin: rejected with `403 Forbidden` ("Case is assigned to another clinician. Only the assigned radiologist can dispatch drafts to HMIS.").
  - System administrators retain emergency override capability (`user.role === 'admin'`).

---

## 7. HMIS Patients Worklist Isolation & Safe Index Cleanup
- **HMIS Patients vs. PACS Archive Isolation**:
  - The **HMIS Patients** worklist (`/worklist`, renamed from "Department Worklist") strictly ingests records from the HMIS database index (`dbMap`), presenting accurate HMIS procedure names (`cpt` / `scanType`), patient demographics, departments, and rooms.
  - Raw physical disk archive folders (e.g. offline test folders in `E:\Cases`) are never injected into the HMIS worklist, preventing orphan scans with sequence names (such as "Loc SG") from cluttering clinical patient records.
  - The raw DICOM archive remains cleanly isolated in **DICOM Archive** (`/pacs`) and **PACS Viewer** (`/workstation`).
- **Active Shift (48h) Default Worklist Filter**:
  - HMIS Patients automatically defaults to the active clinical shift (the last 48 hours via `dateRange: 'shift'`).
  - Quick date pills (`🕒 48h`, `Today`, `7d`, `All`) and a 1-click `📷 Images Ready` toggle allow instant filtering between current cases and historic archives.
- **Single Clean PACS Image Readiness Indicator**:
  - Replaced verbose text tags with a minimalist, high-contrast status badge:
    - `📷` (Emerald): DICOM images verified on local disk / PACS, ready for reporting. Tooltip shows series and instance counts.
    - `⏳` (Amber): Awaiting PACS transfer or image arrival.
- **Safe Index Cleanup & Pruning (`POST /api/cases/batch-delete`)**:
  - Radiologists can prune unneeded cases from the workstation index using individual delete or multi-select **"Remove (N)"** in `WorklistSelectionBar`.
  - **Zero-Loss User Vault Invariant**: `case-deletion.service.ts` automatically protects and preserves cases with saved reports (draft, preliminary, final) and claims. Skipped cases are reported transparently to the clinician.

---

## 8. Consolidated 6-Column Table & PGR Dual-Lifecycle Framework

### 6-Column Consolidated Ergonomic Architecture
To eliminate horizontal scrolling and maximize clinical density on workstation laptops and diagnostic monitors, the primary case tables (`/worklist` and `/my-cases`) are consolidated from 10 crowded columns to 6 ergonomic columns:
1. **`[ ]` Multi-select** (`w-10`, Center): Case batch selection for claiming, releasing, batch HMIS drafting, deletion, and WhatsApp handover.
2. **`Patient & Identifiers`** (`min-w-[240px]`, Left):
   - **Line 1**: Patient Name (bold link to workstation) • Age/Gender (`45y M`) • Edit Patient icon • Multi-Study companion badge (diagnostic exams only).
   - **Line 2**: Accession Number (monospace primary with 1-click copy) • MRN (monospace with 1-click copy) • Patient Mobile / Contact (`tel:0300...` with 1-click calling and copy, or `+ Phone` fallback editor) • Exam ID • Manual Entry badge (`✍️`).
3. **`Study & Modality`** (`min-w-[220px]`, Left):
   - **Line 1**: Modality pill (`CT`, `MRI`) • Urgent `STAT` pulsing badge (if urgent) • Department (`OPD`, `ER`, `Ward`) • Image readiness badge (`📷` / `⏳`).
   - **Line 2**: Study Description (bold/medium text truncated with tooltip) • Film Charge badge (if flagged).
   - **Line 3**: Series and instance counts (`3 series • 150 instances`).
4. **`Date & Origin`** (`min-w-[140px]`, Left):
   - **Line 1**: Study Date & Time (`03/10/26 9:36 PM`).
   - **Line 2**: Storage Origin badge (`[Local]`, `[PACS]`, `[HMIS]`, `[S3]`) • HMIS tracking refresh button • Live institutional status badge.
5. **`Status & Claim`** (`min-w-[165px]`, Left):
   - **Line 1**: Clinical workflow status selector (`⏳ Awaiting Report`, `🎙️ PGR Preliminary`, `⚠️ Pending Info/Issue`, `📝 Discussed / Typing`, `📤 Submitted to HMIS`, `✅ Verified & Published`). Selecting `pending` automatically opens the `PendingReasonModal`.
   - **Line 2**: Interactive Clinical Pending Badge (`WorklistPendingBadge`) surfacing high-visibility hold reasons (`⚠️ Missing History Form`, `⚠️ HMIS Tech Ack Pending`, `⚠️ PACS Transfer Pending`, `⚠️ Awaiting Prior Films`, etc.), with author/date tooltips and 1-click note review/edit.
   - **Line 3**: Allocation state (`⭐ Claimed by You` + `Release` button, OR `[Take Up Case]` button, OR `🔒 Dr. [Name]`).
6. **`Actions`** (`w-[150px]`, Right):
   - Action cluster: `Quick HMIS Draft` button, `Read` modal button (`<Eye>`), `Open` full workstation button (`<MonitorPlay>`), and `Delete` button (`<Trash2>`).
   - *Desktop RadiAnt external launcher removed per user request to streamline row space*.

### The Dual-Lifecycle Framework (PGR Workflow vs HMIS Institutional Tracker)
The workstation distinguishes between the hospital's institutional IT stages and the actual clinical day-to-day lifecycle of Postgraduate Residents (PGRs) reporting 50–60 patients daily:
- **Lifecycle A (Workstation Clinical Pipeline)**:
  1. `scheduled` (**⏳ Awaiting Report**): Scan completed, paper history form collected, awaiting PGR review.
  2. `preliminary` (**🎙️ PGR Preliminary**): PGR reviews DICOM scans late night, authoring preliminary findings via dictation or voice notes.
  3. `pending` (**⚠️ Pending Info/Issue**): Blocked by missing paper history form (`missing_history_form`), technologist HMIS acknowledgment missing (`technologist_ack_pending`), DICOM transfer pending (`pacs_transfer_pending`), or prior comparison films retrieval. PGRs have full state machine authorization to set and clear pending holds.
  4. `draft` (**📝 Discussed / Typing**): Morning consultant review complete; findings agreed upon; ready for final typing.
  5. `submitted` (**📤 Submitted to HMIS**): Report pushed to Punjab HMIS and submitted into consultant verification queue.
  6. `final` (**✅ Verified & Published**): Consultant verified report on HMIS; downloadable signed PDF ready.
- **Lifecycle B (Punjab HMIS 9-Stage Milestone Tracker)**:
  Institutional lifecycle tracked via government portal (`Order Created` $\rightarrow$ `Reception` $\rightarrow$ `Scheduled` $\rightarrow$ `Pending Ack` $\rightarrow$ `Radiographer Ack` $\rightarrow$ `Scan Performed` $\rightarrow$ `Draft Saved` $\rightarrow$ `Consultant Verified` $\rightarrow$ `Published`).

### Manual Case Registration in "My Cases"
- The "My Cases" toolbar includes a prominent `+ Manual Case` button.
- When a clinician creates a manual case from "My Cases", the system automatically sets `assignedRadiologistId = currentUserId`, `assignedRadiologistName = currentUserName`, and `claimedAt = now`.
- The case immediately appears in the resident's active shift queue without requiring a separate "Take Up" action.

### Multi-Study Film Charge Exclusion Clinical Rule
- Ancillary line items such as "Film Charges", "Printing Charges", and "CD Charges" are financial billing rows, NOT clinical diagnostic scans.
- `src/services/unified-case.service.ts` and `src/app/workstation/[accession]/page.tsx` filter patient groups to exclude `isFilmCharges` and `isFilmChargesStudy`.
- A patient receives the `📚 Multi-Study` badge **only** if they have $\ge 2$ distinct diagnostic scans (e.g. Brain + Cervical Spine). A patient with 1 Brain scan and 1 Film charge is counted strictly as 1 single study, eliminating misleading badges.

---

## 7. Persistent Table Filters Across Workstation Views (`table-filter-storage.ts`)
- **Durable Filter Memory**: Clinical table filters across the workstation automatically persist in `localStorage` across page visits, browser refreshes, and reporting workflows:
  - **Hospital Worklist (`/worklist`)**: Modality (CT, MRI, CR, US), Timeframe (Last 48 Hours, Today Only, Yesterday, 7 Days, 30 Days), Department (ER, OPD, Ward), Status (Draft, Preliminary, Submitted, Final), Priority (STAT), Region/Spine, Page Size, Sort.
  - **My Cases (`/my-cases`)**: Modality, Workflow Status, STAT Priority, Department, Spine/Anatomy, Shift Timeframe, DICOM Ready flag, Page Size, Sort.
  - **PACS Workstation (`/pacs`)**: Modality, Date Preset (48h rolling, Today, Yesterday), Storage Source (Hospital PACS, S3, Clinic PC), Search Scope.
  - **Archive Logbook & PACS Query Client**: Modality, date presets, and sort configurations.
- **HIPAA PHI & Clinical Safety Invariant (Zero Search Prefill)**: Free-text search terms, patient names, MR numbers, and accession numbers are **strictly excluded** from storage and are never prefilled upon revisiting a table. The search bar is guaranteed clean and empty on page mount to avoid stale search blindspots and ensure zero PHI retention in browser storage.
- **1-Click Reset Synchronization**: Clicking the canonical "Reset" / "Reset Filters" button on any table resets the UI to default (All Modalities, Shift / 48h) and simultaneously clears or resets the saved state in `localStorage`.
- **Zero-Hydration Mismatch**: Filters are hydrated post-SSR mount via dedicated client-side hooks (`useWorklistFilterPersistence`, `useMyCases`, `HospitalPacsClientView`), avoiding hydration mismatch warnings.

---

## 8. Manual Case Conflict Resolution, Patient Merge & PACS Ingestion
- **Demographics Edit Conflict Detection & 1-Click Merge**:
  - When editing patient demographics or updating accession/MR numbers in `WorklistEditPatientModal`, collisions can occur (e.g. accession already registered on HMIS or MRN existing in database).
  - Rather than failing with an unhandled constraint violation, `study-update.service.ts` detects collisions, returns HTTP 409 Conflict with structured metadata (`isConflict: true`, `conflictStudy`), and renders a prominent 1-click **Merge Case** banner (`ConflictMergeBanner`).
  - Clinicians can click **"Merge Into Existing Case"** to execute `mergeManualCaseToHmis`, which transfers findings, impressions, and clinical history into the official study, moves the author assignment to the active clinician, and cancels the manual duplicate with an audit trail note.
  - On MRN reassignment where the target patient record already exists, `study-update.service.ts` safely reassigns `study.patientId = existingPatient.id` without attempting illegal duplicate primary patient creation.
- **Direct Report Shifting to Accession for the Same Patient / MRN**:
  - In `WorklistEditPatientModal`, the Direct Case Identifiers section is placed immediately at the top of the form.
  - **Single Field Invariant for Multi-Study Orders**: Even when a patient order contains multiple scans/studies, there is strictly **one unified Accession field** and **one unified MRN field**.
  - **Candidate Study Discovery**: The modal automatically discovers other registered studies sharing the patient's MRN (e.g. `192611003581` vs manual `192611003681`).
  - **1-Click Candidate Chips**: Clicking any companion accession chip immediately populates the accession field.
  - **Instant Report Shifting**: When saving or confirming the merge banner, `mergeManualCaseToHmis` transfers diagnostic findings, impression, technique, history, PGR drafts, and author assignment to the target study, reconciles `hmis_draft_vault` entries, sets the target study to `in_progress` in the clinician's "My Cases", and archives the erroneous duplicate with an indelible audit log.
- **Retired Study Unassignment & Primary Card Consolidation Invariant**:
  - When a manual or draft study is merged into an official HMIS study via `mergeManualCaseToHmis`:
    1. The retired source study's assignment is stripped (`assigned_radiologist_id = NULL`, `claimed_at = NULL`) and its status set to `'cancelled'`.
    2. Any old draft report row on the retired study is updated to `status: 'cancelled'`.
    3. `unified-case-filters.ts` explicitly drops cancelled studies from all active worklists by default.
    4. `unified-case-grouping.ts` (`consolidatePatientStudies`) filters out cancelled studies before selecting the primary patient card. This guarantees that the active, official study accession number (e.g. `192611003285` for Wahid, `192611003560` for Nasir Hussain) always represents the patient in "My Cases" and never gets masked by the retired source accession.

- **Direct Hospital PACS Case Ingestion into "My Cases" (`/pacs`)**:
  - Clinicians can claim cases directly from the Hospital PACS index (`/pacs`) without waiting for HMIS harvest.
  - **Single Row Action**: "Take Case" (`UserCheck` icon) in `PacsRowActions`.
  - **Bulk Selection Action**: "Claim N to My Cases" in `PacsUnifiedSelectionBar`.
  - **Auto-Resolution Architecture (`case-import-resolver.service.ts`)**: If the case is not yet present in the workstation's main `studies` table, the resolver imports it from `hospitalPacsStudies` or local disk via `importStudyToWorklist`, creates the patient record if needed, marks it `status: 'in_progress'`, and assigns it to the active radiologist with `claimedAt: now`.
- **Integrated Smart Patient Journey Tracer (Embedded Table Header)**:
  - Instead of floating as an external, detached component above the worklist, `WorklistPatientTracer` is embedded directly into the top of the main table viewport container (`variant="embedded"`).
  - Simultaneously cross-references the local workstation database (`/api/cases/[accession]/details`), published archives (`/api/hmis/published`), and live tracking queues (`/api/hmis/tracking-list`) to display real patient demographics and 4-step lifecycle status (Order Intake $\rightarrow$ Tech Ack $\rightarrow$ Reporting $\rightarrow$ Published).
  - When searching an un-ingested historical accession or MRN, the tracer provides an in-place **"Search & Pull from HMIS"** trigger that automatically queries with the inferred accession calendar month.

---

## 9. Patient Encounter Clustering vs Lifetime Grouping (Prior Studies Invariant)
- **Clinical Encounter Window (36 Hours / Calendar Date)**:
  - `consolidatePatientStudies` (`src/services/unified-case-grouping.ts`) and `markCompanionStudies` (`src/services/unified-case-stats.ts`) cluster diagnostic studies by **Patient Encounter** rather than collapsing all studies across the patient's entire lifetime under their MRN.
  - Studies performed within 36 hours (e.g. Cervical + Lumbosacral Spine ordered together in the same imaging session) are consolidated into a multi-study order (`📚 2 Studies Order`).
- **Separation of Active Encounters from Historical Priors**:
  - Studies performed on different dates/visits (e.g. Cervical Spine 3 weeks ago on 31-Oct-2026 vs Lumbosacral Spine yesterday on 20-Nov-2026) remain **distinct worklist rows**.
  - The new active study appears in the **Reporting Queue** (`status: 'scheduled'`), matching rolling date filters (`48h Shift` / `Today`) with its own accession number (`192611007781`).
  - Historical completed examinations appear in **Published & Priors** (`status: 'final'`).
- **Active Unread Priority Invariant**:
  - Within any multi-study encounter cluster, candidate selection prioritizes active work: `stat` > `draft/preliminary/in_progress` > `scheduled/awaiting_report` > `final/published`. A completed study can never mask an active unread study in the same order.
- **Prior Studies Awareness & 1-Click Comparison**:
  - The newer encounter row detects earlier diagnostic examinations and attaches `priorStudies: [{ accessionNumber, studyDescription, modality, studyDate, status, reportId }]`.
  - **Worklist Prior Badge (`WorklistPriorBadge`)**: Renders a dedicated `📜 1 Prior` amber pill next to patient demographics. Clicking reveals prior examination history with direct links to view previous reports.
  - **Workstation Header Priors (`StitchHeader`)**: Renders `📜 Prior: ACC [Modality] Description ↗` chips directly in the top workstation header bar. Prevents batch draft dispatch from accidentally overwriting prior reports while providing immediate 1-click comparison for interval reporting.





