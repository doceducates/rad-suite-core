# S3 Cloud Storage, Teleradiology Ingestion & Multi-Series Architecture

This document specifies the S3-compatible cloud storage architecture, dual-mirror synchronization, Ceph rate-limiting protocols, tiered disk caching, and external viewer streaming.

---

## 1. Standard Clinical Taxonomy
DICOM instances and associated diagnostic assets are strictly partitioned by date and modality:
- **DICOM Instances**: `dicom/{YYYY}/{MM}/{MODALITY}/{ACCESSION}_{PATIENT_NAME}_{STUDY_UID}/series-{NUM}_{DESC}/{SOP_INSTANCE_UID}.dcm`
- **Reports**: `reports/{YYYY}/{MM}/{MODALITY}/{ACCESSION}/report_{ACCESSION}.{pdf|json}`
- **Media**: `media/{YYYY}/{MM}/{MODALITY}/{ACCESSION}/{mediaType}/{FILENAME}`

This deterministic hierarchy enables fast, targeted prefix filtering without requiring full bucket scans.

---

## 2. Mandatory Path-Style Addressing
Custom endpoints (e.g., `s3.sehatai.org`, MinIO, Ceph) require path-style URLs (`https://<endpoint>/<bucket>/<key>`) rather than virtual-host subdomains. This is enforced via `s3ForcePathStyle: true`.

---

## 3. Cloudflare & Reverse Proxy Compatibility
Streaming chunked transfer encoding (`aws-chunked`) triggers `IncompleteBody` errors on reverse proxies. Workstation uploads enforce standard fixed `Content-Length` and valid `User-Agent: RadSuite/1.0`.

---

## 4. Live Connection Diagnostics
`POST /api/pacs/storage-config/test` validates endpoint responsiveness, credentials, and bucket access, reporting millisecond round-trip latency and discovered buckets (`rad-suite`, `radiology`, etc.).

---

## 5. Dual Cloud Mirror Orchestration
`cloud-sync.service.ts` coordinates primary S3 uploads alongside optional secondary Google Drive mirroring using the exact same folder hierarchy.

---

## 6. End-to-End Teleradiology S3 Ingestion & Telemetry Queue
- **Zero-Console Edge Telemetry & Live Upload Queue**: The clinic edge node tracks active slice progress (`activeUpload`: accession, patientName, modality, seriesDescription, completedSlices, totalSlices, progressPercent) and queued studies (`uploadQueue`) over `POST /api/clinic-node/heartbeat`, surfaced in `/settings` via `ClinicTrackerCard` with real-time progress bars, slice counts, and animated status indicators.
- **S3 Ceph Rate Limiting & Backoff Protocol**: Ceph object storage at `https://s3.sehatai.org/rad-suite` throttles high concurrency with `HTTP 503 SlowDown`. Ingestion enforces a sequential pipeline with exponential backoff on 503/429/500/ETIMEDOUT, keep-alive HTTPS agents, and explicit socket timeout destruction (`req.on('timeout')`).
- **Dual-Interface DNS Resolution Invariant (`ipv4first`)**: On clinic and hospital workstations configured with dual network interfaces (Ethernet on hospital LAN and Wi-Fi for internet), Node.js happy-eyeballs IPv6 lookups fail or hang. `dns.setDefaultResultOrder('ipv4first')` is globally enforced across all S3 clients, edge daemons, and benchmark scripts.
- **Deterministic Multi-Series S3 Hierarchy & Zero Sequence Bleed**: Slices are partitioned strictly as `dicom/{YYYY}/{MM}/{MODALITY}/{ACCESSION}_{PATIENT_NAME}_{STUDY_UID}/series-{SERIES_NUM}_{SERIES_DESC}/{SOP_INSTANCE_UID}.dcm`. Guarantees zero cross-series sequence contamination (e.g. Axial mixing with Sagittal) across high-volume multi-region MRI scans.
- **Remote Workstation Retrieval & Tiered Disk LRU Cache**: Remote viewers (`/workstation/[accession]`) discover series structure dynamically via `getS3StudySeries()`. Streaming endpoint `/api/cases/slice?source=s3` caches remote S3 slices locally in `storage/cache/s3/{accession}/`, dropping warm fetch latency from 100–3000ms to sub-15ms for instant 60 FPS viewport scrubbing.
- **Streaming DICOM Packaging for External Viewers (RadiAnt)**: `GET /api/cases/[accession]/download-dicom` utilizes Archiver 8.0 `ZipArchive` to deflate-compress and package full 40–100MB multi-sequence studies into standard ZIP archives on-the-fly (~3–5 seconds), allowing radiologists to open cases directly in RadiAnt or other desktop viewers without manual conversion.

