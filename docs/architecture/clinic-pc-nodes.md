# Clinic PC Node Remote Ingestion, Selective S3 Sync & OTA Edge Management

This document specifies the Clinic PC Node architecture, edge agent daemons, reverse-command heartbeat tunnels, Windows Session 0 service isolation, and automated OTA updates.

---

## 1. Selective Edge Ingestion Filter Engine
Clinic edge agents evaluate standard DICOM metadata (`(0008,0060) Modality`, `(0008,1030) StudyDescription`) against configurable allowlists (`allowedModalities: ['MR']`, `descriptionKeywords: ['brain', 'spine', 'ls spine', 'lumbar', 'cervical']`) before S3 dispatch. Saves clinic WAN bandwidth and cloud object storage by pruning non-target scans (e.g., standard X-rays or ultrasounds) at the edge.

---

## 2. Outbound Reverse-Command Tunnel
Clinic edge operates behind NAT/firewalls without inbound port forwards via persistent outbound polling (`POST /api/clinic-node/heartbeat` every 10s). Supports remote administrative actions dispatched from Rad Suite:
- `exec`: Remote shell/PowerShell command execution reporting stdout, stderr, and exit code back in the heartbeat payload.
- `update-script`: Over-The-Air (OTA) agent code self-update from `GET /api/clinic-node/agent-script` with pre-flight syntax validation and service auto-restart.
- `test-s3`: Edge-to-S3 round-trip connectivity probe verifying SigV4 PUT permissions against `https://s3.sehatai.org/radiology`.
- `set-sync-rules`: Dynamic edge filter synchronization persisted in `agent-config.json`.
- **Operational Execution Protocol**: For reliable Session 0 execution, Base64 PowerShell loaders, multi-node addressing, and DIMSE concurrency guidelines, refer to [`docs/architecture/edge-node-remote-commands.md`](edge-node-remote-commands.md).

---

## 3. Native AWS SigV4 Edge Uploader & Multi-Target S3 Redundancy
The edge daemon implements standalone cryptographic HMAC-SHA256 SigV4 request signing without external AWS CLI or Python dependencies, uploading to path-style S3 buckets using fixed `Content-Length` and `User-Agent: RadSuite-ClinicEdge/1.0`.
- **Automatic Multi-Target Failover**: If the primary S3 endpoint fails after exponential backoff retries (e.g., WAN outage, DNS failure, 5xx), the uploader automatically falls back to secondary `backupS3` endpoints (e.g. Wasabi, Backblaze B2, AWS S3, or MinIO).
- **Dual-Mirroring (Active Dual-Write)**: Setting `"mirrorS3": true` writes incoming DICOM slices simultaneously to both Primary S3 and Backup S3 storage for geographic redundancy.
- **Local Safe-Haven Guarantee**: If all internet/S3 targets are offline, all DICOM slices remain losslessly preserved in local Orthanc storage (`Orthanc/Storage`) until connectivity is restored.


---

## 4. Interactive Setup Wizard, Remote Terminal & Settings UI
Dedicated UI components in `/settings` provide end-to-end administration:
- **`ClinicSetupGuideCard` & `ClinicDiagnosticProbes`**: Interactive 4-step physical deployment guide (1-click bundle download, dual-NIC air-gap wiring, Session 0 service install, and live 6-point pre-flight diagnostics engine).
- **`ClinicRemoteTerminalCard` & `ClinicS3SyncCard`**: Real-time terminal output, preset diagnostics (`sc.exe query Orthanc`, `tasklist`, `netstat`), modality selection chips, keyword tag management, and 1-click OTA update triggers.

---

