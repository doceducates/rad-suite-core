# Clinic Edge Node Architecture & Operating Rules

This document defines the strict operational rules, data invariants, and failure-mode mitigations for Rad Suite Clinic Edge Nodes deployed on hospital reporting workstations.

---

## 1. Zero Loose DCM in Cloud Storage Invariant
- **Rule**: **NEVER upload individual `.dcm` files to S3 Cloud Storage.**
- **Rationale**: Uploading individual slice files creates thousands of high-overhead HTTP PUT requests, exhausts S3 API quotas, leads to partial-study corruption during network drops, and prevents efficient streaming.
- **Enforcement**:
  1. Edge nodes package series into ZIP archives via Orthanc `/series/<id>/archive`.
  2. Series ZIPs are streamed directly to the VPS staging endpoint (`POST /api/clinic-node/stage-series-zip`).
  3. S3 Cloud Storage receives **ONLY consolidated Study ZIP archives**:
     `dicom/{YYYY}/{MM}/{MODALITY}/{ACCESSION}_{PATIENT}_{STUDY_UID}.zip`
     along with a companion manifest:
     `dicom/{YYYY}/{MM}/{MODALITY}/{ACCESSION}_{PATIENT}_{STUDY_UID}.manifest.json`
  4. Direct fallback upload from edge to S3 must use `/studies/<id>/archive` as a single `.zip` file. Individual `.dcm` slice PUTs are strictly forbidden.

---

## 2. Three-Tier Staging, Hot-Cache & Archival Pipeline
```
[Hospital PACS (192.168.1.100:8040)]
        │ C-GET (DIMSE LAN Gigabit)
        ▼
[Tier 1: Edge Sandbox (C:\MedicalSandbox\Orthanc)] (100 GB LRU Cache)
        │
        │ Series ZIP Stream (/api/clinic-node/stage-series-zip)
        ▼
[Tier 2: VPS Hot NVMe Cache (/storage/hot-cases/)] (Today & Yesterday Cases)
        │ ├── Instant Web Viewer Slices (0–1ms access)
        │ └── Zero WAN Retransmission
        │
        │ Consolidated Study ZIP PUT (hot-case-archiver.service)
        ▼
[Tier 3: Telegram S3 Cloud Archive] (Single Study .zip + .manifest.json)
```

1. **Tier 1 (Hospital LAN Ingestion)**: Orthanc pulls DICOM instances across hospital Gigabit LAN at wire speed.
2. **Tier 2 (VPS Hot-Staging Cache)**: Today and yesterday's studies are decompressed into VPS NVMe storage, allowing radiologists to report immediately without waiting for S3 downloads.
3. **Tier 3 (Polite Background Archiving)**: Once all series are complete, the VPS background archiver consolidates the entire study into one `.zip` and uploads to S3 in a single polite request.

---

## 3. Modality & Selective Keyword Filtering Rules
- **Anti-Choking Invariant**:
  - `bypassKeywords: false` MUST be enforced to prevent downloading thousands of unvetted CT/MRI slices that choke the edge machine and hospital PACS port 8040.
  - Allowed modalities default strictly to `['MR']`. Non-selected modalities (CT, CR, US) are ignored.
- **Harvest Schedule vs. Sync Rules**:
  - `harvestSchedule`: Governs what the edge node queries and pulls from the Hospital PACS into the local medical sandbox (default: `MR` with `bypassKeywords: false`).
  - `syncRules`: Governs which studies are approved for WAN upload to VPS/S3 (default: `MR` with configured clinical description keywords).
- **Keyword Filtering Control**:
  - Clinical keywords (e.g. spine, cervical, dorsal, lumbar, etc.) ensure only prioritized diagnostic exams are retrieved without manual intervention.

---

## 4. DIMSE Association & PACS Port Protection
- **Association Pool Protection**: Hospital PACS association pools are restricted (often 2–5 concurrent threads).
- **Serialised C-GET**:
  - The edge node serialises C-FIND and C-GET operations with polite pacing between studies (5s delay) to release PACS threads and prevent port exhaustion (`ECONNREFUSED`).
  - Before issuing ad-hoc C-FIND/C-ECHO queries, inspect Orthanc jobs (`GET /jobs`) and cancel any hung or non-urgent `DicomGetScu` tasks.

---

