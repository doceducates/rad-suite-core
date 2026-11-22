# Hospital PACS Direct Harvester & Multi-Source Federated Storage

This document specifies the direct Hospital PACS DIMSE harvester, the 5-tier unified storage hierarchy, and the standby cross-tier query selector.

---

## 1. Hospital PACS Direct Harvester (Zero Console Alteration)
- **Zero Console Reconfiguration**: Modifying 30–40 console PCs across the hospital is completely avoided. The Edge Agent actively communicates with the central Hospital PACS (`10.0.0.100:8040`, AET: `HMIS_PACS`) using whitelisted Calling AET `RADIANT`.
- **Strict DIMSE C-GET Protocol**: Hospital PACS rejects `C-MOVE` with `0xC000`. The edge harvester uses strict `C-GET` DIMSE protocol over a single bidirectional association, ensuring full compatibility.
- **Automated Scheduled Harvester**: Runs every 15 minutes querying `HMIS_PACS` for today's studies matching modality (`MR`) and description keywords (`brain`, `spine`, `ls spine`), pulls them via C-GET into Orthanc, and uploads to S3 (`https://s3.sehatai.org/radiology`).
- **On-Demand Remote Fetching**: Remote clinicians trigger immediate full-day harvest (`harvest-pacs`) or specific accession retrieval (`fetch-accession`) directly from Rad Suite `/settings` (via `ClinicPacsPullCard`) or Worklist via reverse heartbeat commands.
- **Modular Edge Architecture (< 350 Lines)**: Decomposed into standalone modules: `s3-uploader.js` (AWS SigV4), `pacs-harvester.js` (C-FIND & C-GET), `system-metrics.js` (health & telemetry), and `clinic-agent.js` (orchestration daemon).

---

## 2. Multi-Source Clinical Case Ingestion & Standby Cross-Tier Selector
- **Five-Tier Unified Storage Hierarchy**: Studies are federated across 5 clinical sources (`local_archive` / `E:\Cases`, `s3` object storage, `gdrive`, `hospital_pacs` DIMSE C-FIND, and `remote_node` Clinic PC edge daemon). Aggregator (`unified-source-aggregator.service.ts`) queries requested tiers in parallel and performs multi-mirror deduplication with presence badges (`PacsSourceBadge`).
- **Interactive Workstation Standby Explorer (`ZenWorkstationStandby`)**: Standalone route (`/workstation`) features dedicated source tabs (`All Sources`, `Local Disk (E:)`, `S3 Cloud Storage`, `Google Drive`, `Direct PACS Query`, `Remote Clinic Node`), instant search, modality filters, and rich diagnostic case cards (`StandbyCaseCard`) showing series/slice counts and multi-mirror indicators.
- **Direct Hospital PACS DIMSE Query Pane (`StandbyPacsQueryPane`)**: Interactive form allowing radiologists to query `HMIS_PACS:8040` (calling AET: `RADIANT`) by accession, patient MRN, modality, and date range without leaving the workstation standby screen, returning live results with 1-click C-GET retrieve & launch.
- **Remote Clinic Edge Daemon Control & Pull Pane (`StandbyRemoteNodePane`)**: Telemetry dashboard displaying edge PC online state, Orthanc daemon health, disk space, and active upload progress bar. Allows 1-click on-demand remote pull dispatch (`fetch-accession`) to instruct the clinic node to retrieve historical studies from clinic PACS and stream them into S3.
- **Multi-Source Fallback Resolution Invariant**: `getPacsStudyByAccession()` checks local archive, S3, Google Drive, and clinic edge synced records before invoking DIMSE C-FIND, ensuring that visiting `/workstation/[accession]` for any study across any storage tier auto-imports the record and launches the workstation smoothly.

---