---

## 7. Multi-Tier Report Version Control & S3 Cloud Archival Sync

To prevent accidental data loss in clinical reporting and maintain HIPAA-compliant historical auditing, Rad Suite implements a dual-tier version control and cloud backup architecture:

### S3 Key Taxonomy & Version Snapshots
- **Active Latest Pointer**: `reports/{YYYY}/{MM}/{MODALITY}/{ACCESSION}/report_{ACCESSION}.{json|pdf}`
- **Immutable Archival Revision**: `reports/{YYYY}/{MM}/{MODALITY}/{ACCESSION}/revisions/v{VERSION}_{TIMESTAMP}_report_{ACCESSION}.{json|pdf}`
- **Cloud Metadata Headers**:
  - `x-amz-meta-accession`: Accession number
  - `x-amz-meta-patient-name`: Patient full name
  - `x-amz-meta-version`: Version number (e.g. `1`, `2`, `3`)

### Local Workstation Retention & Lifecycle Rules
1. **Duplicate Guard**: Saves with identical findings, impression, technique, and status skip redundant revision creation, preventing micro-save bloat.
2. **Rolling Draft Pruning**: Draft revisions are capped to the 10 most recent snapshots. `final` (signed) and `submitted` (PGR trainee) milestones are exempted and permanently retained.
3. **Additive Restore**: Reverting to an earlier version via `POST /api/reports/:id/revisions/:version/restore` writes historical content back to the active report and appends a new additive revision (`Restored from vN`), ensuring historical chain of custody is never destroyed.
4. **Tamper-Evident Audit Logging**: Every restore triggers `logAudit` with action `RESTORE_REPORT_REVISION` and clinician attribution.
5. **UI History Drawer**: Workstation header surfaces `v{N} • History` badge opening a slide-over timeline drawer with side-by-side snapshot comparison and 1-click restore.

---

## 8. Strict Modality Isolation & Multi-Study Boundary Guarantee
- **Cross-Modality Accession Disambiguation**: In hospital systems, the same accession number can be generated across modalities (e.g. Accession `192610002587` for both a CT Brain and an MRI Brain of different patients).
- **Modality Path Isolation**: `getS3StudyKeys(accession, { modality })` and `getS3StudySeries(accession, { modality })` enforce strict folder prefix matching (`/${modality.toUpperCase()}/`). This prevents CT slices from infiltrating MRI viewing sessions.
- **Composite Unique Index**: Workstation database enforces `uniqueIndex('idx_pacs_studies_acc_modality').on(t.accessionNumber, t.modality)` so multiple modalities sharing an accession number coexist without overwriting each other.

---

## 9. Automatic S3 Cloud Catalog Synchronizer (`s3-catalog-sync.service.ts`)
- **Instant Rehydration on New Domains / Empty DBs**: When Rad Suite is deployed to a fresh VPS domain with an empty SQLite database, `syncS3BucketToDatabase()` (or `POST /api/pacs/s3-sync`) crawls the S3 bucket's `dicom/` tree.
- **Automatic Reconstruction**: Ingests each discovered study folder into `hospital_pacs_studies`, computing exact slice counts, series numbers, study dates, and setting `s3Status: 'synced'`. All previously uploaded cases appear instantly in the PACS worklist without requiring manual re-upload or edge connection.

