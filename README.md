# 🏥 Rad Suite — Open Core Radiology Reporting Workstation

Rad Suite is a high-performance, clinical-grade radiology workstation built for modern diagnostic workflows. It integrates WebGL DICOM image viewing, structured diagnostic reporting, multi-tier PACS federation (DIMSE/C-FIND/C-GET), cross-platform desktop builds (Tauri), and an extensible **Modular Plugin System**.

---

## 🧩 Open Core & Modular Plugin Architecture

Rad Suite is built on an **Open Core** foundation:

- **Open Core (Free & Open Source)**:
  - **Full-Featured DICOM Web Viewer**: WebGL/Cornerstone GPU rendering, multi-series MPR, cine playback, measurements, and presets.
  - **Structured Clinical Reporting**: Rich TipTap editor with automated templates, ICD-10 indexing, and markdown/HTML export.
  - **Local SQLite Database & Offline First**: Zero external database dependencies required for standalone practice.
  - **DICOM DIMSE Networking**: Standard `C-FIND`, `C-GET`, and `C-ECHO` to connect directly with hospital PACS or Orthanc.
  - **Bring-Your-Own-Key (BYOK) AI Copilot**: Direct support for local LLM engines (llama.cpp/Ollama) and cloud AI providers.
  - **Cross-Platform Native Desktop**: Tauri-powered desktop builds for Windows, macOS, and Linux.

- **Modular Enterprise Plugins (Private & Extensible)**:
  - Enterprise hospital portals, custom telemetry daemons, edge harvesters, and fine-tuned proprietary AI models operate as independent plugins.
  - Installable via 1-click zip upload in **Settings → Plugins & Modules** or unzipped directly into the `plugins/` directory.
  - Zero core recompilation required. Plugins contribute seamlessly into UI slots (`workstation:toolbar`, `workstation:sidebar`, `workstation:tab`, `settings:tab`).

---

## 🌟 Key Features

### 1. 🗄️ Unified Multi-System Diagnostic Worklist
- Aggregates cases seamlessly across **Hospital PACS** (DICOM DIMSE C-FIND / C-GET), **Local Hard Drive Storage**, and **Cloud Archive** (S3 / GDrive).
- **Real-Time Presence Matrix**: Tracks where DICOM image series and HMIS orders reside, automatically surfacing discrepancy alerts when imaging is present on console but unbooked on the portal, or registered on HMIS without PACS studies.

### 2. 👥 Resident / PGR Case Allocation & Concurrency Locking
- Daily caseloads (40–50 MRI and CT studies) can be partitioned among reporting Post-Graduate Residents (PGRs) and consultants.
- **1-Click Claim / Release**:
  - `Take Up Case`: Locks the study (`studies.assigned_radiologist_id`, `studies.claimed_at`) to the clinician, preventing double-reporting with automatic 409 Conflict rejection.
  - `Release`: Returns the study back to the unassigned pool.
- **Categorized Worklist Tabs**: 1-click filtering between `Department Backlog`, `⭐ My Cases`, `Unassigned Pool`, and `⚠️ Discrepancies`.
- **Full HIPAA Audit Trail**: Every assignment and release is tamper-evidently logged via `AuditService`.

### 3. ⚡ Direct HMIS Reporting Panes (Zero Copy-Paste)
- Direct integration with Punjab HMIS Gateway eliminating manual copy-pasting into portal iframes:
  - **HMIS Draft**: Dispatches formatted findings, technique, and impressions directly into TinyMCE fields on `hmis.punjab.gov.pk` (`POST /api/hmis/draft`).
  - **Revert to Default**: 1-click rollback restoring the official normal template (`POST /api/hmis/revert`).
- **Durable Local Vault First**: Every report is secured in `hmis_draft_vault` before network dispatch to guarantee zero data loss.
- **Zero-Submit & Zero-Reject Safety Invariant**: Rad Suite and the gateway enforce `save('save')` draft-only mode; final submission and rejection links remain strictly locked.

### 4. 🔄 Unified HMIS + PACS Worklist & Milestone Tracking
- **Automated Background Ingestion**: Reconciles incoming HMIS patient orders and PACS/local studies via `POST /api/hmis/sync-worklist` without UI blocking.
- **Status Normalization (`⏳ Awaiting Report`)**: Proceeded patients from HMIS are imported as `status: 'scheduled'` and `hmis_status: 'awaiting_report'`, clearly distinguished from drafts and never mistakenly marked as final/signed.
- **Department & Modality Segmenting**: Instantly filter cases by clinical stream (`🚨 ER`, `🏥 OPD`, `🛏️ Ward`) and modality (`CT`, `MRI`, `X-Ray`).
- **Live Milestone Tracking**: 1-click tracking refresh queries the HMIS tracking lifecycle (`GET /api/hmis/track`) to populate milestones (Order → Reception → Scheduled → Pending Ack → Radiographer Ack → Performed → Rejected → Verified → Published).
- **Automated Retention & Vacuum**: Background cleanup pruning unlinked historical indices older than 90 days and running SQLite `VACUUM` to keep local storage lean (< 60MB for 100k records).

