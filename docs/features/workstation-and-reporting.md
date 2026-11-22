# Unified Workstation Layout, PiP Window & Mobile Diagnostic Suite

This document specifies the ZenWorkstation layout, case-free standby launching, desktop PiP reporting mode, and mobile responsive diagnostic workflows.

---

## 1. Standalone Workstation & Case-Free Launch Architecture
- **Root Route Decoupling**: Workstation navigation in the clinical sidebar (`NAV_ITEMS`) links directly to `/workstation` rather than any hardcoded patient accession.
- **Standby State**: When accessed without an accession parameter (`/workstation`), `ZenWorkstation` operates in standalone standby mode (`hasStudy: false`). The main viewport renders `ZenWorkstationStandby` offering immediate PACS archive search (⌘K), clinical worklist navigation (⌥1), ad-hoc report drafting, and quick-launch cards for local/recent cases.
- **Ghost Auto-Save Prevention**: In standalone mode without an accession number or existing report ID, automatic background persistence (`useReportEditorActions`) is halted until the clinician explicitly initiates a save or selects a diagnostic study.

---

## 2. Desktop Multi-Mode Reporting & Resizable PiP
- **Global Sidebar Consistency**: `ZenWorkstation` integrates the workstation's main desktop navigation (`<Sidebar />`) and mobile drawer (`<MobileNavDrawer />`), eliminating disparate workstation sidebars (`StitchLeftRail`). The workstation sidebar dynamically binds `userName`, `userRole`, and `userTitle` from the active clinician session, rendering the logged-in doctor's actual credentials across all bottom navigation clusters.
- **Desktop Multi-Mode Reporting & Resizable PiP**: On desktop and large displays (`>= 768px`), reporting defaults to `'split'` mode alongside the PACS viewport with a resizable divider. Switching to Floating PiP mode (`reportingMode === 'modal'`) renders a full draggable, resizable window (`usePipWindow`, `StitchPipResizeHandles`) that can be freely repositioned or minimized.
- **Compact 48px Floating FAB (`ZenCompanionPipFab`)**: Minimizing the floating companion window collapses it into a sleek 48px draggable circular FAB anchored to the right side with active tab icon, live pulse indicator, and tooltip. Both clicking `-` (minimize) and `X` (close) safely collapse the window to this FAB, ensuring the companion panel is never lost or destroyed. A single click restores the full floating window immediately.
- **Center Action Hub in Reporting Footer (`ZenReportFooter`)**:
  - **Zone 1 (Left)**: Real-time word count, auto-save status telemetry, and 1-click `Copy Report` button.
  - **Zone 2 (Center)**: Primary clinical action hub: `VoiceStudio` (`[ 🎙️ VoiceStudio ]` with active recording indicator and waveform), `Save Draft` (local workstation vault), `HMIS Draft` (Punjab HMIS portal sync), and adjacent `ZenReportFooterMenu` (`⋯`) housing secondary actions (`Revert HMIS Template` with confirmation dialog, `Google Docs` sync/open). Centered horizontally with 0% corner or floating window collision.
  - **Zone 3 (Right)**: Layout indicators and auxiliary controls.
- **Dedicated Central VoiceStudio Placement**: VoiceStudio dictation trigger is removed from the top headers and consolidated exclusively in the central bottom action group alongside Save and HMIS Draft, and remains accessible via global `Alt+D` keyboard shortcut. Active recording displays an animated audio waveform.
- **Clean App Bar Navigation (`StitchHeader`)**: The main top bar displays clean, focused search and navigation without duplicate branding (branding is reserved exclusively for the left sidebar). It houses:
  - **Fast Worklist & Patient Navigation**: A direct `[ 📋 Taken Up (Mine) ]` link to `/worklist?tab=my_cases` for immediate reporting access to cases claimed by the logged-in doctor.
  - **Patient Reporting Queue Dropdown (`ZenPatientQueueDropdown`)**: A dropdown in the top header displaying the active patient and case queue with live **3-dot progress indicators** (`ReportSectionDots`):
    - **Canonical Taken Up Logic (`assignedTo: 'me'`)**: Default queue scope (`⭐ Taken Up (Recent 48h)`) queries `/api/worklist?assignedTo=me&dateRange=48h`, displaying the clinician's exact taken-up/claimed studies from today and yesterday (the active 48-hour shift window) with 100% parity with `/my-cases`.
    - **Readable Date & Time Display**: Every entry in the queue prominently displays its scan and claim timestamp (`Today, 8:13 PM`, `Yesterday, 8:12 PM`, or `DD Mon, HH:MM AM/PM`) with clock icon, accession number, and MRN.
    - **Multi-Scope Triaging**: Fast toggle chips allow switching between:
      - `⭐ Taken Up (Recent 48h)`: Active shift queue (today and yesterday).
      - `All Backlog (Mine)`: Complete history of all cases assigned to the clinician.
      - `Incomplete`: Studies missing one or more report sections (History, Findings, Impression).
    - **Dot 1 (History)**: Solid emerald circle when Clinical History is written; hollow ring when empty.
    - **Dot 2 (Findings)**: Solid emerald circle when Findings are written; hollow ring when empty.
    - **Dot 3 (Impression)**: Solid emerald circle when Impression is written; hollow ring when empty.
    - **Real-Time Synchronized**: Reflects typing/dictation edits on the currently loaded report in real time without waiting for background persistence.
    - **Sort-Aware Predictive "Next" Jump**: The adjacent `[ Next ❯ ]` button strictly follows the active sorting selection (Date Newest/Oldest, Name A-Z/Z-A, or Completion Status). It advances predictably to the exact subsequent study in the sorted sequence without skipping over reported studies. The in-dropdown `[ ⚡ Next Unreported Patient ]` banner remains available as a secondary shortcut for jumping directly to incomplete studies. User sort choices are persisted in `localStorage` across case switches.
    - **Queue Search**: In-menu instant search by patient name, accession, MRN, modality, or exam description.
  - **Global & Scoped PACS Archive Search (`⌘K`)**: Clinicians can trigger global search or click `[ Search Mine ]` to open `PacsSearchModal` pre-filtered to their active taken-up cases (`assignedFilter: 'me'`).
  - **In-Modal Scope Switcher**: Inside `PacsSearchModal`, a toggle between `[ All Archive ]` and `[ ⭐ Taken Up (Mine) ]` lets radiologists triage assigned studies without leaving the diagnostic viewport, paired with a direct header link to the full `/worklist?tab=my_cases` workstation queue.
