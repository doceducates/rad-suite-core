# Bulletproof Edge OTA, S3 Master Catalog & Metadata Fidelity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish clinical identity isolation using the (MRN, Modality, Accession) triplet to prevent cross-modality accession collisions, display real-time slice upload progress and clinical diagnosis/impression on the PACS table, establish an enterprise-grade fail-safe OTA deployment pipeline with automated self-healing rollback for remote clinic edge nodes, synchronize the PACS master catalog across VPS and local workstations, auto-reconcile S3 cloud cases on fresh databases, normalize DICOM metadata fidelity across all ingestion layers, and execute the automated harvesting and S3 upload of yesterday's MRI cases.

**Architecture:**
1. **Clinical Identity Triplet & Modality-Bound Accession Disambiguation**:
   - **MR Number (`patientMrn` / `patientId`)**: Unique identifier for the human patient; never assigned to anyone else.
   - **Accession Number**: Order/exam requisition identifier within a clinical modality department. In hospitals, different modalities (CT vs MR) can share or be assigned the same accession number for different patients or encounters.
   - **Multiple Studies per MRN**: For a single patient MRN, multiple studies in the same modality (e.g. MRI Brain vs MRI Cervical Spine) always carry distinct accession numbers.
   - **Modality-Bound Invariant**: All PACS index queries, S3 key resolutions (`getS3StudyKeys`), and workstation loads MUST be bound to `(accessionNumber, modality)` (and `patientMrn`).
   - **Database Uniqueness Invariant**: Remove single-column unique constraint on `accession_number` in `hospital_pacs_studies`; replace with composite unique index `(accession_number, modality)`.
2. **Real-time PACS Upload Progress & Clinical Diagnosis Integration**: Wire live telemetry from the edge node into the PACS table. Display the series count, total slice count, uploaded vs remaining slices (e.g. `45/125 uploaded (36%)`), and a dynamic progress bar for active uploads. Join reports and intake documents to display the clinical diagnosis, impression, and report draft status.
3. **Edge OTA Self-Healing & Rollback**: Slotted staging and atomic swap with snapshot protection (`snapshots/last_known_good`). Pre-flight `node --check` syntax validation and post-flight health smoke testing. Immortal watchdog (`RadSuiteWatchdog`) detects service crashes or missed heartbeats (>60s), autonomously restores the verified snapshot, and reports the exact diagnostic failure (`stderr`/stack trace) back to the VPS.
4. **PACS Master Index Synchronization**: Edge node local inventory (`local-inventory.json`) reports discovered hospital PACS studies back to the central VPS database (`hospital_pacs_studies`), enabling instant zero-latency queries (<5ms) for any date preset (today, yesterday, 7d, 30d, custom).
5. **S3 Cloud Catalog Auto-Reconciliation**: A background crawler (`s3-catalog-sync.service.ts`) scans the S3 prefix taxonomy (`dicom/YYYY/MM/MODALITY/...`) and backfills the SQLite catalog on fresh VPS deployments and local `npm run dev` environments, making all existing cloud cases instantly visible and streamable.
6. **Lossless DICOM Metadata Invariant**: Eliminate destructive space-to-underscore substitution in `orthanc_sync.lua`, include missing DICOM tags (`StudyTime`, `PatientSex`, `PatientBirthDate`), and ensure patient names, accession numbers, and sequence geometries are 100% normalized across Orthanc, edge scripts, and viewer manifests.
7. **Yesterday MRI Harvester & S3 Ingestion**: Execute targeted PACS harvest for yesterday (`20261010`) MRI cases via C-GET and verify all slices are streamed to S3 storage (`https://s3.sehatai.org/rad-suite`).

**Tech Stack:** Next.js 15 (App Router), TypeScript, SQLite (Drizzle ORM), Node.js native child_process/http, Orthanc DICOM Server (Lua hook + REST API), NSSM Windows Services, S3/Ceph Object Storage, Vitest.

---

### Task 1: Clinical Identity Triplet, Composite DB Schema & Modality-Bound S3 Isolation

**Files:**
- Modify: `src/db/schema/hospital-pacs.ts:1-33`
- Modify: `src/db/schema/sqlite.ts:232-254`
- Modify: `src/services/s3-retrieval.service.ts:39-180`
- Modify: `src/app/workstation/[accession]/page.tsx:186-198`
- Modify: `src/services/study-manifest.service.ts:50-80`
- Modify: `src/services/hospital-pacs-index.service.ts:40-104`
- Test: `src/services/__tests__/s3-study-isolation.test.ts`
- Test: `src/services/__tests__/composite-identity-index.test.ts`

