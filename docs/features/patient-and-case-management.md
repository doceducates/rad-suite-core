# Patient Details Editing, Manual Case Ingestion & Clinical Clipboard Suite

This document specifies patient identifier validation rules, manual case ingestion, database override precedence, and the clinical clipboard copying suite.

---

## 1. Patient Details Editing, Manual Case Ingestion & Mandatory Identifier Invariant
- **Strict Identifier Validation Invariant**: At least one of **MR Number (MRN)** or **Accession Number** is mandatory for all manual entries and edits. If both fields are omitted, the request is rejected with 400 Bad Request (`"At least one of patientMrn or accessionNumber must be provided"`).
  - **MRN provided without Accession**: Automatically generates a worklist-compliant accession number (`MAN-YYMMDD-XXXX`).
  - **Accession provided without MRN**: Automatically synthesizes/derives the MRN (`MRN-${accessionNumber}`).
  - **Both provided**: Both are validated and preserved.
- **Domain Services & HIPAA Audit Logging (`patient-management.service.ts`)**:
  - `createManualPatientAndStudy()`: Idempotently upserts the patient by MRN, writes study metadata to SQLite `studies`, initializes an empty draft in `reports`, and emits HIPAA audit record `CREATE_MANUAL_CASE`.
  - `updatePatientAndStudyDetails()`: Locates existing case in DB or auto-imports on the fly from local archive disk (`E:\Cases`), validates accession uniqueness against other studies, updates patient demographics (`name`, `gender`, `dob`, `age`) and study parameters (`modality`, `studyDescription`, `bodyPart`, `department`, `room`, `priority`, `referringDoctor`, `technologist`, `scheduledAt`, `clinicalHistory`), and dispatches audit log `UPDATE_PATIENT_DETAILS`.
- **Database Override Precedence Invariant (`unified-case.service.ts`)**:
  - Edits made to cases originally discovered from local filesystem archives (`E:\Cases`) immediately take precedence over raw filesystem metadata strings. `unified-case.service.ts` queries SQLite `dbMap` for patient and study overrides before falling back to folder names, preventing user edits from being reverted on worklist re-indexing.
- **Transport Layer Controllers**:
  - `POST /api/worklist/manual`: Ingests walk-in or unscheduled emergency cases with Zod `.refine()` identifier validation.
  - `GET /api/cases/[accession]/details`: Returns current patient demographics and study parameters.
  - `PATCH /api/cases/[accession]/details`: Authenticates session, validates input, updates patient and study records, and returns refreshed `PacsStudyResult`.
- **Modular Presentation Architecture (< 250 Lines per File)**:
  - Form UI is decoupled into atomic components: `<MandatoryCaseIdentifiers />` (with auto-generation buttons and dynamic validity badge `✓ Valid` vs `⚠️ At least 1 required`) and `<CaseStudyFields />` (modality, anatomical body part, department, priority, protocol, referring physician, technologist, schedule, history).
  - `<WorklistManualCaseModal />`: Full walk-in manual entry dialog with quick protocol presets (`CT Brain`, `MRI Lumbar Spine`, `Cervical Spine`, `Chest HRCT`, etc.).
  - `<WorklistEditPatientModal />`: In-place patient editor triggered across 3 workstation entry points:
    1. **Worklist Row Patient Name**: Click the edit pencil icon next to any patient name.
    2. **Worklist Row Actions**: Select "Edit Patient Details" in the right-hand action column.
    3. **Worklist Report Modal Header**: Edit icon directly in the quick-read modal header.
- **Demographic Normalization & Zero-Loss Schema Sanitization**:
  - Punjab HMIS portals return gender as single-character codes (`"M"`, `"F"`). `mrn-resolution.service.ts`, `hmis-worklist-normalizer.ts`, and `validation.ts` (`OptionalGenderSchema`) automatically normalize single characters to full enum terms (`'Male'`, `'Female'`, `'Other'`) across all transport controllers, reporting hooks, and database ingestion layers.
  - `OptionalAgeSchema` sanitizes empty strings, nulls, and string integers, preventing schema rejection when saving clinical reports.
  - Automatic error diagnostic reporting is logged to the client console on report auto-save and manual save actions.

---