## 5. Zero-Dependency 1-Click Deployment Bundle (`GET /api/clinic-node/bundle`)
Automatically packages `install.bat`, `uninstall.bat`, `install-sandbox.ps1`, `clinic-agent.js`, `agent-config.json`, `orthanc.json`, `orthanc_sync.lua`, `Orthanc.exe`, and `README-SETUP.txt` into `clinic-node-package.zip`. The installer automatically bootstraps standalone portable `node.exe` and `nssm.exe` into `C:\MedicalSandbox\bin\`, requiring zero manual installations of Node.js, Python, or Git on the clinic PC.

---

## 6. Invisible Session 0 Isolation & Auto-Reboot Survival
- `RadSuiteEdgeAgent` and `Orthanc` register as native Windows Services (`SERVICE_AUTO_START`).
- Runs strictly in Windows Session 0 with zero popups, zero CMD windows, and zero system tray interruptions for clinicians sharing the PC.
- Windows Service Recovery (`sc failure ... actions= restart/5000`) guarantees auto-restart on crash or power failure.

---

## 7. Multi-Sequence S3 Taxonomy & Remote Diagnostic Viewing
- `orthanc_sync.lua` extracts `SeriesNumber`, `SeriesDescription`, and `InstanceNumber` on every intercepted slice.
- S3 taxonomy organizes sequences deterministically: `dicom/{YYYY}/{MM}/{MOD}/{ACC}_{PAT}_{UID}/series-{NUM}_{DESC}/{SOP}.dcm`. Prevents sequence cross-contamination.
- **Rad Suite Web Viewer (`ZenWorkstation`)**: Dynamically indexes sequences via `s3-retrieval.service.ts` (`getS3StudySeries`), rendering individual sequence tabs (Axial T1/T2, Sagittal, Coronal, DWI) in the filmstrip with slice counters. Slices stream on demand via `GET /api/cases/slice` with server-side LRU caching in `storage/cache/s3/` at 60 FPS.
- **Desktop RadiAnt Viewer**: Direct 1-click action triggers `GET /api/cases/[accession]/download-dicom`, packaging the full S3 DICOM series into a streamed `.zip` archive that Windows immediately opens in RadiAnt.

---

## 8. Live In-Flight Upload Status & Queue Tracking
- Standalone `upload-queue.js` edge module tracks `activeUpload` (current study, series, completed/total slices, and percentage) and `uploadQueue` (studies waiting in queue).
- Telemetry dispatched every 10s via `POST /api/clinic-node/heartbeat` and displayed in `ClinicTrackerCard` in `/settings` with an animated pulse progress banner and pending queue list.

---

## 9. Remote Scheduling, Pause Control & Lossless Storage Compression
- **1-Click Remote Pause/Resume**: Administrators can halt cloud S3 uploads immediately via `pause-sync` reverse command during peak clinic hours to preserve WAN bandwidth, resuming with `resume-sync`. Slices remain stored safely in local Orthanc storage.
- **Configurable Upload Windows**: `syncSchedule` in `agent-config.json` restricts automated cloud synchronization to configured off-peak hours (e.g., 20:00 to 08:00 overnight) and supports disabling weekend transfers.
- **Lossless Disk Compression**: Orthanc configured with `StorageCompression: true` and `DeflatedTransferSyntaxAccepted: true` to compress DICOM slices losslessly with zlib, reducing local footprint by 50–60%.

---

## 10. Pre-Flight Edge Diagnostics & Direct Edge Viewport Streaming
- **1-Click Pre-Flight Diagnostics**: `run-diagnostics` action executes socket and HTTP probes testing:
  1. Orthanc REST API (`http://127.0.0.1:18042/system`) latency and version.
  2. Orthanc DICOM SCP listening port (`11115`, isolated from RadiAnt's default `11112` listener).
  3. AWS SigV4 S3 write access probe.
  4. Hospital PACS TCP socket connectivity (`10.0.0.100:8040`).
  5. Disk free capacity and warning thresholds.
- **Direct Edge Viewport Streaming**: When studies are freshly acquired on the clinic edge node and not yet replicated to S3, `edge-streaming.service.ts` connects directly to the edge Orthanc instance, streaming slice buffers in ~7ms with zero radiologist wait time.

---

## 11. Production VPS Topology & Edge Connection Reference
- **Public Workstation Endpoint**: `https://radiology.sehatai.org` (Nginx SSL reverse proxy terminating on internal port `4125`).
- **aaPanel Node Manager Topology**:
  - **`radiology`** (Rad Suite): Runs Next.js workstation on internal port `4125`.
  - **`clinic-gateway`** (Standalone Microservice): Runs edge heartbeat broker and SQLite replication ledger on internal port `4130`. When `CLINIC_GATEWAY_URL=http://127.0.0.1:4130` is configured in Rad Suite, incoming edge heartbeats are transparently pass-through proxied to `clinic-gateway` with zero edge reconfiguration and zero downtime. Detailed in [`docs/architecture/clinic-gateway.md`](clinic-gateway.md).
  - Run User: `www` / `root`.
  - Database: Native embedded SQLite with WAL mode at `/www/wwwroot/radiology.sehatai.org/radsuite.db`.
- **Edge Node Outbound Connection**:
  - In `agent-config.json` on the clinic PC:
    ```json
    {
      "nodeId": "clinic-node-01",
      "radSuiteUrl": "https://radiology.sehatai.org",
      "apiKey": "clinic-secret-token",
      "heartbeatIntervalMs": 10000
    }
    ```
  - Communication is 100% outbound HTTPS over port `443`. Requires zero static IP, zero port-forwarding, and zero changes to clinic routers.
- **Punjab HMIS Datacenter Geo-Fence Finding**:
  - The Punjab Health Department portal (`hmis.punjab.gov.pk`) drops packets from foreign datacenter IPs (e.g. European VPS IPs).
  - Consequently, HMIS draft synchronization should be executed via:
    1. The Rad Suite Chrome Extension in the clinician's domestic Pakistani browser, OR
    2. Routed via the on-premise Clinic PC Node forwarder in Pakistan.

---

## 12. Directory Customization, Relocation & Multi-Node Federation
- **Installation Directory**:
  - Default target is `C:\MedicalSandbox`.
  - Can be deployed to any drive/directory (e.g., secondary large HDDs `D:\MedicalSandbox` or `E:\ClinicNode`) by passing the target path to `install.bat <Path>` (e.g., `install.bat D:\MedicalSandbox`).
- **Relocating / Moving Folders**:
  - Because Windows Services register absolute binary paths in the system registry, moving the directory requires a 20-second clean cycle:
    1. Run `uninstall.bat` as Administrator in the current location.
    2. Move the directory in Windows Explorer.
    3. Run `install.bat` as Administrator in the new location.
  - All existing local Orthanc SQLite indices and DICOM storage files remain preserved.
- **Multi-Node Federation & Centralized Switcher UI**:
  - Multiple Clinic PC nodes can connect to the same Rad Suite workstation simultaneously.
  - Each node is assigned a unique `nodeId` in `agent-config.json` (e.g. `clinic-mri-hospital-a`, `clinic-ct-hospital-a`).
  - **`ClinicNodeSwitcherBar`**: Dedicated multi-node toolbar in `/settings?tab=clinic-node` displaying interactive node cards with live online/offline heartbeat status, ping timestamps, modality badges, and storage metrics.
  - **`ClinicAddNodeModal`**: 1-click wizard to register new clinic nodes, configure target modalities (`MR`, `CT`, `CR`, `US`), and instantly generate/download custom pre-configured `clinic-node-[nodeId].zip` installer packages.
  - **Targeted Action Dispatch**: All administrative actions (`pause-sync`, `harvest-pacs`, `set-schedule`, `run-diagnostics`, `exec`, `remove-node`) route strictly to the currently selected active node controller.

---

## 13. Cloud-to-Localhost Relay Bridge & Hospital PACS Probe
- **Transparent Localhost Development Relay (`src/services/clinic-relay.service.ts`)**:
  - When running Rad Suite locally (`npm run dev` on `http://localhost:3780`) and the local in-memory node store reports `online: false`, `getClinicNodeStatusWithRelay()` automatically polls the production VPS (`config.clinicRelayUrl`, default `https://radiology.sehatai.org`) via `GET /api/clinic-node/heartbeat` (or fallback `/api/clinic-node`).
  - Remote actions (`dispatchClinicAction`) dispatched from `localhost` automatically forward through `PUT /api/clinic-node/heartbeat` (or `POST /api/clinic-node`) to the production VPS, which queues them into `pendingAction` for the remote Clinic PC.
  - Relayed nodes display a **`☁️ Relayed via radiology.sehatai.org`** badge in `ClinicNodeSwitcherBar`.
- **Real-Time Hospital PACS Reachability & LGH MRI Taxonomy**:
  - `clinic-agent.js` probes Hospital PACS (`10.0.0.100:8040`) via `probeTcp` on every heartbeat (`pacsStatus`) and executes `runPreFlightDiagnostics` automatically on service startup.
  - `pacs-harvester.js` includes explicit DICOM C-FIND Return Keys (`PatientName: ''`, `StudyDescription: ''`, `StudyInstanceUID: ''`) and matches Lahore General Hospital (LGH) Canon Orian MRI abbreviations (`LS`, `CS`, `DS`, `DL`, `LSPINE`, `CSPINE`, `BRAIN`).
  - `syncLocalOrthancStudies()` automatically backfills any studies cached in local Orthanc (`127.0.0.1:18042`) into S3 (`https://s3.sehatai.org/rad-suite`).

---

## 14. 3-Layer Immortal Connection & Self-Healing Watchdog Architecture
To guarantee that the remote Clinic PC connection never drops permanently during OTA updates, crashes, or service restarts, the edge runtime enforces a 3-layer self-healing architecture:
1. **Zero-Downtime In-Memory Hot-Reload (`clinic-agent.js` & `admin-actions.js`)**:
   - `clinic-agent.js` wraps all runtime loops in `process.on('uncaughtException')` and `process.on('unhandledRejection')` crash shields and clears `require.cache` dynamically when invoking `./pacs-harvester` and `./admin-actions`.
   - `update-script` downloads updates to `<file>.tmp`, validates syntax via `"node.exe" --check "<file>.tmp"`, creates a `<file>.bak` rollback copy, atomically renames `<file>.tmp` to `<file>`, and purges `require.cache` **without ever calling `process.exit(0)` or stopping `RadSuiteEdgeAgent`**.
2. **Standalone `RadSuiteWatchdog` Windows Service (`clinic-watchdog.js`)**:
   - Runs as a separate, frozen NSSM Windows service (`RadSuiteWatchdog`) independent of `RadSuiteEdgeAgent`.
   - Every 15 seconds, inspects `sc.exe query RadSuiteEdgeAgent` and `sc.exe query Orthanc`.
   - Before starting a stopped `RadSuiteEdgeAgent`, validates `clinic-agent.js` with `node.exe --check`; if corrupted, automatically restores `clinic-agent.js.bak` before starting the service.
   - If `RadSuiteEdgeAgent` is ever down, `RadSuiteWatchdog` dispatches emergency lifeline heartbeats to `POST /api/clinic-node/heartbeat` and executes remote `exec:` recovery commands directly.
3. **OS-Level Windows Task Scheduler Lifeline (`RadSuite_Immortal_Lifeline`)**:
   - Registered as a native `SYSTEM` scheduled task executing every 1 minute (`schtasks /Create /SC MINUTE /MO 1 /RU SYSTEM /TN "RadSuite_Immortal_Lifeline"`).
   - Runs `cmd.exe /c sc start RadSuiteWatchdog & sc start RadSuiteEdgeAgent & sc start Orthanc`, ensuring OS-level resurrection even if all Node.js processes are terminated.

---

## 15. Edge Inventory Catalog & Hands-Free Auto-OTA Synchronizer
- **Edge Inventory Catalog (`local-inventory.js`)**:
  - Maintains persistent two-stage edge state machine (`on_pacs` $\rightarrow$ `downloading` $\rightarrow$ `in_sandbox` $\rightarrow$ `uploading` $\rightarrow$ `synced` $\rightarrow$ `failed`) in `local-inventory.json` using composite keys `${ACCESSION}_${MODALITY}` (with automatic legacy migration).
  - Tracks both **Stage 1 (`PACS -> Medical Sandbox`)** (`activeDownload`, `downloadQueue`, `downloadedSlices / totalPacsSlices`) and **Stage 2 (`Medical Sandbox -> Cloud S3`)** (`activeUpload`, `uploadQueue`, `uploadedSlices / totalPacsSlices`).
  - Safe-Harbor Retention: Only studies marked `synced` with validated S3 presence are eligible for disk pruning.
- **Hands-Free Auto-OTA Synchronization (`clinic-agent.js` & `admin-actions.js`)**:
  - Workstation endpoint `POST /api/clinic-node/heartbeat` always returns the live `scriptVersion` (composite SHA-256 hash of all edge modules) even when pass-through proxying to Clinic Gateway.
  - When the hash diverges or `update-script` is triggered, updates follow a staged, self-healing pipeline:
    1. **Pre-Snapshot**: All current active script files are copied to `snapshots/last_known_good/`.
    2. **Staged Download**: Incoming code is saved to `tmp_<filename>`.
    3. **Pre-Flight Syntax Validation**: `node --check "tmp_<filename>"` validates syntax before touching production files.
    4. **Atomic Swap & In-Memory Purge**: File is renamed and `require.cache` cleared dynamically.
    5. **Autonomous Watchdog Module Integrity & Rollback**: `RadSuiteWatchdog` verifies on every 15s tick that all companion modules exist on disk and pass `require()` load checks; if any script is missing or corrupted, it automatically triggers an atomic bundle self-heal from `/api/clinic-node/agent-script`.

---

## 16. Single-Date × Single-Modality PACS Polling, Double-Tap Warm-Up & Anti-Lockout Invariants
- **Single-Date × Single-Modality Sequential C-FIND**:
  - Hospital PACS (`HMIS_PACS` `10.0.0.100:8040`) times out or returns `0` results when sent multi-day ranges (`YYYYMMDD-YYYYMMDD`) or combined modality wildcards (`MR\CT`).
  - `pacs-harvester.js` decomposes calendar scopes (`today`, `yesterday`, `last_2_days`, `custom`) into discrete `YYYYMMDD` dates and queries `1 date × 1 modality` sequentially with a 500ms pause between queries.
- **RadiAnt Double-Tap Warm-Up Verification (`queryPacsStudiesWithRetry`)**:
  - When the Hospital PACS SQL index is cold, the first `C-FIND` query often returns only `1` study while a second immediate query returns the full study list.
  - `queryPacsStudiesWithRetry()` compares Pass 1 against `getKnownCountForDateModality(date, modality)`. Whenever Pass 1 returns `<= 2` studies or fewer than previously known studies for that date+modality, it waits `1500ms`, executes a second `C-FIND`, and returns the deduplicated union of both passes.
- **Permanent Anti-Lockout Guarantee**:
  - `clinic-agent.js` executes `exec:` commands inline using zero external dependencies (`child_process.exec`) **before** loading `admin-actions.js`, and automatically runs `selfHealScripts()` if `admin-actions.js` ever throws a `MODULE_NOT_FOUND` or syntax error.

---

## 17. PACS DICOM Metadata Extraction & Acquisition Timestamp Fidelity
- **Demographics Extraction (`PatientAge`, `PatientSex`, `PatientBirthDate`)**:
  - `orthanc_sync.lua`, `pacs-harvester.js`, and `storage-actions.js` extract DICOM tags `(0010,1010)` (`PatientAge`), `(0010,0040)` (`PatientSex`), and `(0010,0030)` (`PatientBirthDate`) during PACS harvesting and Orthanc instance ingestion.
  - Patient investigations confirmed HMIS portal defaults `age: 35` for unentered clerical records, whereas PACS tags contain true patient age (e.g. `040Y` = 40 years). The edge node surfaces verified DICOM demographics in `telemetry.localStudies` and `telemetry.syncedStudies`.
- **Scanner Acquisition Timestamps & Series Sequence Fidelity**:
  - Radiologists require true scanner acquisition time `(0008,0030)` rather than administrative HMIS clerical order placement time.
  - `orthanc_sync.lua` intercepts series-level metadata (`SeriesTime` `(0008,0031)`, `AcquisitionTime` `(0008,0032)`, `SeriesDescription` `(0008,103e)`), compiling a deterministic `seriesList` attached to study inventory.
  - Rad Suite indexers (`hospital-pacs-index.service.ts` and `heartbeat/route.ts`) persist this metadata into `rawTagsJson` and ensure `studies.scheduledAt` reflects true scan time.

---

## 18. LAN Multi-Node Cooperative Load Sharing, Watchdog Stall Auto-Recovery & 4-Tab UI
- **LAN Multi-Node Cooperative Load Sharing (`clinic-lease.service.ts`)**:
  - When multiple Clinic PCs run on the same hospital LAN, each node claims in-flight studies in the central distributed lease registry (`POST /api/clinic-node/heartbeat`).
  - Active nodes receive `inFlightStudies` claimed by peers; `pacs-harvester.js` and `upload-queue.js` dynamically skip studies claimed by peer nodes, eliminating duplicate downloads and redundant uploads.
  - **Autonomous Work-Stealing**: If a node goes offline or its lease TTL expires (default 5 min), peer nodes automatically reclaim and complete the pending studies.
- **Autonomous Upload Pipeline Stall Watchdog & PC Auto-Reboot (`clinic-watchdog.js`)**:
  - `upload-queue.js` emits live slice heartbeat timestamps to `pipeline-heartbeat.json`.
  - The immortal `RadSuiteWatchdog` service inspects pipeline heartbeat every 15s. If pending studies exist but zero transfer progress occurs:
    - **Soft Service Restart (20 min)**: Stops and restarts `Orthanc` and `RadSuiteEdgeAgent` Windows services.
    - **Full PC Auto-Reboot (40 min)**: Sends emergency lifeline heartbeat to Rad Suite and initiates Windows restart (`shutdown.exe /r /t 60 /f`).
    - **Triple Safety Guardrails**: Auto-reboot is strictly blocked if OS uptime < 30 min (anti boot-loop), if clinic WAN/Internet is unreachable, or if 2 reboots have already occurred in the last 24 hours.
- **Decluttered 4-Tab Workstation Management Console**:
  - Replaced monolithic 10-card vertical stack with clean 4-tabbed navigation in `/settings`:
    1. **Live Monitor** (`ClinicNodeOverviewTab`): Power status, disk health, active cluster load sharing badge, watchdog health badge, and real-time slice transfer progress tracker.
    2. **Node Settings** (`ClinicNodeConfigTab`): Filterable policy panel for Cluster Load Sharing, Stall Watchdog Auto-Reboot, PACS Harvester Schedules, S3 Cloud Sync Rules, and Operational Hours.
    3. **Local Studies** (`ClinicResidentStudiesCard`): Resident Orthanc DICOM sandbox studies explorer with selective purge and sync tracking.
    4. **Diagnostic Tools** (`ClinicNodeToolsTab`): Hospital PACS workspace shortcut, remote command terminal, live TCP/S3 diagnostic probes, and interactive physical setup wizard.

---

## 19. PACS Smart Search, Multi-Tap Warm-Up Routine & Medical Sandbox Pre-Fetching
- **Sluggish PACS & Multi-Tap C-FIND Warm-Up Routine**:
  - Hospital PACS (`HMIS_PACS` at `10.0.0.100:8040`) drops packets or returns truncated study lists when cold.
  - `pacs-harvester.js` executes a 3-tap warm-up query sequence:
    1. **Pass 1 (Wake-Up)**: Sends initial C-FIND to activate the PACS database daemon.
    2. **Pass 2 (Capture)**: Executed after 1000ms delay; merges results by `studyUid` or `accessionNumber`.
    3. **Pass 3 (Confirmation)**: If Pass 2 returns more studies than Pass 1 (proving PACS was still streaming or populating on Pass 2), Pass 3 is automatically triggered after 1000ms to ensure 100% list completeness with zero dropped cases.
- **Strict Discrete Modality Enforcement & Empty Modality Prevention**:
  - Hospital PACS fails or crashes when `ModalitiesInStudy` is empty (`""`) or wildcarded (`*`).
  - `resolveDiscreteModality()` ensures all C-FIND queries explicitly specify a discrete modality (defaulting to `MR`, then falling back to `CT`).
- **Punjab HMIS 12-Digit Accession & Partial MRN Parsing**:
  - `parseAccessionDate()` decodes the 12-digit accession structure `[Hospital][YY][MM][Sequence]` (e.g., `192610002999` $\rightarrow$ Year `2026`, Month `10`), enabling targeted monthly date ranges (`20261001-20261031`).
  - `formatPatientIdFilter()` automatically wraps 3-8 digit MR numbers (e.g. `0365` $\rightarrow$ `*0365*`) for wildcard matching.
- **Two-Tier Storage Architecture**:
  - **Tier 1 (PACS $\rightarrow$ Local Medical Sandbox SSD `C:\MedicalSandbox\Orthanc\Storage`)**: Over Gigabit LAN (zero bandwidth cost). Automatically polls every 5 minutes with `scope: 'last_2_days'` (Today + Yesterday) and `bypassKeywords: true` so all hospital cases are resident on local SSD prior to rush hours.
  - **Tier 2 (Medical Sandbox SSD $\rightarrow$ Cloud S3 `s3.sehatai.org/radiology`)**: WAN-sensitive cloud upload filtered by clinical keywords (`ls`, `cs`, `spine`, `brain`, etc.) to conserve bandwidth and cloud storage.
- **Uncluttered PACS Workstation UI**:
  - `PacsSandboxQuickBanner` in `/pacs` provides real-time local sandbox status and a 1-click **"Pre-fetch Today & Yesterday"** action.

---

## 20. Concurrent Upload Pool, Batch Sync & Multi-Environment Sync Engine
- **8-Worker Bounded Concurrent Slice Pool (`pacs-harvester.js`)**:
  - Replaced the sequential slice upload loop with an 8-worker concurrent worker pool (`runWithConcurrency`), pulling slices concurrently and multiplexing S3 HTTP requests.
  - Drops full 350-slice MRI upload times from 120+ seconds down to 15–20 seconds over WAN.
- **Atomic Batch Upload Reverse Command (`batch-upload-s3`)**:
  - `dispatchClinicAction('batch-upload-s3', ..., { accessions: [...] })` passes the entire accession list in a single payload, completely eliminating the previous loop overwrite bug where only the last study was processed.
- **Stale Upload Auto-Recovery Guard (`local-inventory.js`)**:
  - Edge nodes periodically inspect `inMemoryInventory`. Any study remaining in `state: 'uploading'` with no activity for > 5 minutes is automatically recovered back to `in_sandbox` (`s3Status: 'local_only'`).
- **Universal Multi-Environment Data & Settings Synchronizer (`scripts/sync-database.ts`)**:
  - `npm run sync:pull`: Pulls reporting cases, `hospital_pacs_studies`, reporting templates, and configured PACS sources from the central VPS (`radiology.sehatai.org`) into the local development workstation SQLite database.
  - `npm run sync:push`: Pushes local cases, PACS index records, and custom templates back to the central VPS.
- **S3 Self-Healing Integrity Auditor (`hospital-pacs-index.service.ts`)**:
  - `verifyAndHealStudyS3Integrity(accession)` queries real S3 bucket keys via `getS3StudyKeys`. If 0 keys exist in S3, any false `s3Status: 'synced'` flag is automatically healed back to `local_only`, preventing synthetic viewer placeholders from rendering for non-uploaded cases.

---

## 21. 24/7 Always-On Power Policy & Unattended Auto-Power-On Architecture
To guarantee 24/7 unattended clinic node availability and prevent remote edge lockouts caused by power cuts or Windows idling:
1. **Windows Power Policy Enforcement (`system-metrics.js` & `install-sandbox.ps1`)**:
   - Automatically executes `powercfg /change standby-timeout-ac 0`, `powercfg /change hibernate-timeout-ac 0`, and `powercfg -h off`.
   - Disables Network Adapter power saving (`Disable-NetAdapterPowerManagement`) so Ethernet interfaces never sleep.
   - Screen turns off after 15 min (`monitor-timeout-ac 15`) to protect monitor hardware while CPU and pipeline services remain 100% active 24/7.
2. **Motherboard BIOS "Restore AC Power Loss" (Gold Standard for Power Cuts)**:
   - Modern clinic desktops default to staying OFF after an electrical outage. Setting BIOS `Restore on AC Power Loss` (or `AC Recovery`) to **`Power On`** forces the motherboard to boot Windows immediately whenever mains or UPS power returns, without physical button pressing.
3. **Scheduled Daily Hardware Wake (BIOS RTC Alarm)**:
   - Setting BIOS `Power On by RTC Alarm` to `07:00 AM Daily` triggers hardware-level motherboard startup each morning even if staff previously turned off the machine.
4. **Smart Plug Remote Power Lifeline**:
   - Pairing BIOS `Power On` with a standard Wi-Fi smart plug allows remote power cycling (toggling power socket off/on from mobile phone to boot the workstation from anywhere).

---

## 22. Autonomous Wi-Fi Self-Healing & Wireless Power Lock Architecture
Because the clinic edge node relies on wireless networking (`Radiology Reporting Rooms`) to reach the Rad Suite VPS and S3 storage, network drops or accidental toggling can isolate the workstation. The edge node incorporates an autonomous 5-layer self-healing mechanism:
1. **Local Watchdog Execution Privilege**:
   - `RadSuiteWatchdog` runs locally as a Windows Service in Windows Session 0 under `NT AUTHORITY\SYSTEM`. Even when the internet is 100% disconnected and no remote commands can reach the machine, the local watchdog continuously ticks every 15s.
2. **Detection of Settings/Driver Disables**:
   - If WAN connectivity is unreachable (`pingWan` fails for 2 consecutive ticks / 30s), the watchdog triggers `autoRecoverWifi()`.
   - `parseWlanOutput()` analyzes `netsh interface show interface name="Wi-Fi"` and `netsh wlan show interfaces`. If `Administrative state` is `Disabled`, it detects that a clinician or Windows disabled the interface.
3. **Automated Layer-2/3 Adapter Recovery**:
   - Re-enables the network interface: `netsh interface set interface name="Wi-Fi" admin=ENABLED`.
   - Restores device layer via PowerShell fallback: `Get-NetAdapter -Name 'Wi-Fi' | Enable-NetAdapter -Confirm:$false`.
   - Restarts Windows WLAN AutoConfig service: `sc.exe start WlanSvc`.
   - Reconnects to the hospital clinic profile: `netsh wlan connect name="Radiology Reporting Rooms" interface="Wi-Fi"`.
4. **Intel AX211 D3 Sleep Prevention (Maximum Performance Policy)**:
   - High-throughput Wi-Fi 6E cards (such as the clinic PC's Intel AX211) aggressively sleep when idle under Windows default Balanced power scheme.
   - The edge daemon permanently overrides the Windows Wireless Adapter power scheme index to `000` (`Maximum Performance`) on AC power (`powercfg /setacvalueindex SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0`), ensuring Windows never powers down the Wi-Fi PCIe bus.
5. **Real-Time Wi-Fi Telemetry in Diagnostics**:
   - `runPreFlightDiagnostics()` returns real-time `wifi` telemetry (SSID, signal percentage, Rx/Tx link rates, adapter model, and connection state), displaying live wireless health in the clinic node monitoring UI.

---

## 23. Decoupled Dual-Worker Process Architecture (Tier 1 vs Tier 2 Isolation)
To completely prevent network lag or timeouts on the hospital PACS LAN from blocking internet uploads, the edge workstation runs two completely decoupled OS processes supervised by `clinic-agent.js`:
1. **Worker 1 (`pacs-worker.js`) [Tier 1: LAN PACS Harvester]**:
   - Dedicated exclusively to Hospital PACS (`10.0.0.100:8040`) C-FIND queries and C-GET retrieval into `C:\MedicalSandbox\Orthanc`.
   - Runs in an isolated V8 child process PID. Even if Hospital PACS hangs, times out, or the hospital scanner is off, only this process waits.
2. **Worker 2 (`uploader-worker.js`) [Tier 2: WAN Sandbox Uploader & Zipper]**:
   - Dedicated exclusively to scanning local sandbox Orthanc, applying keyword rules, compressing series into ZIPs, and streaming to VPS Hot-Staging (`/api/clinic-node/stage-series-zip`) and S3 cold storage.
   - Zero socket connections to Hospital PACS. Uninterrupted by LAN latency or scanner downtime.
3. **Supervisor Coordinator (`clinic-agent.js`)**:
   - Registered as `RadSuiteEdgeAgent` Windows Service in Session 0.
   - Forks both worker processes, handles auto-restart with backoff, aggregates telemetry for heartbeats, and routes administrative commands via IPC.

---

## 24. Remote Edge Teardown & Agent Uninstall (1-Click UI & Reverse Action)
Administrators can safely stop and decommission clinic edge nodes directly from the Rad Suite workstation UI (`/settings?tab=clinic-node`):
1. **Interactive UI Entry Points**:
   - **`ClinicPowerCard` (Live Monitor Tab)**: Dedicated `Uninstall Agent` action with destructive confirmation modal detailing all services, tasks, and ports affected.
   - **`ClinicRemoteTerminalCard` (Diagnostic Tools Tab)**: Secondary `Uninstall Agent` quick-action button adjacent to the OTA update control.
2. **Deterministic Teardown Sequence**:
   - **Step 1 (Scheduled Task Purge)**: Removes the immortal lifeline task (`schtasks /Delete /TN "RadSuite_Immortal_Lifeline" /F`) to prevent OS-level revival.
   - **Step 2 (Service Removal)**: Halts and deletes `RadSuiteWatchdog`, `RadSuiteEdgeAgent`, and `Orthanc` via NSSM and Service Control Manager (`sc.exe delete`).
   - **Step 3 (Firewall Cleanup)**: Deletes inbound DICOM rule for TCP port 11115 (`netsh advfirewall firewall delete rule name="RadSuite DICOM Edge (11115)"`).
   - **Step 4 (Detached Execution & Telemetry Confirmation)**: The agent responds to the heartbeat with exit code 0 and status confirmation before spawning a detached teardown process with portable `ping 127.0.0.1 -n 3 >nul` sleep (Session 0 compatible) and exiting cleanly.

---

## 25. Universal Package Auto-Discovery & Zero-Collision Node Identity
1. **Universal High-Speed Installer (`/api/clinic-node/bundle`)**:
   - Compresses in <1.2s using `zlib: { level: 1 }` to prevent proxy timeouts.
   - Provides a single standardized package (`clinic-node-package.zip`) with generic template configuration (`"nodeId": "auto"`, `"name": "auto"`).
2. **Dynamic Machine Identity Resolution**:
   - `install-sandbox.ps1` (Step 4c) reads `$env:COMPUTERNAME`, generates a deterministic `node-<hostname>` ID, sets the default display name to the OS hostname, and writes `agent-config.json`.
   - `clinic-agent.js` fallback: If `nodeId` or `name` is `"auto"`, it auto-resolves dynamically from `os.hostname()`.
   - Prevents multiple workstations from colliding as "Primary Workstation" or "clinic-pc-primary".
3. **Two-Way Nickname & Decommissioning Sync**:
   - Clinicians can click the pencil icon in `ClinicNodeSwitcherBar` to set friendly nicknames (e.g. "Main MRI 1.5T").
   - Renaming and decommission (`remove-node`) actions propagate across local stores, VPS relay, and clinic gateway.

---

## 26. 1-Click Master Pause/Resume & Strict Hospital PACS Isolation
1. **1-Click Master Pause / Resume Sync**:
   - Prominently accessible on `ClinicPowerCard`. Instantly pauses or resumes automated PACS harvesting and WAN S3 uploads across all workers without navigating sub-tabs.
   - Displays live amber `Sync Paused` badge when paused.
2. **Hospital PACS Read-Only Invariant Enforcement**:
   - Strict read-only isolation: queries to `192.168.1.100:8040` (`HMIS_PACS`) are strictly DIMSE `C-FIND` and `C-GET`.
   - Command Shield: Inline and admin `exec:` handlers reject any command containing `192.168.1.100` combined with destructive verbs (`del`, `delete`, `rmdir`, `-X DELETE`, `format`, `drop`).
   - Local Sandbox Scoping: Storage purges are strictly restricted to local Orthanc port 18042 (`127.0.0.1`).

---

## 27. Zero-Config Edge Node Auto-Registration & Dynamic Bundle Packaging
1. **Automated Zero-Config Cloud Handshake (`POST /api/clinic-node/handshake`)**:
   - Upon initial installation or first boot, `clinic-agent.js` and `install-sandbox.ps1` execute `clinic-handshake-client.js` with hardware fingerprinting (OS hostname, MAC addresses, LAN IP).
   - The cloud server automatically derives a deterministic `node-<hostname>` ID and checks for physical collisions (appending `-2`, `-3` if different hardware shares an identical computer name).
   - New nodes are automatically provisioned in `.clinic_nodes_registry.json` and appear live in the workstation UI immediately.
2. **Cluster Role Partitioning & Bandwidth Protection**:
   - The first online node is provisioned as `primary` (`isPrimaryHarvester: true`, `partition: 0`).
   - Any subsequent edge nodes on the hospital network automatically receive `secondary_console` (`isPrimaryHarvester: false`, `partition: 1`, `peerCooperation: true`).
   - This prevents multiple workstations from competing for PACS DIMSE C-GET bandwidth or crashing port 8040.
3. **Dynamic Bundle Discovery & Resilient Binary Streaming**:
   - `src/services/clinic-node-manifest.service.ts` dynamically scans `scripts/clinic-host/` using `getClinicHostFiles()`, guaranteeing that all companion scripts (`clinic-logger.js`, `wifi-hopper.js`, `clinic-agent-recovery.js`, etc.) and future scripts are automatically bundled.
   - Dedicated manifest route (`GET /api/clinic-node/manifest`) computes composite SHA256 hashes to drive automated OTA updates.
   - Binary Streaming (`GET /api/clinic-node/agent-script?file=node.exe|Orthanc.exe|nssm.exe`): Serves Windows standalone binaries directly from the VPS, shielding edge installations from hospital firewall blocks on `nodejs.org` or `nssm.cc`.