**Step 1: Write the failing tests**
Create tests verifying:
- Inserting two studies with identical accession number but different modalities (`192610002587, CT, NAZEER` and `192610002587, MR, M_YAQOOB`) succeeds cleanly without database collision.
- `getS3StudyKeys('192610002587', { modality: 'MR' })` returns ONLY the 125 MR slices from `MR/192610002587_M_YAQOOB_...`.
- `getS3StudyKeys('192610002587', { modality: 'CT' })` returns ONLY the 18 CT slices from `CT/192610002587_NAZEER_...`.
- Querying a patient MRN returns all distinct studies for that patient (e.g. Brain MRI and Spine MRI) across distinct accessions.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/s3-study-isolation.test.ts src/services/__tests__/composite-identity-index.test.ts`
Expected: FAIL.

**Step 3: Implement minimal code**
- In `src/db/schema/hospital-pacs.ts` and `src/db/schema/sqlite.ts`: Change `accessionNumber` from `.unique()` to non-unique; add composite unique index on `(accessionNumber, modality)`.
- In `hospital-pacs-index.service.ts`: Upsert on `(accessionNumber, modality)`.
- In `s3-retrieval.service.ts`:
  - When `options.modality` is specified, lock S3 query prefix to `dicom/*/*/${options.modality.toUpperCase()}/` and match folders strictly.
  - Isolate series keys strictly to the single matched study directory.
- In `src/app/workstation/[accession]/page.tsx`:
  - Accept `searchParams: { modality?: string; mrn?: string }`.
  - Pass `study.modality` and `study.patientMrn` to `getS3StudySeries`.
  - Fetch other studies with the same `patientMrn` and pass as `patientPriors` for cross-study comparison.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/s3-study-isolation.test.ts src/services/__tests__/composite-identity-index.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/db/schema/hospital-pacs.ts src/db/schema/sqlite.ts src/services/s3-retrieval.service.ts src/app/workstation/[accession]/page.tsx src/services/study-manifest.service.ts src/services/hospital-pacs-index.service.ts src/services/__tests__/s3-study-isolation.test.ts src/services/__tests__/composite-identity-index.test.ts
git commit -m "fix(identity): enforce (MRN, Modality, Accession) triplet and isolate S3 studies"
```

---

### Task 2: Live Upload Progress & Clinical Diagnosis / Impression in PACS Table

**Files:**
- Modify: `src/services/hospital-pacs-index.service.ts:180-220`
- Modify: `src/components/pacs/pacs-unified-table.tsx:46-198`
- Modify: `src/components/pacs/hospital-pacs-client-view.tsx:43-75`
- Test: `src/services/__tests__/pacs-table-progress-and-diagnosis.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/pacs-table-progress-and-diagnosis.test.ts` verifying that:
- `queryIndexedHospitalPacs` joins report data and returns `reportStatus`, `diagnosis`/`impression` snippet, `numSeries`, `numInstances`, and active upload progress metadata.
- `PacsUnifiedTable` renders live progress bars (`45/125 slices (36%) • 1.4 MB/s`) when an accession is actively uploading.
- Fully synced cases display exact slice confirmation (e.g. `125 / 125 Slices • 100% Synced`).
- Clinical diagnosis/impression snippet and report badges (`Draft`, `Final`, `Not Reported`) render in the table.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/pacs-table-progress-and-diagnosis.test.ts`
Expected: FAIL.

**Step 3: Implement minimal code**
- In `hospital-pacs-index.service.ts`: Left-join `studies` and `reports` by `(accessionNumber, modality)` to attach clinical impression, findings, and report status. Attach live `activeUpload` telemetry from `getClinicNodeStatus()`.
- In `pacs-unified-table.tsx`:
  - Add **Series & Slices** column/badge (`4 Series • 125 Slices`).
  - Add **Diagnosis / Impression** column showing clinical history/impression snippet with report status badge.
  - In Cloud Status badge, render dynamic progress bar when `accessionNumber === activeUpload?.accession`:
    `[██████░░░░] 45/125 Slices (36%) • 1.4 MB/s`.
  - When `s3Status === 'synced'`, show `125 / 125 Slices (Synced)`.
- In `hospital-pacs-client-view.tsx`: Add lightweight 4-second polling when any study is in `uploading` or `queued` state.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/pacs-table-progress-and-diagnosis.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/services/hospital-pacs-index.service.ts src/components/pacs/pacs-unified-table.tsx src/components/pacs/hospital-pacs-client-view.tsx src/services/__tests__/pacs-table-progress-and-diagnosis.test.ts
git commit -m "feat(pacs): add live upload progress tracking and clinical diagnosis to PACS table"
```

