# Hospital PACS Stability, Anti-Choking Invariants & Vitrea Ingestion

## 1. Executive Summary & Incident Root Cause

On active clinical days, hospital PACS (`HMIS_PACS` at `192.168.1.100:8040`) occasionally appears "dead" or shows almost no studies saved from the morning scanning shifts. This document details the technical root cause discovered during live forensic telemetry and establishes mandatory system invariants to permanently prevent recurrence.

### The Failure Cascade:
1. **Low Association Capacity on Hospital PACS**: The hospital PACS DICOM SCP daemon operates on a severely constrained thread pool (supporting only 2–5 concurrent DICOM associations).
2. **The Choking Mechanism**: When the Clinic PC edge harvester ran with `bypassKeywords: true`, it initiated continuous DIMSE `C-GET` retrieval of massive contrast studies (e.g., patient `192611001158` MR Abdomen C+ comprising **2,068 slices**).
3. **Port Exhaustion (`ECONNREFUSED`)**: Pulling thousands of slices over a single long-lived DIMSE association completely exhausted the PACS thread pool and disk I/O, causing the PACS SCP daemon to refuse subsequent TCP connections (`connect ECONNREFUSED 192.168.1.100:8040`).
4. **Modality Push Rejection**: When the Siemens Magnetom MRI scanner completed patient exams and initiated automatic DICOM `C-STORE` pushes to `HMIS_PACS`, the connection failed or timed out.
5. **Console Stranding**: Following DICOM standard behavior, the Siemens Syngo scanner stopped transmission and safely buffered the unsent studies inside the scanner console's local disk (**Syngo Patient Browser**). To clinicians on the floor, PACS appeared empty.

---

## 2. Mandatory Anti-Choking Invariants (Permanent Rules)

To protect the clinical hospital PACS from starvation or collapse, all AI agents and developers MUST enforce these invariants across edge agents and harvest schedulers:

### Invariant 1: Daytime Keyword Bypass Strict Prohibition
- **PROHIBITED**: `harvestSchedule.bypassKeywords = true` is **STRICTLY FORBIDDEN** during daytime clinical scanning hours (**08:00 to 17:00**).
- **Mandatory Focused Filtering**: During clinical scanning hours, `harvestSchedule.bypassKeywords` MUST remain `false`. Harvesters MUST strictly filter by modality (`MR`) and targeted clinical keywords:
  ```json
  "keywords": ["spine", "cervical", "dorsal", "thoracic", "lumbar", "lumbosacral", "ls", "lss", "cs", "css", "ds", "dss", "dl"]
  ```
- **Rationale**: Targeted spine studies average 80–180 slices and transfer in 15–30 seconds. They release the PACS association immediately, allowing the scanner console uninterrupted access to push new scans.

### Invariant 2: Maximum Study Slice Threshold Guard
- In `pacs-harvester.js`, any study discovered during daytime scanning with `NumberOfStudyRelatedInstances > 400` MUST NOT be auto-harvested in an unthrottled loop.
- Giant multi-thousand slice contrast studies must either be scheduled for off-peak hours (after 20:00) or requested on-demand via single-accession pull (`fetch-accession`).

### Invariant 3: Rapid Association Teardown & Polite Backoff
- Harvester associations must not remain open indefinitely. Every study retrieval must close its association immediately upon completion.
- If a C-GET query receives an `ECONNREFUSED` or network timeout from `192.168.1.100:8040`, the edge node MUST immediately:
  1. Abort the current in-flight transfer.
  2. Enter a mandatory **60-second cool-down period**.
  3. Probe TCP port availability (`ping-pacs`) before issuing any new DIMSE commands.

---

## 3. Vitrea Workstation Integration (`VITREACONSOLE`)

Analysis of the official Vitrea server backup (`Vitrea_Server_Backup_2026-10-21_14-12-58`) reveals Vitrea's network architecture and establishes how our edge node can leverage it as a secondary or fallback ingestion source.

### Vitrea Server Architecture:
- **Hostname**: `VITREACONSOLE`
- **Network Interface**:
  - Adapter: Intel(R) I210 Gigabit Network Connection (`3C-52-82-70-C4-45`)
  - IPv4 Address: **`192.168.0.151`** (Static, Subnet `255.255.255.0`, Gateway: *None*)
  - Isolated Subnet: Communicates strictly within the local reporting room subnet `192.168.0.0/24`.
- **DICOM Endpoints**:
  - **Storage SCP (Incoming Receiver)**: `VI.Enterprise.Servers.Acceptor` listening on **Port 3002**.
  - **Query / Retrieve SCP**: `VI.VIMS.Services.QRSCP.Service.exe` listening on **Port 3003** with AE Title **`QRSCP`**.
- **Windows File Shares (SMB)**:
  - `E$` shared at `\\192.168.0.151\E$`.
  - Primary patient image stores: `E:\VitreaData\Patients\` and `E:\DICOMReceive\`.

### Secondary Harvest Configuration:
When the Vitrea PC is powered ON in the reporting room and reachable from the Clinic PC (`192.168.0.104`), Orthanc can harvest studies directly:
```json
{
  "DicomModalities": {
    "VITREA": {
      "AET": "QRSCP",
      "Host": "192.168.0.151",
      "Port": 3003,
      "Manufacturer": "ClearCanvas"
    }
  }
}
```
*Note*: Because Vitrea has no default gateway configured, communication MUST originate from an adapter on the same `192.168.0.0/24` subnet (the Clinic PC's `Wireless LAN adapter Wi-Fi` at `192.168.0.104`).

---

## 4. Modality Recovery Protocol (Stranded Scanner Scans)

When hospital PACS has been congested and morning cases are missing from the worklist:
1. **Verify PACS Port Health**: Ensure `ping-pacs` reports `HMIS_PACS REACHABLE` (<10ms).
2. **Scanner Console Re-Send**:
   - Access the **Siemens Magnetom Syngo Console**.
   - Open **Patient Browser** (`Ctrl+B`).
   - Select the affected morning patients or completed exams.
   - Click **Transfer ➔ Send to... ➔ HMIS_PACS**.
3. **Automatic Ingestion**: Because our edge node's strict spine filtering is active, the scans land on `HMIS_PACS` cleanly without collision and are automatically indexed and staged to VPS.