## 3. Continuous "Today & Yesterday" Database Indexing & Unblocked Search
- **Continuous "Today & Yesterday" Database Mirror**: Default view displays studies from today and yesterday (active shift rolling window) by maintaining an indexed table (`hospital_pacs_studies`) synchronized continuously with central hospital PACS.
- **Unblocked Historical Search**: When a clinician searches for an accession, MRN, or patient name, the default "Today & Yesterday" date constraint is automatically bypassed across index queries (`hospital-pacs-index.service.ts`), federation relays (`hospital-pacs-federation.service.ts`), and worklist filters (`unified-case-filters.ts`), allowing clinicians to instantly locate historical cases without having to manually change the date filter to "All Time".
- **Multi-Layer Runtime Date & Driver Safeguard**: Global `Date.prototype.toISOString` interceptor in `src/instrumentation.ts` and `src/db/schema/index.ts` shields against `RangeError: Invalid time value` across all Next.js Turbopack chunks. Schema-level column wrappers (`dataType === 'date'`) safely handle nulls, raw DICOM 8-digit strings (`YYYYMMDD`), HMIS dates (`DD-MM-YYYY`), and invalid dates, falling back to valid ISO timestamps instead of throwing driver errors.
- **Sub-5ms Query Latency**: Radiologists searching by patient name, MRN, accession, or description get instantaneous results from the local workstation database (`hospital-pacs-index.service.ts`), completely bypassing slow round-trip network DIMSE C-FIND operations during clinical triage.
- **Live Sync Status Tracking**: Every indexed study records whether it is already present in Cloud S3 (`isSyncedToS3`), when it was last checked, and its storage sync timestamp (`s3SyncedAt`).
- **Upsert Deduplication**: `indexHospitalPacsStudies` parses and validates incoming C-FIND studies, upserting records against the unique `accessionNumber` constraint without duplicate rows.

---

## 4. First-Class Hospital PACS Workstation (`/pacs`) & Live Streaming
- **Dedicated PACS Screen (`/pacs`)**: Top-level primary workstation screen following RadiAnt PACS design ergonomics.
- **Unified Ingestion & HMIS Decoupling Invariant**:
  - **Strict HMIS Boundary**: The Punjab HMIS worklist (`/worklist`) is strictly a scraper and synchronization engine for patient orders, hospital worklists, and report dispatches. **No DICOM upload or imaging ingestion is permitted in HMIS**.
  - **PACS-Centric Ingestion (`/pacs`)**: All imaging ingestion actions reside exclusively in the PACS screen via `PacsUnifiedFilterBar`:
    1. **`Import Folder` (`LocalFolderImportModal`)**: Scans and indexes local workstation drives and candidate directories (`C:\MedicalSandbox\Cases`, `C:\Users\muham\Downloads\cases`, `E:\Cases`).
    2. **`Upload Case` (`CaseUploadModal`)**: Ingests browser drag-and-drop `.zip` archives or series directories via `POST /api/cases/upload`, parses DICOM headers, updates `studies` and `patients`, and provides instant 1-click workspace launch.
- **Unified Filtering & Clean Source Tabs**:
  - `PacsUnifiedFilterBar`: Streamlined source filter tabs focusing on **All Sources**, **Cloud S3**, and **Clinic PC (Local)** (redundant "Hospital PACS" sub-tab removed since the entire screen is connected to hospital PACS). Fast modality selection (All, MRI, CT, X-Ray, Ultrasound), compact `DateRangeDropdown` defaulted to **"Today & Yesterday (Default)"** (`48h`), clearable search input, dedicated `Import Folder` and `Upload Case` action buttons, and a focused `[ Search ]` trigger.
  - `PacsUnifiedTable`: Multi-select batch rows, S3 presence badges, consultant case share action (`CaseShareModal`), and direct action triggers.
  - `PacsUnifiedSelectionBar`: Floating bottom action bar displaying the count of selected studies and triggering bulk S3 cloud ingestion.
- **Federated Fallback Querying (`queryAndFederateHospitalPacs`)**:
  - When a query yields 0 rows in the local SQLite table, the system seamlessly checks Clinic Gateway master study ledger, Clinic PC in-memory telemetry (`localStudies` & `syncedStudies`), and initiates direct DIMSE C-FIND when connected to the hospital network.
  - Automatically indexes discovered studies into `hospital_pacs_studies`, providing sub-5ms cached queries thereafter.
- **On-Demand Live Streaming (<50ms Route Transition)**: When a clinician clicks "Stream & View" on a study not yet in S3:
  1. Background fetch triggers `/api/pacs/retrieve` with `keepalive: true` non-blockingly.
  2. Router immediately pushes to `/workstation/[accession]` in `<50ms`.
  3. Priority Slice 0 and lightweight study manifest load in `<2s`, allowing the radiologist to start reading immediately while subsequent slices stream into the reactive buffer track.