---

### Task 3: Lossless DICOM Metadata Normalization in Edge Ingestion (`orthanc_sync.lua`, `pacs-harvester.js`, `local-inventory.js`)

**Files:**
- Modify: `scripts/clinic-host/orthanc_sync.lua:1-52`
- Modify: `scripts/clinic-host/pacs-harvester.js:52-95`
- Modify: `scripts/clinic-host/local-inventory.js:64-94`
- Test: `src/services/__tests__/edge-metadata-normalization.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/edge-metadata-normalization.test.ts` verifying that:
- Patient names with spaces and carets (`MUHAMMAD YAQOOB`, `DOE^JOHN`) preserve clean spaces (`MUHAMMAD YAQOOB`, `DOE JOHN`) in database/inventory representations while only sanitizing for filesystem/S3 key paths.
- `StudyTime` is queried in DICOM C-FIND and preserved.
- `StudyDescription`, `PatientID`, `AccessionNumber`, and `Modality` are trimmed and uncorrupted.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/edge-metadata-normalization.test.ts`
Expected: FAIL.

**Step 3: Implement minimal code**
- In `orthanc_sync.lua`: Preserve clean `patientName` without aggressive `_` replacement for JSON payload (only sanitize for file paths), extract `StudyTime` (`tags['StudyTime']`), `PatientSex` (`tags['PatientSex']`), and `PatientBirthDate` (`tags['PatientBirthDate']`).
- In `pacs-harvester.js`: Add `StudyTime: ''`, `PatientSex: ''`, `PatientBirthDate: ''` to `Query` keys in `queryPacsStudies`, and map `studyTime: c.StudyTime || ''`.
- In `local-inventory.js`: Include `studyTime` in `registerDiscovered`.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/edge-metadata-normalization.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/clinic-host/orthanc_sync.lua scripts/clinic-host/pacs-harvester.js scripts/clinic-host/local-inventory.js src/services/__tests__/edge-metadata-normalization.test.ts
git commit -m "feat(edge): normalize DICOM metadata extraction and preserve study time"
```

---

### Task 4: Automated Edge OTA Staging, Verification & Self-Healing Watchdog Rollback

**Files:**
- Modify: `scripts/clinic-host/admin-actions.js:126-163`
- Modify: `scripts/clinic-host/clinic-watchdog.js:58-120`
- Modify: `scripts/clinic-host/update-node.ps1:22-56`
- Create: `src/services/edge-ota.service.ts`
- Test: `src/services/__tests__/edge-ota-rollback.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/edge-ota-rollback.test.ts` simulating:
- Pre-flight syntax failure (corrupted JavaScript snippet) -> deployment aborted, staging cleaned up, production unchanged.
- Successful staging & snapshot creation (`snapshots/last_known_good`).
- Simulated service startup crash -> watchdog detects failure, restores `last_known_good`, emits rollback event payload with stderr.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/edge-ota-rollback.test.ts`
Expected: FAIL.

**Step 3: Implement minimal code**
- In `admin-actions.js`: Download files to `C:\MedicalSandbox\staging\`. Run `node --check` across ALL files. If any fails, abort and delete staging. If all pass, create `snapshots/last_known_good/` from current `Scripts/`, atomically copy staged files to `Scripts/`, write `update_state.json` (`pending_verification`), and reload modules.
- In `clinic-watchdog.js`: Check `update_state.json`. If `RadSuiteEdgeAgent` is down or throws error upon launch, restore `snapshots/last_known_good/` to `Scripts/`, mark `state: rolled_back`, and send diagnostic failure heartbeat payload to VPS.
- When `clinic-agent.js` successfully sends 1 valid heartbeat post-update, update `update_state.json` to `healthy` and update `last_known_good`.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/edge-ota-rollback.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/clinic-host/admin-actions.js scripts/clinic-host/clinic-watchdog.js scripts/clinic-host/update-node.ps1 src/services/edge-ota.service.ts src/services/__tests__/edge-ota-rollback.test.ts
git commit -m "feat(edge): add atomic OTA staging and automated watchdog rollback"
```

---

### Task 5: Bidirectional PACS Inventory Sync between Edge Node and Central VPS