- **Ultra-Compact 2-Row Report Header (`ZenReportHeader`)**: Engineered strictly to a 52px total height, recovering ~300px of vertical space for the clinical editor in split and side-panel modes:
  - **Row 1 (Demographics & View Controls)**: Truncated patient name (`max-w-[180px]`) with tooltip, age/gender chip (`45Y • M`), modality badge (`MR`), compact 3-dot report progress (`1/3`), 1-click demographic copy, biographical edit modal button, real-time DB sync micro-indicator, and layout mode switcher.
  - **Row 2 (Clinical Context & Navigation Tabs)**: Truncated study description (`MR LT KNEE`), accession number chip with 1-click copy, optional distinct MRN chip, compact segmented `[ Report ]` / `[ Discuss ]` tab switcher, and version history badge (`v1`).
- **5-Source Diagnostic Sequence Discovery Pipeline**:
  - `Source 1`: Local filesystem cache (`E:\Cases`) for offline workstations.
  - `Source 2`: Cloud S3 object storage via `getS3StudySeries`.
  - `Source 3`: Direct Clinic Edge Node streaming via Orthanc pass-through.
  - `Source 4`: Clinic Gateway microservice (`CLINIC_GATEWAY_URL`) & central PACS database catalog.
  - `Source 5`: Anatomy-aware clinical sequence synthesis (`gateway-study-series.service.ts` & `workstation-constants.ts`), preventing dummy CT sequences from rendering on MRI knee/spine studies.
- **Embedded Consultant Discussion View (`ConsultantDiscussionView`)**:
  - Purpose-built for resident-consultant morning rounds.
  - **Left Column (Abnormal Findings Extractor)**: Dynamically extracts abnormal observations level-by-level (e.g. L4-L5, L5-S1 disc bulges, foraminal stenosis, spinal canal narrowing) while filtering out normal anatomical boilerplate.
  - **Right Column (Fast AI Delta Patcher)**: Enables rapid typing or voice dictation of consultant feedback (e.g. "change L4-L5 to broad-based extrusion compressing exiting nerve root and update impression"). Generates clean unified diffs and 1-click patches to update the report without retyping entire paragraphs.
- **Decluttered Clinical Editorial Strip (`ZenReportToolbar`)**:
  - Positioned above clinical sections (`max-w-3xl mx-auto`). Contains exclusively the modality-aware Normal Template selector dropdown and `Save as Template` button.
  - Redundant copilot buttons, AI model badge pills, and medical highlight tag buttons (`Critical`, `Follow-up`, `Normal`) are stripped to prevent visual cognitive overload during diagnostic reporting.
- **Automated HMIS Reporting Doctor Signature (`useHmisDoctorSignature`)**:
  - Automatically ensures and synchronizes the reporting resident's name (`Reported by: Dr. ...`) at the bottom of the clinical impression field in real-time, matching HMIS user profile settings without manual typing.

---

## 3. Mobile Responsive Full-Viewport & Bottom-Right FAB
- **Full Viewport Immersion**: On mobile devices (`< 768px`), side-by-side splits and floating pills are suppressed in favor of 100% viewport imaging and an unobtrusive bottom-right FAB (`ZenReportingFab` at `fixed bottom-6 right-6 z-40`).
- **Mobile Screen-Covering Diagnostic Suite (`ZenCompanionMobileModal`)**: Tapping the FAB on mobile expands into an immersive full-screen modal featuring dedicated tabs:
  - **Report**: Diagnostic reporting canvas with touch-optimized footer (`Save Draft` + `HMIS Draft` large tap targets), smart dictation, template library, and 1-click sync.
  - **DDx**: Ranked differential diagnosis generator with clinical probabilities, distinguishing features, and Fleischner/guideline citations.
  - **Chat**: MedGemma diagnostic copilot for case inquiries, measurement validation, and differential mimic analysis.
  - **Pearls**: High-yield academic pearls and diagnostic criteria cards.
  - **Images**: Case key images and reference series slice management.
  - **Non-Destructive Minimization**: Collapses back to the bottom-right FAB on backdrop click or close button without losing typed draft contents.

---