---

## 10. Tiered Hot Staging Storage & Polite Telegram Archival
To eliminate Telegram upload throttling on clinic edge nodes and guarantee instantaneous 0–1ms diagnostic viewing across desktop, tablet, and mobile, Rad Suite implements a 3-tier hot/cold storage hierarchy:

1. **VPS Hot Staging Buffer (`/storage/hot-cases/`)**:
   - Clinic PC streams slices directly to `POST /api/clinic-node/stage-slice` over HTTPS at full line speed (50–100 slices/sec).
   - Slices are saved directly to the VPS NVMe SSD, bypassing all Telegram Bot API `FloodWait 429` rate limits.
   - Slices load in 0–1 ms via `GET /api/cases/slice` (`X-RadSuite-Source: hot-staging`).
2. **Strict 10 GB VPS Disk Quota & Today's Case Prioritization**:
   - The hot staging folder is strictly capped at **10 GB** (`MAX_HOT_STORAGE_BYTES`).
   - Active cases from **Today** (`studyDate === formatDicomToday()`) are strictly protected from pruning.
   - Pruning only occurs when total hot storage exceeds 10 GB, and ONLY deletes studies that are already 100% verified in Telegram S3 (`isSyncedToS3: true`), ordered by oldest first (FIFO).
3. **Polite Background Archiver Daemon (`hot-case-archiver.service.ts`)**:
   - Runs in the background every 25 seconds via Next.js server instrumentation (`register()`).
   - Prioritizes Today's cases, slowly and politely trickling slices to Telegram S3 gateway (`http://127.0.0.1:3444`) with 250ms spacing between slices.
   - Once all slices of a study are confirmed in Telegram S3, marks the study as `isSyncedToS3: true` and triggers quota check.
4. **Resilient Dual-Mode Edge Uplink**:
   - Clinic edge node (`s3-uploader.js`) attempts fast VPS staging first.
   - If VPS staging endpoint is temporarily unreachable, it automatically falls back to direct Telegram S3 upload with zero interruption.

---

## 11. Slice Bounds Calculation & Gap Reconciliation
- **Numeric Prefix Bounds**: Slice manifests (`study-manifest.service.ts`, `hot-case-staging.service.ts`, and `s3-retrieval.service.ts`) strictly parse numeric prefixes (`/(\d{4})_/`) rather than raw directory or key counts. This prevents duplicate files or legacy SOP UIDs from inflating slice counts and eliminates client-side 404 errors during viewport scrubbing.
- **Auto-Populating S3 Tiered Cache**: When a slice is retrieved from S3 via `GET /api/cases/slice`, it automatically populates the VPS hot-staging disk directory, converting subsequent requests to instant zero-latency local disk reads.
- **Fast Resilient Edge Synchronizer**: `sync-case-slices.js` uses direct Orthanc study ID checks, 15-way batched recent study queries, and per-slice retry pipelines to backfill sequence gaps without hanging edge agents.

---

## 12. Per-User Storage Tier Routing & Cost Isolation
- **Admin vs Non-Admin Storage Partitioning**:
  - **Admin**: Stored on central VPS SSD buffer with cold archival to Admin Telegram S3 / AWS S3 (`s3.sehatai.org`).
  - **Non-Admin Clinicians**: Must link personal Google Drive account. Cases claimed or fetched by non-admins are routed into an ephemeral transit buffer on VPS SSD for active web viewing, offloaded as a consolidated Study ZIP to the clinician's personal Google Drive (`Rad Suite Cases / YYYY / MM / MODALITY /`), and pruned immediately from VPS disk.
- **Zero-Disk Ingress Guarantee**: Eliminates storage and bandwidth billing on the admin's host infrastructure for other clinicians' casework.