### 5. 📱 Responsive Mobile Shell
- Responsive layout where fixed desktop sidebars are completely hidden on mobile screens (`< 768px`).
- Header hamburger menu launches the full-height `MobileNavDrawer` for smooth navigation on phones and tablets.

### 6. ☁️ Clinic PC Node & Direct Hospital PACS Harvester (Zero Console Reconfiguration)
- **Zero Console Reconfiguration**: Modifying individual console PCs across the hospital is avoided. The Edge Agent communicates directly with the central PACS server using standard DIMSE retrieval.
- **Strict C-GET Protocol**: Central PACS rejects `C-MOVE` with `0xC000`. The edge harvester uses single-association `C-GET` DIMSE retrieval.
- **Selective Edge Filters**: Clinicians configure allowed modalities (`MR`) and description keywords (`brain`, `spine`, `ls spine`) in `/settings` to prune unwanted scans before S3 dispatch.
- **Scheduled & On-Demand Ingestion**: Automated background polling runs every 15 minutes for today's scans, with 1-click on-demand harvest and accession fetch in Rad Suite `/settings`.
- **Native AWS SigV4 S3 Uploader**: Uploads directly to S3 (`https://s3.sehatai.org/radiology`) with zero external CLI or Python dependencies.
- **Session 0 Silent Service**: Operates as native Windows services (`RadSuiteEdgeAgent` & `Orthanc`) with zero popups, surviving reboots and crashes (`SERVICE_AUTO_START`).
- **Dual Remote Reading**: 60 FPS streaming in `ZenWorkstation` web viewer and 1-click DICOM ZIP download for Desktop RadiAnt.

### 7. 🚀 High-Throughput Multi-Filter Worklist Harvesting
- **Complete Portal Filters**: Mirrors all native filtering controls from Punjab HMIS `/radiology/proceeded-patients`:
  - `modality`: Auto-mapped to CPT SubCategory (`CT` -> `1`, `Fluoroscopy` -> `2`, `Mammography` -> `3`, `MRI` -> `4`, `Ultrasound` -> `5`, `X-Ray` -> `6`, `Cardiac` -> `31`, `Cardiology` -> `32`).
  - `serviceType`: Normalized encounter/department (`OPD` -> `1`, `ER` -> `2`, `IPD` -> `3`, `Private` -> `4`).
  - `status`: Patient scheduled status (`scheduled`, `unscheduled`).
  - `dateType` (`1: Order Date`, `2: Scheduled Date`) & `startDate` / `endDate` (`YYYY-MM-DD HH:mm:ss`).
  - `accession`, `mrn`, `name`, `contact`, `cnic`, `cpt`: Targeted direct text search.
- **Configurable Page Sizing & Harvesting**:
  - `perPage`: Select from `10`, `25`, `50`, or `100` patients per page (default: `50`), eliminating the portal's default 10-patient limitation.
  - `fetchAllPages`: Seamless multi-page traversal (up to `maxPages`, clamped 1–10) with automatic deduplication by `mrn-accession`.
- **Status Normalization Invariant**: Studies harvested from HMIS Proceeded Patients have completed radiography and await diagnosis. Rad Suite indexes them with `status: 'scheduled'` and `hmis_status: 'awaiting_report'`, displayed as `⏳ Awaiting Report` to prevent confusion with drafted or finalized reports.
- **Sub-50ms Indexed Querying**: Workstation displays cases directly from the local SQLite index (`POST /api/hmis/sync-worklist`) without live web scraping latencies during routine clinical worklist interactions.