**Files:**
- Modify: `scripts/clinic-host/local-inventory.js:180-218`
- Modify: `scripts/clinic-host/clinic-agent.js:199-236`
- Modify: `src/app/api/clinic-node/heartbeat/route.ts:205-240`
- Create: `src/app/api/clinic-node/inventory-sync/route.ts`
- Test: `src/services/__tests__/inventory-sync.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/inventory-sync.test.ts` testing:
- Edge node inventory batch extraction (`getPendingSyncStudies(max=100)`).
- VPS batch upsert into `hospital_pacs_studies` preserving `s3Status`.
- Querying yesterday returns all discovered cases without requiring on-demand PACS latency.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/inventory-sync.test.ts`
Expected: FAIL.

**Step 3: Implement minimal code**
- In `local-inventory.js`: Add `getDiscoveredStudies(limit, filter)` returning structured studies.
- In `clinic-agent.js`: Attach discovered studies chunk or call `POST /api/clinic-node/inventory-sync` when new studies are discovered.
- In `src/app/api/clinic-node/inventory-sync/route.ts`: Validate payload with Zod, batch upsert into `hospitalPacsStudies` via `indexHospitalPacsStudies`.
- Update `hospital-pacs-federation.service.ts` so querying dates (today, yesterday, custom) immediately checks the synchronized SQLite catalog.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/inventory-sync.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add scripts/clinic-host/local-inventory.js scripts/clinic-host/clinic-agent.js src/app/api/clinic-node/inventory-sync/route.ts src/services/__tests__/inventory-sync.test.ts
git commit -m "feat(pacs): implement bidirectional inventory sync between edge node and VPS"
```

---

### Task 6: S3 Cloud Catalog Auto-Discovery & Backfill Crawler for Fresh SQLite Databases

**Files:**
- Create: `src/services/s3-catalog-sync.service.ts`
- Create: `src/app/api/pacs/sync-s3-catalog/route.ts`
- Modify: `src/app/workstation/page.tsx:11-40`
- Test: `src/services/__tests__/s3-catalog-sync.test.ts`

**Step 1: Write the failing test**
Create `src/services/__tests__/s3-catalog-sync.test.ts` verifying that:
- S3 key prefix crawler scans `dicom/{YYYY}/{MM}/{MODALITY}/{ACCESSION}_{PATIENT}_{STUDYUID}/` keys.
- Extracts accession, patient name, modality, study date, studyUid.
- Upserts missing studies into `hospitalPacsStudies` with `s3Status: 'synced'`.
- Standby workstation page (`/workstation`) shows both local disk cases AND synchronized S3 cloud cases.

**Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/s3-catalog-sync.test.ts`
Expected: FAIL.

**Step 3: Implement minimal code**
- Create `src/services/s3-catalog-sync.service.ts`: List S3 prefixes using `s3HttpGet` XML parsing or S3 list API, extract metadata from directory structure, and batch upsert into `hospitalPacsStudies`.
- Create `src/app/api/pacs/sync-s3-catalog/route.ts`: Admin/service endpoint to trigger S3 catalog reconciliation.
- Update `src/app/workstation/page.tsx`: Cascade `getLocalCases()` + `queryIndexedHospitalPacs({ limit: 8 })` so both local and S3 cases appear on the standby screen regardless of whether running in `npm run dev` or domain VPS.

**Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/s3-catalog-sync.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/services/s3-catalog-sync.service.ts src/app/api/pacs/sync-s3-catalog/route.ts src/app/workstation/page.tsx src/services/__tests__/s3-catalog-sync.test.ts
git commit -m "feat(s3): add automated S3 catalog crawler and unified standby case discovery"
```

---

### Task 7: Zero-Manual Trigger: Harvest Yesterday's MRI Cases to S3 via Remote Heartbeat Dispatch

**Files:**
- Dispatch `harvest-pacs` action via `dispatchClinicAction` on VPS with payload: `{ date: '20261010', modality: 'MR', bypassKeywords: true }`.
- Edge node receives command on heartbeat without manual user interaction.
- Monitor C-GET retrieval to Orthanc storage and streaming upload to S3 bucket `rad-suite`.
- Verify studies appear in VPS `hospital_pacs_studies` with `s3Status: 'synced'` and separate from any other modality.

---

### Task 8: Documentation & System Architecture Index Update

**Files:**
- Update: `docs/architecture/clinic-pc-nodes.md` (Document atomic staging, watchdog rollback, study boundary isolation)
- Update: `docs/architecture/storage-and-cloud.md` (Document S3 catalog crawler and (MRN, Modality, Accession) disambiguation)
- Update: `docs/INDEX.md`