## 4. OHIF-Style Smart Scrubber with Cached Slice Buffer Track
- **Buffer Track Visualization**: In `<ZenDicomScrubber />`, an integrated buffer track sits directly beneath the slice range slider, rendering loaded slice intervals as proportional contiguous segments in emerald green (`bg-emerald-500`) and unbuffered slices in surface variant (`bg-surface-variant/40`).
- **Reactive Cache Telemetry**: Subscribes directly to `dicomCache.subscribe` with `dicomCache.getCachedSliceIndices(caseId, seriesNumber)` to dynamically refresh slice availability without reloading the component.
- **Buffer Counter Badge**: Displays real-time caching progress (e.g. `12/12 loaded` in emerald when complete, or `4/14` with a primary pulse animation while streaming).
- **Anatomical Orientation Badge**: Incorporates `resolveOrientationBadge` directly into the series number pill (e.g. `[#1 AX]`, `[#2 SAG]`, `[#3 COR]`, `[#0 LOC]`), providing instant orientation cues during fast multi-planar review.
- **Accessible Slider Controls**: Follows strict WAI-ARIA slider specifications (`role="slider"`, `aria-label="DICOM slice scrubber"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).

---

## 5. Progressive DICOM Streaming & Metadata Propagation Architecture
- **Instant Decoupled Manifest (`/api/cases/[accession]/manifest`)**: Returns a lightweight JSON study manifest (<50ms, ~2KB) detailing study tree structure, series counts, slice dimensions, and orientations. Viewport layout, filmstrip thumbnails, and orientation pills render instantly without waiting for bulk DICOM binary payloads.
- **Zero-Blocking Study Navigation**: Standby case card click immediately routes to `/workstation/[accession]` in <50ms. Background retrieval is dispatched non-blockingly (`keepalive: true`) with source allowlist guards.
- **Multi-Priority Progressive Streaming (`DicomSliceCache`)**:
  - **Priority 1**: Visible slice (Slice 0) of the active pane loads and displays in <300ms.
  - **Priority 2**: Adjacent slices ($\pm 2$) are prefetched immediately for zero-latency wheel scrubbing.
  - **Priority 3**: Filmstrip sequence thumbnails.
  - **Priority 4**: Background sliding window buffer.
- **Sequence-Level Live Progress**: Filmstrip thumbnail cards render anatomical badges (`AX` primary, `SAG` purple, `COR` amber, `LOC` emerald) alongside bottom progress tracks and dynamic slice counters (`loaded/total` with completion checkmarks).
- **Accurate Clinical DICOM Grouping**: Slices are partitioned strictly via DICOM Part 3 tags `(0020,0011)` (`SeriesNumber`) and `(0020,000e)` (`SeriesInstanceUID`), preventing SOP UID collapsing. 3D slice plane normal projection sorts slices deterministically.

---

## 6. GPU Acceleration, Hardware Engine & Tauri Desktop Architecture
- **Zero-Recreation Tauri Architecture**: The desktop workstation application is powered by Tauri 2.0 wrapping the exact same Next.js/React codebase into a native lightweight executable. Zero UI components, business logic, or styles are rewritten.
- **Hardware Graphics Pipeline**:
  - **Direct3D 11 & WebGL2**: Windows WebView2 runs with `--enable-gpu-rasterization` and `--use-angle=d3d11`, executing hardware rasterization directly on the host GPU (NVIDIA, AMD, or Intel Arc).
  - **Shader-Based Contrast LUTs**: Window/Level adjustments are computed in real time via GLSL/HLSL fragment shaders in 0.1ms at 120+ FPS, eliminating CPU rasterization bottlenecks.
  - **Diagnostic Refresh Rate Sync**: Workstation supports high-refresh diagnostic displays (60Hz, 120Hz, 144Hz, or uncapped) for tear-free cine playback.
  - **VRAM Texture Buffer Allocation**: Configurable 1GB to 8GB dedicated VRAM cache prevents thrashing during multi-series volumetric CT/MRI reviews.
  - **Native NVMe Direct Disk I/O**: In Tauri desktop mode, local disk cases can be read via memory-mapped native Rust file handles (3,000+ MB/s) bypassing HTTP serialization overhead.
- **Hardware Telemetry Settings Panel (`<GpuAccelerationSettings />`)**: Located in Settings under the Workstation Display tab, surfacing live GPU hardware vendor/renderer detection, WebGL2 capability flags, and controls for GPU rasterization, contrast engine, and VRAM allocation.

---

## 7. Medical Viewport Scroll Damping & S3 Physical Slice Synchronization
- **Calibrated Mouse Wheel Delta Accumulation**: In `useDicomViewport`, raw `wheel` events from high-precision trackpads and free-spinning wheels are normalized (`deltaMode` scaled) and accumulated into `wheelDeltaAccumulator` against a clinical 60px threshold. Micro-events are debounced with a 200ms decay, and steps per event are clamped to $\pm 2$ slices, preventing hyper-speed scrolling and runaway slice skipping.
- **S3 Physical Slice Manifest (`manifest.json`)**: S3 cloud storage series are indexed via physical slice ordering computed from DICOM Part 3 plane normal projection (`dist = IPP · N`) and `InstanceNumber`. S3 buckets store a `manifest.json` per study folder, and `s3-retrieval.service.ts` resolves pre-sorted keys directly, eliminating random SOP Instance UID ASCII ordering.
- **Co-Planar Lockstep Series Synchronization**: In `useOrientationSync`, coplanar views (e.g. Sagittal T2, Sagittal T1, and Sagittal STIR) share normalized spatial progress, ensuring multi-pane views scrub in exact anatomical lock-step across midline and neural foramina.

---

## 8. Two-Word Clinical Navigation Standards & Archive Consolidation
- **Standardized Two-Word Navigation Vocabulary**: Eliminates ambiguous single-word names across the entire workstation shell:
  - **Hospital Worklist** (`/worklist`): Master departmental radiology worklist, Taken Up (Mine) queue, Proceeded Patients, and permanent Archive Logbook.
  - **Hospital PACS** (`/pacs`): High-throughput query and harvesting workstation modeled after RadiAnt PACS with multi-criteria filtering and bulk S3 synchronization.
  - **Workstation** (`/workstation`): Complete diagnostic imaging viewport and voice reporting workspace.
  - **Rapid Scribe** (`/batch`): Accelerated continuous reporting hub for multi-case reporting flows.
  - **Voice Lab** (`/studio`): Audio telemetry, microphone calibration, noise gating, and macro testing lab.
- **Patient Records & Logbook Consolidation**:
  - The standalone `/patients` route has been merged into **Hospital Worklist** as the 4th tab: **`[📋 Archive & Logbook]`** (`/worklist?tab=archive`), with `/patients` cleanly redirecting to maintain deep links.
  - Surfaces permanent patient records with integrated `WorklistArchiveToolbar`:
    - **CSV Export**: 1-click export of filtered archive rows to `radiology_logbook_YYYY-MM-DD.csv`.
    - **Print Logbook**: Opens formatted, clean printable clinical logbook table with department header and page counters.
    - **WhatsApp Handover Copy**: Generates formatted, emoji-bulleted clinical handover markdown copied directly to system clipboard for department shift handover.

---

## 14. Hospital PACS Unified Workstation Table (`PacsUnifiedTable`)
- **Consolidated Patient & Identifiers Column**: Formatted identically to Hospital Worklist (`WorklistPatientCell`), displaying the clickable patient name on line 1 (with 1-click copy summary), and stacked mono `MRN: {id}` and `ACC: {accession}` on line 2 (each with its own 1-click clipboard copy button).
- **Streamlined Storage Source Icons**: Replaces verbose text badges with intuitive source badges:
  - **Cloud S3** (`<Cloud className="text-emerald-500" />`): Study is confirmed synchronized to S3 cloud storage via Clinic Gateway or direct mirror.
  - **Remote Clinic PC** (`<Monitor className="text-sky-500" />`): Study resides on the hospital Clinic PC edge node (MedicalSandbox / Orthanc) with on-demand streaming.
  - **Local Storage** (`<Folder className="text-amber-500" />`): Study is cached or stored directly on local workstation disk storage.
- **Series & Slices with Live Edge Progress Bar**: Displays series count and total slice count (`4 Ser • 125 Slices`). When an edge upload is actively underway, an animated progress bar indicates exact progress (`45/125 Slices (36%)`). When fully uploaded, an emerald confirmation badge indicates exact synced slices (`✓ 125/125 Slices Synced`).
- **Clinical Impression & Report Status**: Enriches each study row with real-time reporting data from local `reports` and `studies` tables, displaying the finalized or draft impression summary and report lifecycle badge (`Draft`, `Finalized`), eliminating the need to leave the PACS search view to verify diagnostic report state.
- **1-Click & Batch RadiAnt DICOM Download**: Direct S3 study download via `/api/pacs/download?accession=[acc]` (single study) or `/api/pacs/download?accessions=[acc1,acc2,...]` (batch download). Automatically archives all DICOM series into organized patient and series folders (`192610002552_SONIA/series-1_AX_T2/1.dcm`, etc.) and streams a consolidated master `.zip` package (`RadiAnt_Batch_[N]_Studies.zip`) directly into the browser. Radiologists selecting multiple checkboxes in the PACS table can click **`[ 📥 Download N for RadiAnt ]`** on the floating action bar to download the entire cohort at once and drop the extracted folders into RadiAnt DICOM Viewer.
- **Auto-Broadening Search**: When searching with the default `48h` rolling window, if 0 studies match, the query automatically expands across all dates so radiologists immediately find the patient regardless of when they were scanned.

---

## 15. Clinical Report Export Suite (PDF & Microsoft Word .docx)
- **Multi-Format Document Generation**: Clinicians can export diagnostic reports directly to publication-grade vector PDF (`.pdf`) and editable Microsoft Word (`.docx`) from the workstation.
- **Publication-Grade Formatting**:
  - **Hospital Stationery Header**: Institutional branding for Lahore General Hospital (or configured facility), Department of Radiology & Diagnostic Imaging, and modality-specific exam banner.
  - **Patient Demographics Grid**: Structured table with Patient Name, MRN, Age/Gender, Accession #, Modality, Exam Date, and Study Description.
  - **Clinical Narrative Flow**: Preserves rich-text clinical styling across Clinical History, Technique, Comparison, Findings (bulleted or numbered paragraphs), and Impression (highlighted callout).
  - **Attribution & Verification**: Two-column signature block attributing the Reporting Resident/PGR and Verifying Consultant Radiologist with status and timestamps.
  - **Pagination & PHI Safeguards**: Multi-page text wrapping with "Page X of Y" counters and electronic PHI confidentiality disclaimers.
- **Workstation UI Access Points**:
  - **ZenReportFooterMenu (`⋯`)**: Centrally located in the bottom action bar with `[ Export to PDF ]` and `[ Export to Word (.docx) ]` menu items.
  - **LghReportModal**: Directly downloadable alongside print previews via `[ PDF ]` and `[ DOCX ]` buttons.
- **REST API Endpoints**:
  - `POST /api/reports/export`: Accepts JSON payload (`ReportExportSchema`) with live editor contents or overrides, returning the binary file attachment with automatic browser download triggers.
  - `GET /api/reports/[id]/export?format=pdf|docx`: Downloads existing database reports by report ID or accession number.
- **Audit & HIPAA Compliance**: Every export dispatches tamper-evident audit logs (`logAudit` / `action: 'EXPORT_REPORT'`) with accession and user credentials.

---

## 16. Dynamic Clinician Attribution & Supervising Consultant Persistence
- **Zero Hardcoded Names Invariant**: All mock or hardcoded physician names (`Dr. Sumaira Yousaf (Consultant)`, etc.) have been completely purged from the codebase, database vault, and browser storage.
- **Database Schema Persistence**: `supervising_consultant_name` is stored as a dedicated column in the `users` table (`sqlite.ts`, `users.ts`, `sqlite-migrations.ts`) alongside `hmis_reporting_doctor_name`.
- **HMIS Profile Settings (`/settings?tab=hmis`)**: Clinicians can dynamically set their `Reporting Doctor Name (with Designation)` (e.g. `Dr. Jane Doe (Resident Radiologist)`) and `Supervising Consultant Name` (e.g. `Dr. [Name] (Consultant)`). Changes are saved to both the database via `PATCH /api/auth/me` and `localStorage`, and broadcast via `radsuite:attribution-updated`.
- **Reactive Clinician Attribution Hook (`useClinicianAttribution`)**:
  - Automatically synchronizes `pgrName` and `consultantName` between database user profile and `localStorage`.
  - Automatically purges legacy hardcoded mock strings (such as `Dr. Sumaira Yousaf`) from client caches.
  - Prioritizes `currentUser.hmisReportingDoctorName` over any default title so resident designation is never overridden with `(Consultant)`.
- **Workstation Report Canvas & Real-Time Normalization**:
  - Real-time signature normalization ensures report impressions dynamically reflect the active clinician name and designation without duplication.
  - `stripAttributionFromText` automatically removes doctor signatures when saving reusable templates via `ZenSaveTemplateModal`.
- **Direct 1-Click PDF & DOCX Export**:
  - Direct 1-click `[ 📄 PDF ]` and `[ 📝 DOCX ]` buttons are embedded directly in the workstation report footer (`ZenReportFooter`) beside `HMIS Draft` for instant export without navigating through print modals.
  - Exports generate clean, high-fidelity documents with dynamic clinician attributions and full patient demographics.

---

## 17. Custom Clinical Template Creation & Re-use Pipeline
- **Active Report to Template Capture (`ZenSaveTemplateModal`)**:
  - Clinicians drafting or refining normal/abnormal findings can capture their active report as a reusable template via the `[ 💾 Save as Template ]` button in `ZenReportToolbar` or from the `ZenTemplateSelector` popover.
  - Pre-populates Template Title, Modality (`CT` | `MRI`), Subspecialty (`Neuroradiology`, `Abdominal`, `Thoracic`, `Musculoskeletal`, `Head & Neck`, `Vascular`, `Pediatric`), Technique, Organ-by-organ Findings, and Default Impression.
- **Durable Local Vault & Instant Selector Refresh**:
  - Saved via `addCustomTemplate()` in `template-manager.service.ts` to `localStorage` (`radsuite_custom_templates_v1`).
  - Emits `radsuite:template-saved` global event to trigger zero-delay reactive updates across all open template selectors.
  - Custom templates are visually highlighted with a distinct `[Custom]` badge in the dropdown.
  - Allows 1-click deletion of obsolete custom templates via inline trash actions.

---

## 18. Industry-Standard Report Versioning & Revision Audit Trail
- **Dual-Tier Draft & Revision Invariant (Epic Radiant / Sectra / PowerScribe Parity)**:
  - **Tier 1 (Working Draft)**: Continuous 1.2s debounced auto-save silently writes to the active working draft in the `reports` table. Auto-save is for crash resilience and disaster recovery ONLY; it NEVER increments version numbers or pollutes the immutable `report_revisions` timeline.
  - **Tier 2 (Formal Milestone Versioning)**: An immutable revision snapshot (`v1`, `v2`, `v3`, etc.) is committed exclusively upon:
    1. Explicit clinician manual save (`Save Draft` button or `Ctrl+S`).
    2. Workflow milestone status change (`preliminary`, `final`, `addendum`).
    3. Revision restoration (additive revert preserving forensic audit trail).
- **Intelligent De-duplication & Spam Suppression**:
  - When a manual save is triggered, `recordReportRevision()` hashes and compares current findings, impression, and technique against the latest committed snapshot. If identical, the existing version number is returned without inserting redundant database rows.
- **Reactive Workstation Header Badge (`v{currentVersion} • History`)**:
  - The report canvas header features a dynamic version badge (`v{currentVersion} • History`).
  - Automatically loads the latest revision version on case load (`/api/reports/[id]` or `/api/cases/[accession]`).
  - Reactively bumps upon manual save (e.g. `v1` → `v2`) with a desktop notification (`Report saved as Version N`).
- **Interactive Revision Drawer (`ReportRevisionDrawer`)**:
  - Accessible via 1-click on the `v{version} • History` badge in `ZenReportHeader`.
  - **Visual Timeline**: Lists all formal snapshots with creation timestamp, author name/role, status, and active editor badge (`[Active]`).
  - **Side-by-side Inspection**: Clinicians can preview historical findings and impressions before deciding to revert.
  - **Additive Forensic Restore**: Reverting to an earlier version (e.g. `v1`) restores its contents to the active editor and immediately creates a new additive version (e.g. `v3` with note `"Restored from v1"`), complying with strict HIPAA/DICOM tamper-evident audit guidelines.

---

## 19. Mobile DICOM Multi-Touch Gestures & Server/VPS Workstation Resolution
- **Multi-Touch Gesture Engine (`useDicomTouch`)**:
  - **Focal Pinch-to-Zoom**: Tracks 2-finger Euclidean distance and midpoint coordinates relative to viewport bounds, scaling zoom smoothly between 0.2x and 10.0x around the fingers' focal center.
  - **Simultaneous Two-Finger Pan**: Calculates midpoint displacement ($\Delta x, \Delta y$) between animation frames, enabling natural panning while zoomed in without requiring tool switching.
  - **Tool-Aware Single-Finger Drag**:
    - Window/Level mode (`wl`): horizontal drag alters window width; vertical drag adjusts window center.
    - Pan mode (`pan`): single-finger viewport translation.
    - Default/Scroll mode: vertical drag scrubs through series slices with a calibrated 14px velocity threshold.
  - **Double-Tap Viewport Reset**: Rapid consecutive taps within 350ms (< 35px radius) reset zoom to 1.0x and pan to (0, 0).
  - **Pointer-Touch Event Separation**: `useDicomViewport` isolates `pointerType === 'touch'`, preventing desktop mouse pointer captures from intercepting or suppressing multi-finger touch streams.
- **Mobile Series Navigation & Touch Filmstrip**:
  - **Touch-Friendly Filmstrip**: HTML5 `draggable={true}` is automatically suppressed on mobile/touch screens to ensure uninterrupted native horizontal swipe scrolling (`touch-pan-x`, `-webkit-overflow-scrolling: touch`).
  - **Dedicated Mobile Series Pager**: When multiple series exist, a compact `< Prev` and `Next >` paging control renders directly on mobile viewports (`md:hidden`) with `touch-manipulation` for one-thumb series triage.
- **Server/VPS Workstation Resolution (Zero 404 Invariant)**:
  - **`hospital_pacs_studies` Hydration Fallback**: In `/workstation/[accession]`, when local physical drive paths (`E:\Cases`) are unavailable on cloud/VPS servers, the route automatically queries the `hospital_pacs_studies` database index.
  - **Instant Worklist Staging**: If found, it automatically stages the patient and study into the active worklist and draft report table via `saveReport()`, guaranteeing that clicking any patient in `/pacs` or search opens the full workstation without throwing a Next.js `notFound()` 404 error.
  - **Standby Database Fallback**: In standalone standby mode (`/workstation`), if local disk scanning returns zero studies, the workstation falls back to querying the latest 8 cases from the database so the standby interface is never empty.

---

## 20. Consultant Sign-Out Rounds, Level-by-Level Positive Extractor & Fast Delta AI Patcher
- **Clinical Challenge**: During morning rounds at teaching hospitals (e.g. LGH), a radiologist resident (PGR) discusses 40–50 cross-sectional MRI/CT studies with the supervising consultant in rapid succession. Manually hunting through large boilerplate paragraphs to delete normal lines or add subtle pathology (e.g. *“L4-L5 right extrusion with S1 impingement, L3-L4 normal”*) is error-prone, cognitively overwhelming, and risks missing levels.
- **Two-Tab Report / Positive Findings Extractor (`PositiveFindingsCards`)**:
  - Automatically compares every anatomical section against standard normal templates (`signout-mri-spine.data.ts`, `signout-mri-brain-body.data.ts`).
  - **Positive Findings Tab**: Conceals hundreds of lines of normal baseline text, rendering only abnormal anatomical levels as focused cards with a 5-second headline banner (`3 Abnormal Findings Detected`).
  - **1-Click "Mark Normal"**: Instantly reverts an abnormal level back to the normal baseline template, automatically re-synthesizing the Impression list.
  - **Full Report Tab**: Allows viewing and inline editing of all anatomical sections.
- **Hybrid Fast Shorthand Patcher (`ai-consultant-patcher.service.ts`)**:
  - **Deterministic 0ms Regex Engine (`consultant-delta-rules.service.ts`)**: Instant local processing of standard shorthand phrases (e.g. `l3-l4 normal`, `l4-l5 extrusion`, `clear l1-l2`).
  - **GoogleGenAI Fallback (Gemini 2.5 Flash)**: For nuanced clinical prose or complex multi-level instructions.
  - **Live Delta Diff Preview**: Renders bulleted proposed changes with `[ Apply Patch ]` and `[ Discard ]` before modifying the report.
  - **Alt+D Voice Input**: Allows dictating consultant comments directly into the shorthand box via VoiceStudio.
- **Smart Responsive Layout & Zero DICOM Occlusion**:
  - **Right-Docked Drawer (`layoutMode === 'dock'`)**: Slides in on the right (`w-[680px]` - `w-[820px]`), keeping the left DICOM viewer completely visible and interactive so the clinician can cross-examine images while applying consultant changes.
  - **Full Centered Modal (`layoutMode === 'modal'`)**: Expands to centered `max-w-6xl` panoramic canvas for report-focused workstations.
  - **Sticky In-Editor Level Ribbon (`ZenAnatomicalRibbon`)**: Renders above the Findings editor with color-coded level pills (green = normal, pulsing amber = abnormal), allowing 1-click level targeting and rounds launching (`Alt+R`).
  - **Accessible Dialog Standard**: Full `Escape` key and backdrop click dismissal.
- **HMIS Doctor Attribution Invariant**:
  - Eliminates separate supervising consultant input boxes (in Punjab HMIS, consultant credentials bind automatically during portal verification).
  - Resident signature (`Reported by: Dr. ... (PGR)`) is dynamically synchronized inside the Impression editor field.

---

## 21. Dedicated "Case Insights & Viva Briefing" Side Drawer & Academic Rail (Column 3)
- **Clinical & Academic Purpose**: Empowers radiologists, residents, and exam candidates with instantaneous clinical differential synthesis, oral viva talking points, and targeted investigative workups alongside their report canvas and DICOM sequences.
- **Column 3 Dual-Tab Integration (`ZenSimilarCasesColumn`)**:
  - **Tab 1 (`[ 💡 Case Insights ]`)**: Synthesizes structured clinical differentials, viva talking points, and next recommended investigations from active findings.
  - **Tab 2 (`[ 📖 Radiopaedia ]`)**: Extracted clean interactive reference webview (`ZenRadiopaediaPane`) with fast search, case encyclopaedia navigation, and article lookup.
- **1-Click Rapid Access & Collapsed Triggers**:
  - When Column 3 is collapsed into the sleek 48px rail, two dedicated 1-click icon buttons are available:
    - **`💡 Case Insights` (amber pulse)**: Single click immediately un-collapses Column 3 into the Case Insights tab.
    - **`📖 Radiopaedia`**: Single click immediately un-collapses Column 3 into the Radiopaedia webview.
  - **Report Header Launcher**: `ZenReportHeader` features a direct `[ 💡 Insights ]` button in Row 2, enabling 1-click expansion of the academic rail directly from the reporting canvas.
- **4-Part Structured Diagnostic Intelligence (`CaseInsightsView`)**:
  1. **Primary Diagnosis Banner**: Prominently highlights the leading diagnostic hypothesis with source badge (`Cached (0ms)` vs `AI Live`).
  2. **Ranked Differential Diagnoses (`RankedDifferentialsCard`)**: Categorized strictly into `High` (emerald), `Moderate` (amber), and `Consider` (purple) with anatomical rationale and discriminative rule-out criteria.
  3. **Clinical Viva & Class Presentation Briefing (`VivaTalkingPointsCard`)**:
     - *Demographics & Epidemiology*: Typical age predilection, sex distribution, and predisposing risk factors.
     - *Hallmark Signs & Pearls*: Pathognomonic signs rendered as quick chips (e.g. *DWI restriction, target sign, subchondral sclerosis*).
     - *Discriminative Criteria & Examiner Traps*: Classic questions asked by oral board examiners and pitfalls to avoid.
     - *1-Click Copy*: Copies formatted bulleted briefing to clipboard for morning case presentations or clinical rounds.
  4. **Recommended Next Investigations (`RecommendedInvestigationsCard`)**:
     - *Imaging / Contrast Sequences*: Targeted sequences (e.g. multiphase dynamic contrast CT, thin-slice MRCP, 3D CISS).
     - *Laboratory Correlates & Biomarkers*: Essential laboratory markers (e.g. HLA-B27, ESR, CRP, CSF oligoclonal bands, tumor markers).
- **0ms Pre-Cache & Real-Time Sync**:
  - Automatically loads pre-cached insights from `reports.content_json` (`contentJson.caseInsights`) or historical clinical notes in `patients.clinical_notes`.
  - **Refresh DDx with AI**: Re-evaluates updated findings via `/api/ai/case-insights`, persists the fresh payload into `reports.content_json.caseInsights`, and provides deterministic rule-based fallback if offline.
- **1-Click Report Impression Insertion**:
  - `+ Insert to Impression` on individual differential items appends bolded diagnosis, likelihood, and rationale into the impression editor.
  - `+ Insert All to Impression` appends the full ranked differential list.
  - `+ Insert Recommendations` appends recommended contrast protocols and laboratory markers.

---

## 22. Clinical Dot-Phrases, Normal Templates & Acute Critical Findings Radar
- **Rapid Clinical Dot-Phrases & Template Expansion**:
  - In `ClinicalEditor` (`useClinicalEditor`), radiologists can type either `/` (slash menu) or `.` (dot-phrase shortcut) directly in the report text to trigger instant diagnostic auto-complete without taking hands off the keyboard.
  - **Pre-Built High-Yield Normal Templates**:
    - `.normbrain` / `/normbrain`: Inserts standard intracranial baseline (no hemorrhage, acute territorial infarct, or midline shift; normal cisterns, sulci, flow-voids).
    - `.normls` / `/normls`: Inserts normal Lumbar Spine survey (lordosis, vertebral heights, disc hydration, intact thecal sac/foramina, L1-L2 conus medullaris).
    - `.normcervical` / `/normcervical`: Inserts normal Cervical Spine survey (lordosis, disc heights, cord caliber and intrinsic signal).
    - `.normknee` / `/normknee`: Inserts normal Knee MRI survey (menisci, ACL/PCL, collaterals, extensor mechanism, joint effusion).
    - `.normpe` / `/normpe`: Inserts negative acute pulmonary embolism survey with normal RV/LV ratio (< 1.0).
    - `.normchest` / `/normchest`: Inserts normal thoracic survey (lungs, mediastinum, pleura, osseous thorax).
    - `.normabd` / `/normabd`: Inserts normal CT Abdomen & Pelvis survey (liver, biliary, spleen, pancreas, adrenals, kidneys, bowel).
- **Acute Critical Findings Radar (Life-Threatening Emergency Scans)**:
  - `detectCriticalFindings` (`src/lib/critical-findings.ts`) monitors report text in real-time for life-threatening acute findings (subdural/epidural/subarachnoid hemorrhage, midline shift/herniation, tension pneumothorax, acute pulmonary embolism, aortic dissection, cauda equina syndrome, pneumoperitoneum).
  - Employs strict negation-window analysis (suppresses false alarms on "no intracranial hemorrhage", "rules out pulmonary embolism", etc.).
  - **Zero-Clutter Visual Footprint (`ZenCriticalAlertBanner`)**:
    - When no critical finding is present: consumes **0 pixels / zero UI clutter**.
    - When an acute finding is authored: renders a pulsing rose-tinted emergency alert banner (`🚨 Critical Alert: [Finding Name]`) above the report canvas.
    - **1-Click WhatsApp ER Handover**: Radiologist clicks `[ Copy ER Alert ]` to immediately copy a standardized WhatsApp ER Handover message containing patient demographics, accession, time of alert, critical diagnosis, urgent clinical action, and radiologist attribution.

---

## 23. Drag & Drop DICOM Ingestion, Storage RBAC & Personal Google Drive Upload
- **Zero-Friction Drag & Drop Ingestion (`DicomDragDropZone` & `CaseUploadModal`)**:
  - Radiologists can drag and drop folders of `.dcm` files or consolidated `.zip` archives directly from OS file explorers (Windows Explorer, macOS Finder) into the PACS workstation (`/pacs`).
  - Active drag displays a clean, non-intrusive backdrop overlay with visual drop feedback.
  - On drop, payload is dispatched via `POST /api/cases/upload`, extracted through `ingestDicomBundle`, parsed via `readDicomHeaderFast`, and registered in local SQLite staging.
  - Automatically loads the case filmstrip and sequence viewer immediately upon completion.
  - **Strict HMIS Isolation**: DICOM uploads are strictly housed within PACS (`/pacs`). The Punjab HMIS worklist (`/worklist`) remains a pure scraper and sync service without imaging upload clutter.
- **Granular Storage RBAC & Single Source of Truth**:
  - Non-admin clinicians are granted access strictly to permitted storage sources (`allowedStorageSources`: default `["local", "gdrive"]`).
  - Standby source tabs (`StandbySourceTabs`) dynamically filter visible archives, concealing `S3 Cloud`, `Hospital PACS Direct Query`, and `Clinic Edge Node` unless explicitly permitted by an admin in the Clinicians RBAC panel.
  - `POST /api/pacs/query` and `unified-source-aggregator.service.ts` enforce RBAC server-side before querying external clouds or hospital DIMSE nodes.
- **1-Click Study Archival to Personal Google Drive**:
  - In `ToolbarActionButtons` (`cloud_upload`), clinicians can click to archive the current study to their connected Google Drive.
  - Dispatches `POST /api/google/upload-case`, packages the study into a unified ZIP archive with deterministic taxonomy (`Rad Suite Cases / YYYY / MM / MODALITY`), initiates a Google Drive v3 Resumable Upload session, and presents a direct clickable link to view or download from Google Drive.
- **On-Demand Clinical Workstation Help Guide (`WorkstationGuideModal`)**:
  - Clinicians can open the comprehensive workstation guide at any time by clicking the `?` icon in the top navigation cluster.
  - Features quick-reference cheat sheets for keyboard shortcuts (`1`/`2`/`3`/`4` presets, `P` pan, `Z` zoom, `W` window/level, `I` invert, `R` reset, `Ctrl+S` vault save, `Alt+D` VoiceStudio), CINE playback, HMIS draft synchronization, and drag-and-drop ingestion without unsolicited popups.

---

## 24. Workstation Standby Source Dropdown & Smart Responsive Table
- **Clean Filter Cockpit & Source Dropdown (`StandbySourceDropdown`)**:
  - Replaces wide horizontal source tabs and unsolicited edge node panes with a compact dropdown integrated directly into `StandbyFilterBar`.
  - Dynamically filters storage sources based on logged-in user permissions (`filterSourcesByRbac`). Non-admins only see permitted sources (`All`, `Local Storage`, `Google Drive`). Restricted backend sources (`S3 Cloud`, `Hospital PACS Direct Query`, `Clinic Edge Node`) remain hidden unless authorized.
  - Replaces all legacy `E:\Cases` text with standard `Local Storage` / `Local` branding across all badges, dropdowns, and command palettes.
- **Smart Responsive Diagnostic Table (`StandbyCasesTable`)**:
  - Replaces card grids with a unified, high-density clinical table matching Worklist, My Cases, and PACS views.
  - Columns: Patient Name / MRN (with age/gender and copy), Accession (with 1-click Copy button), Modality badge (color-coded CT, MR, XR, US), Study Description, Formatted Date, Series/Slice counts, Source badge (`PacsSourceBadge`), and 1-click Open action button.
  - Full client-side column sorting (Date, Patient, Modality, Accession) and canonical pagination via `TablePagination`.

---

## 25. Predictive Next-Case Pre-Warming & SQLite Database Acceleration
- **Predictive Next-Case Pre-Warming (`useNextCasePrewarm`)**:
  - Automatically schedules pre-warming of the next case in the user's sorted queue during browser idle periods (`requestIdleCallback` after a 2-second debounce).
  - Fetches the next case's study manifest via `GET /api/cases/[accession]/manifest` and caches it in memory via `clientManifestCache`.
  - Warms the first DICOM slice (index 0) of the primary series directly into `DicomSliceCache`.
  - When the radiologist finishes reporting and clicks `[ Next ❯ ]`, the study manifest and initial image render with **0ms transition latency** (zero loading spinner).
- **Client Manifest Cache (`clientManifestCache`)**:
  - In-memory cache with a 5-minute TTL and bounded capacity (50 studies), preventing duplicate JSON manifest requests across consecutive patient visits.
  - Used by `usePacsStudyRetrieval` for instantaneous, synchronous series resolution.
- **SQLite Performance Pragmas & High-Speed Multi-Column Indices**:
  - **Pragmas**: `synchronous = NORMAL` (crash-safe WAL mode reducing fsync latency by 80-90%), `cache_size = -64000` (64MB memory page cache), `temp_store = MEMORY` (in-memory temporary sorting/GROUP BY), and `mmap_size = 268435456` (256MB memory-mapped I/O).
  - **Indices**: Idempotently applied in `sqlite-migrations.ts` across both test and production databases:
    - `idx_studies_patient_id` on `studies(patient_id)`
    - `idx_studies_assigned` on `studies(assigned_radiologist_id)`
    - `idx_studies_scheduled` on `studies(scheduled_at)`
    - `idx_studies_claimed_at` on `studies(claimed_at)`
    - `idx_studies_status_hmis` on `studies(status, hmis_status)`
    - `idx_reports_study_id` on `reports(study_id)`
    - `idx_reports_patient_id` on `reports(patient_id)`
    - `idx_patients_mrn` on `patients(mrn)`