## 2. Comprehensive Clinical Clipboard Suite & Granular Demographic/Section Copy
- **Cross-Platform Safe Clipboard Engine (`src/lib/clipboard.ts`)**: Implements safe clipboard copying with automatic environment detection. Tries asynchronous `navigator.clipboard.writeText` first, with graceful fallback to hidden `textarea` + `document.execCommand('copy')` for non-secure HTTP LAN environments, internal webviews, or desktop Tauri shells where navigator permissions may be blocked.
- **Granular Demographics & Formatted Clinical Summary**:
  - 1-click individual copy for Patient MRN (`mrn`) and Accession Number (`accessionNumber`).
  - Standardized clinical summary block generator (`formatPatientSummary()`) compiling Name, Age, Gender, MRN, Accession, Modality, Study Description, Scheduled Date/Time, DOB, and Ward/Department into a clean plain text block suitable for clinical handovers, WhatsApp messages, or PACS search pasting.
- **Granular Section Copying & Automatic HTML Stripping**:
  - Independent 1-click `CopyButton`s on section headers for Clinical Indication / History, Technique / Protocol, Diagnostic Findings, and Diagnostic Impression across all reporting views (`ZenSectionsEditorView`, `ZenUnifiedEditorView`, `WorklistReportModalBody`, `HmisResultComposer`, `PatientRecordCard`).
  - When copying single sections or full reports, `htmlContent={true}` strips TipTap/HTML formatting tags (`<p>`, `<strong>`, `<br>`, `<li>`) into properly spaced, human-readable plain text without leaking markup.
- **Consolidated Publication-Grade Full Report Generator (`copyFullReport`)**:
  - 1-click **"Copy Report"** / **"Copy All"** buttons in `ZenReportFooter`, `WorklistReportModalHeader`, `HmisResultComposer`, and `PatientRecordCard`.
  - Compiles Institution Header, formatted Demographics block, Technique, Findings, Impression, and Radiologist Electronic Signature Stamps into standard clinical plain text.
  - Implements lazy evaluation via function callbacks (`text={() => formatFullClinicalReport(...)}`) to eliminate unnecessary string formatting during render passes.
- **Atomic Animated Visual Feedback (`CopyButton`)**:
  - Displays instant visual feedback (green checkmark for 1.8s) with accessible tooltips and customizable styles (`icon`, `ghost`, `outline`, `badge`).
  - Event propagation is prevented (`e.stopPropagation()`) so clicking copy never unintentionally opens table rows, modal cards, or accordion headers.

---

## 3. Manual Case Duplication Guard & Workstation Index Deletion Suite
- **Manual Case Duplication Prevention (`manual-case-dedup.service.ts`)**:
  - When creating a manual case (`POST /api/worklist/manual`), `checkDuplicateManualCase()` queries existing studies for the same MRN with identical modality and scan type on the same calendar date.
  - If a duplicate is detected, the API responds with `409 Conflict` containing `{ isDuplicate: true, existingStudy }`.
  - The modal (`WorklistManualCaseModal`) surfaces a warning banner with:
    1. Direct action button to **"Open Existing Case"** (`/workstation?accession=...`).
    2. Override checkbox **"Create duplicate study anyway"** passing `allowDuplicate: true` when intentional.
- **Workstation Index Case Deletion (`case-deletion.service.ts`)**:
  - Allows clinicians to prune unwanted or duplicate studies from their workstation worklist to avoid backlog clutter.
  - Endpoint `DELETE /api/cases/[accession]` cascades deletion safely:
    - Removes associated records from `reports`, `report_revisions`, `hmis_draft_vault`, and `collaborative_sessions`.
    - Deletes the study row from `studies`.
    - Automatically cleans up orphaned `patients` rows if no other studies reference that patient.
    - Records the deleted accession into `tombstoned_accessions` table (`deleted_at`, `reason`).
  - **Tombstone Persistence Invariant**: The background scanner in `unified-case.service.ts` checks `tombstoned_accessions`. This ensures re-scanning `E:\Cases` or HMIS synchronization does NOT resurrect user-deleted cases.
  - **Zero-Submit / HMIS Safety Guard**: Deletion is strictly workstation-local; it NEVER dispatches delete, cancel, or reject commands to the live Punjab HMIS portal.
  - **UI Confirmation Dialog (`WorklistDeleteDialog`)**: Action triggered via the trash icon on the worklist row, displaying case details and an explicit reassurance that remote hospital HMIS remains intact.

---

## 4. Patient Mobile / Contact Number Across All Patients (`patients.phone`)
- **Universal Patient Contact Field**: Every patient record in the database supports an optional mobile/telephone contact number (`patients.phone`), populated across walk-in manual registrations, HMIS order pulls, and clinician manual edits.
- **Entry & Editing Touchpoints**:
  - `WorklistManualCaseModal`: Mobile / Contact field during initial walk-in case registration.
  - `WorklistEditPatientModal`: Editable phone number field on existing patient records.
  - `PATCH /api/cases/[accession]/details`: Validates and writes phone number updates directly to the underlying `patients` record.