### 8. 🌐 End-to-End Cloud S3 Ingestion, Telemetry Queue & Remote DICOM Viewing
- **Real-Time Edge Telemetry & Queue Tracking**: Surfaces live upload progress (`activeUpload`: accession, patient name, modality, series description, completed/total slices, percentage bar) and pending study queue (`uploadQueue`) over `POST /api/clinic-node/heartbeat`, rendered on `/settings?tab=clinic-node` via `ClinicTrackerCard`.
- **S3 Ceph Rate Limiting & Backoff Protocol**: Handles Ceph S3 `HTTP 503 SlowDown` via single-stream or regulated concurrency with keep-alive HTTPS agents, exponential backoff, and socket timeout enforcement (`req.on('timeout')`).
- **Dual-Interface IPv4 Routing Invariant**: Automatically prioritizes IPv4 over IPv6 (`dns.setDefaultResultOrder('ipv4first')`) to prevent connection timeouts when hospital ethernet LAN and clinic internet Wi-Fi are connected simultaneously.
- **Strict Multi-Series S3 Partitioning**: Stores slices under deterministic clinical hierarchy `dicom/{YYYY}/{MM}/{MODALITY}/{ACCESSION}_{PATIENT}_{UID}/series-{NUM}_{DESC}/{SOP_UID}.dcm`, completely preventing sequence cross-contamination.
- **Instant Remote Viewport Streaming (< 15ms Cache)**: Remote workstation `/workstation/[accession]` reads series dynamically via `getS3StudySeries()`. Cold S3 fetches stream through `/api/cases/slice?source=s3` and cache locally in `storage/cache/s3/{accession}/`, enabling instant sub-15ms scrubbing.
- **1-Click RadiAnt ZIP Streaming**: Generates deflate-compressed DICOM ZIPs on-demand (`/api/cases/[accession]/download-dicom`) via Archiver 8.0 `ZipArchive`, packaging 40–100MB studies into ~28MB ZIPs in < 4 seconds for instant viewing in desktop RadiAnt.

### 9. 🔄 Multi-Source Case Selection & Diagnostic Standby Explorer
- **Five-Tier Ingestion Matrix**: Seamlessly select and query diagnostic studies from:
  1. **💾 Local Disk (`E:\Cases`)**: Zero-latency local SSD/HDD cases with instant series loading.
  2. **🪣 S3 Cloud Storage**: Ceph/AWS S3 object storage bucket with multi-series taxonomy.
  3. **📁 Google Drive**: Authenticated clinical Google Drive cloud repository.
  4. **🖥️ Hospital PACS (Direct C-FIND)**: Live DIMSE queries against `HMIS_PACS:8040` by Accession, MRN, Modality, and Date range with 1-click C-GET retrieval.
  5. **⚡ Remote Clinic Node**: Real-time edge PC daemon telemetry, active upload tracking, and on-demand remote pull dispatch (`fetch-accession`).
- **Interactive Workstation Standby Explorer**: Comprehensive case selector on `/workstation` with live source tabs, filter bar (patient name, MRN, accession, scan type), modality chips (CT/MR/CR/US), and rich diagnostic cards (`StandbyCaseCard`) featuring series/slice counts, mirror badges (`PacsSourceBadge`), and 1-click launch.
- **Universal Multi-Source Fallback**: Accessing `/workstation/[accession]` automatically queries across local drive, S3, Google Drive, and clinic node synced caches, importing the study into the database and launching the reporting workstation without friction.

---

## 🏗️ Architecture

Rad Suite adheres strictly to a **4-Layer Modular Architecture**:
- **Layer 1 (Transport)**: `src/app/api/*` — Thin controllers validating payloads with Zod schemas and delegating to services.
- **Layer 2 (Domain/Services)**: `src/services/*` — Core medical algorithms, case allocation, discrepancy reconciliation, and report generation.
- **Layer 3 (Data)**: `src/db/*` — Modular Drizzle ORM schemas with PostgreSQL and SQLite dialect compatibility.
- **Layer 4 (Presentation)**: `src/components/*` — Atomic UI primitives and feature modules (`workstation`, `worklist`, `dicom`, `hmis`, `audit`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation
```bash
git clone https://github.com/doceducates/Rad-Reporting.git
cd Rad-Reporting/rad-suite
npm install
```

### Environment Configuration
Create `.env.local` in `rad-suite/`:
```env
DATABASE_URL="file:./radsuite.db"
HMIS_GATEWAY_URL="http://localhost:8080"
JWT_SECRET="your-256-bit-secret"
API_SECRET_KEY="your-gateway-key"
```

### Development Server
```bash
npm run dev
# Workstation available at http://localhost:3000
```

### Running Tests
```bash
npm test
# Runs 77 Vitest test suites (356 unit & integration tests)
```

---

## 🛡️ License & Compliance
Rad Suite is built for healthcare institutions under HIPAA data security guidelines, ensuring AES-256-GCM encryption of external portal credentials and tamper-evident audit logging.