## 5. Scanner-Local vs. Central PACS Discrepancies
- In hospital clinical environments, studies may appear in HMIS or on the MRI console before reaching the central PACS server (`HMIS_PACS`):
  - **Auto-push stalls**: If the MRI scanner technician did not send the completed study to `192.168.1.100`, or sent it only to the 3D workstation (Vitrea at `192.168.0.151`), central PACS C-FIND will return 0 results.
  - **Resolution**:
    1. Technicians can push directly to Orthanc (`172.29.40.103:11115` AET `RADIANT`).
    2. Radiologists can export cases from Vitrea/RadiAnt and import directly via the Rad Suite Workstation Import UI (`/workspace`).

---

## 6. Structured Daily Logging & 3-Day Retention Invariant
- **Rule**: Edge daemons (`clinic-agent.js`, `clinic-watchdog.js`, `pacs-worker.js`, `uploader-worker.js`) MUST use structured daily rolling logs managed by `clinic-logger.js`.
- **Retention Invariant**:
  - Keep strictly **2 to 3 days of logs** (`clinic-node-YYYY-MM-DD.log`). Files older than 72 hours (3 days) are automatically deleted on startup and every 60 minutes.
  - Runaway legacy static service logs (`agent.err.log`, `watchdog.err.log`, `orthanc.err.log`) exceeding 5 MB are automatically truncated to preserve a maximum 1 MB tail to protect disk space.
- **Remote Diagnostics**:
  - Radiologists and remote agents can query recent edge logs via reverse heartbeat (`action: 'get-logs'` with optional `{ lines, level, service }`) or trigger retention maintenance (`action: 'prune-logs'`) directly from the Web Workstation (`/clinic-node` -> System Health / Tools).

---

## 7. Zero-Config Auto-Registration & Pre-Install Process Reaper
- **Pre-Install Process Reaper (`install-sandbox.ps1`)**:
  - Before writing or copying any file to `C:\MedicalSandbox`, the installer terminates existing running services (`RadSuiteEdgeAgent`, `RadSuiteWatchdog`, `Orthanc`) and forcefully kills any running `node.exe` or `Orthanc.exe` processes rooted in `C:\MedicalSandbox`.
  - Pauses scheduled task `RadSuite_Immortal_Lifeline` to prevent immediate respawn during deployment.
- **Dynamic Cloud Handshake (`clinic-handshake-client.js`)**:
  - Zero-config auto-registration: upon deployment, client queries `/api/clinic-node/handshake`.
  - First node on a subnet is designated primary harvester (`partition: 0`); subsequent nodes receive `secondary_console` (`partition: 1+`).
  - Hostname collisions automatically allocate unique suffixed identities (e.g. `node-malik-2`).

---

## 8. Remote VPS Decommission, Teardown & Offline Resilience
- **Remote Decommission Invariant**:
  - Cloud administrators can remove and decommission edge nodes via `POST /api/clinic-node` with `action: 'remove-node'`.
  - Decommissioned nodes are persistently recorded in `.clinic_decommissioned.json` and excluded from `getAllClinicNodes()`.
  - Any subsequent heartbeat from a decommissioned node returns `pendingAction: 'uninstall-agent'`.
  - Edge supervisor receives `uninstall-agent`, executes `executeTeardown()` (stops services, deletes lifeline scheduled tasks and firewall rules), kills child workers, and calls `process.exit(0)`.
  - An `isExecutingAction` guard in `clinic-agent.js` prevents infinite recursive loops when acknowledging teardown.
- **Offline Resilience & Auto-Reconnection Invariant**:
  - Network errors (`ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`) during handshake or heartbeat are caught silently without unhandled rejections or process crashes.
  - Heartbeat retries continuously on a 5–15s schedule.
  - The moment the cloud VPS or network connectivity returns, the next heartbeat immediately restores the node to `online: true` with zero manual intervention.
- **Authoritative Test Battery**:
  - `src/services/__tests__/clinic-bundle-integrity.test.ts` (11 tests)
  - `src/services/__tests__/clinic-lifecycle-and-resilience.test.ts` (9 tests)
  - `src/services/__tests__/edge-ota-rollback.test.ts` (2 tests)
  - `src/services/__tests__/clinic-node.service.test.ts` (11 tests)
  - `src/services/__tests__/clinic-agent-heartbeat.test.ts` (7 tests)