- **Presentation & Instant Communication**:
  - In `WorklistPatientCell` (Line 2 alongside MRN), if a phone number exists, it renders as a clickable `tel:` link styled in semantic emerald with an inline `CopyButton` for rapid clipboard copying or WhatsApp pasting.
  - If a patient has no phone number recorded, a subtle `+ Phone` button triggers the patient editor dialog, allowing clinicians to immediately add contact details when following up on missing prior films or clinical clarifications.

---

## 5. Clinical Demographic & Scan-Time Invariants (PACS vs HMIS Precedence)
- **Patient Age Invariant (Zero-Trust HMIS Default)**: Punjab HMIS portals default patient age to `35` for all unentered clerical registrations. The workstation strictly treats HMIS age `35` as an unverified placeholder. Real patient age is extracted from DICOM header tags `(0010,1010)` (`PatientAge`) or calculated from `(0010,0030)` (`PatientBirthDate`) during PACS harvesting and Orthanc synchronization (`mrn-resolution.service.ts`, `hospital-pacs-index.service.ts`). DICOM age always overrides default HMIS values in `patients.age`.
- **Scan Time Invariant (True Acquisition vs Order Entry)**: The study timestamp in HMIS indicates administrative order entry, NOT the actual radiological scan time. The workstation extracts true scanner acquisition time from DICOM tag `(0008,0030)` (`StudyTime`) and series timestamps `(0008,0031)` (`SeriesTime`) / `(0008,0032)` (`AcquisitionTime`). Study records prioritize PACS acquisition time for `studies.scheduledAt`, guaranteeing chronological accuracy in diagnostic reporting and clinical handovers.
- **Multi-Study Patient Consolidation**: When a patient undergoes multiple radiological examinations during a visit, `unified-case-grouping.ts` groups studies by patient MRN into a consolidated master worklist row with an interactive series/study breakdown dropdown (`WorklistMultiStudyList`), eliminating duplicate patient rows while preserving independent reporting workflows.

---

## 7. Local DICOM Folder Import & Multi-Study Ingestion Suite
- **Purpose**: Enables radiologists and clinicians to import arbitrary local directories, USB drives, or network folders containing single or multiple diagnostic DICOM studies directly into the PACS workstation and reporting queue.
- **Dual Ingestion Engine (`local-folder-import.service.ts`)**:
  1. **Direct Local Disk Path Scanner**:
     - Traverses directory trees recursively (depth up to 4).
     - Groups discovered `.dcm` files by study (`StudyInstanceUID` or directory groupings).
     - Extracts study header metadata (`parseStudyHeader`): Patient Name, MRN, Accession, Modality, Description, Study Date/Time, Series Count, and Slice Count.
     - Automatically indexes discovered cases into `hospital_pacs_studies` (`pacsSource: 'LOCAL_FOLDER'`, `s3Status: 'local_only'`).
     - Updates configured storage path in `storage-config.service.ts` and refreshes `localCases` cache.
  2. **Browser Directory Upload (`webkitdirectory`)**:
     - Supports selecting folders via HTML5 folder picker or dragging a directory into the browser window.
     - Files are ingested into local workstation staging, parsed, and registered in SQLite database.
- **Unified Reusable Modal UI (`<LocalFolderImportModal />`)**:
  - Mounted on both:
    1. **PACS Workstation Table (`/pacs`)**: Quick action button `[ 📁 Import Folder ]` in `PacsUnifiedFilterBar` and `HospitalPacsClientView`.
    2. **Workstation Standby Screen (`/workstation`)**: Action button `[ 📁 Import Local Folder ]` in `ZenWorkstationStandby`, clickable Drag & Drop target, and header trigger in `StitchHeader`.
  - Probes and surfaces detected local drives and storage folders (`E:\Cases`, `C:\MedicalSandbox\Cases`) with case counts.
  - Displays instant scan results list with patient demographics, accession, modality pills, slice count, and 1-click `[ Open in Workstation ]` button.
- **Transport API (`/api/pacs/import-folder`)**:
  - `GET`: Returns detected workstation paths (`detectAvailableLocalFolders`).
  - `POST`: Validates `folderPath` JSON payload with Zod, runs scanner, indexes studies, and returns summary stats.