---

## 5. Clinic PC Local Storage & Configurable Retention Reaper
- **Local Resident Studies Explorer**: Surfaces all studies residing on the Clinic PC host disk (`MedicalSandbox\OrthancStorage`) with exact MB sizes and S3 sync confirmation indicators.
- **Persistent Disk Protection Cap**: Storage FIFO threshold (`maxStorageSizeGb`) is synchronized via reverse-command `set-disk-cap` and persisted in `agent-config.json`, preventing disk exhaustion.
- **Configurable Retention Reaper**:
  - **Optional Auto-Purge**: Configurable toggle (`autoRetention.enabled`) and age threshold (`autoRetention.ageDays`: immediately once synced, 1d, 2d, 3d, 7d, 14d, 30d).
  - **Zero-Loss Protection Guard**: Studies are strictly never purged from Orthanc disk unless `isAlreadySynced(accession)` confirms they are safely mirrored in Cloud S3 storage.
  - **Manual 1-Click Cleanup**: Clinicians can trigger `[🧹 Purge All Synced]` or `[Purge Synced >3d]` directly from Admin Clinic Node Settings.

---

## 6. Storage Source RBAC Defense-in-Depth & Custom PACS Server Nodes
- **Strict Storage Source Access Control**: Clinicians with restricted storage permissions (`allowedStorageSources` omitting `pacs`, `s3`, or `remote_node`) cannot query or view studies hosted on those tiers. `buildStorageRbacConditions` enforces this at the SQL query level in `hospital_pacs_studies`.
- **Dynamic UI Dropdown Scoping**: `PacsSourceDropdown` dynamically filters its options, hiding unauthorized storage locations (e.g., hiding "Clinic PC" or "Cloud S3").
- **Custom PACS Server Nodes (`PacsServersModal`)**: Clinicians can register, test (ping), and manage their own departmental or clinic DICOM DIMSE nodes via `/api/pacs/servers` without requiring administrative elevation. System presets (such as LGH HMIS PACS) are locked from unauthorized deletion or mutation.


---

## 6. Strict Modality Inference & COD Emergency CT Isolation
- **Clinical Modality Bleed Prevention**: The hospital PACS C-FIND Study root queries return empty modality tags `(0008,0060)` at the study level. To prevent non-MR studies from leaking into MRI harvest queues:
  - **Emergency Night Shift (`COD`) Rule**: Patient names ending with `COD` (Call On Duty emergency trauma head CTs) are unconditionally inferred as `CT` (`CT Brain Plain`), preventing phantom `MR Brain Plain` records.
  - **Single Accession Invariant**: Dedupes multi-record accession rows so an accession cannot exist concurrently as both phantom `MR` and real `CT`.
  - **Time & Schedule Integrity**: Study times `(0008,0030)` strictly represent real scanner acquisition times, ensuring MRI scanner schedules (8 AM – 12 AM) remain clinically accurate.

---

## 7. PACS Anti-Choking Protection & Vitrea Workstation Ingestion
- **PACS Port & Association Protection**: Hospital PACS (`192.168.1.100:8040`) supports only 2–5 concurrent associations. Non-stop `bypassKeywords: true` downloads of 2,000+ slice studies cause port exhaustion (`ECONNREFUSED`), blocking incoming Siemens MRI `C-STORE` pushes. Daytime harvesting (08:00–17:00) MUST enforce strict keyword filtering (`spine`, `lumbar`, `cervical`) and polite backoff.
- **Vitrea Secondary Ingestion**: Vitrea console (`VITREACONSOLE` at `192.168.0.151:3003`, AET `QRSCP`, SMB `\\192.168.0.151\E$`) serves as a secondary or fallback ingestion source when hospital PACS drops scans.
- **Console Re-Send Protocol**: Scans stuck on scanner hard drive due to PACS congestion can be re-pushed via Siemens Syngo Patient Browser -> Transfer -> Send once port congestion is cleared. Reference: [`docs/architecture/hospital-pacs-stability-and-vitrea.md`](hospital-pacs-stability-and-vitrea.md).
