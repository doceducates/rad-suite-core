# Universal Multi-Device Sync & Real-Time Ingestion Architecture

## 1. Overview
Rad Suite employs an industry-standard, offline-first multi-device database synchronization engine. This allows clinicians to transition seamlessly between workstations, laptops, mobile browsers (PWA), and native apps (iPad/iOS/Android) while keeping clinical cases, draft reports, and PACS ingestion telemetry synchronized with millisecond latency.

```
                  ┌──────────────────────────────────────────────┐
                  │              Master VPS Hub                  │
                  │  - /api/v1/sync/stream (SSE Broadcast)       │
                  │  - /api/v1/sync/cases/pull (?since_seq=N)    │
                  │  - /api/v1/sync/cases/push (Durable Ingest)  │
                  │  - Database: sync_changelog (SQLite/PG)      │
                  └───────┬──────────────────────────────┬───────┘
                          │                              │
             SSE Mutation │ Stream          Delta Pull / │ Outbox Push
                          ▼                              ▼
             ┌─────────────────────────┐   ┌───────────────────────────┐
             │ Client Devices (Laptop, │   │ Clinic Edge Nodes         │
             │ iPad, Mobile App)       │   │ (Hospital PACS Harvester) │
             │ - useUniversalSync hook │   │ - Medical Sandbox SSD     │
             │ - Local IndexedDB/SQLite│   │ - Two-stage S3 Uploader   │
             └─────────────────────────┘   └───────────────────────────┘
```

---

## 2. Invariant Specifications

### 2.1 Durable Changelog (`sync_changelog`)
Every mutating clinical transaction records a monotonic change row with:
- `change_seq`: Auto-incrementing 64-bit integer.
- `table_name`: The modified clinical entity (`cases`, `reports`, `hospital_pacs_studies`).
- `entity_id`: Primary accession or UUID.
- `operation`: `INSERT`, `UPDATE`, or `DELETE`.
- `changed_at`: ISO timestamp.
- `data_summary`: Redacted JSON payload summarizing the mutation.

### 2.2 Server-Sent Events (SSE) Stream
- **Endpoint**: `/api/v1/sync/stream`
- **Transport**: Standard HTTP/2 or HTTP/1.1 SSE `text/event-stream`.
- **Payload Events**:
  - `event: connected`: Immediate handshake with server timestamp and active subscriber count.
  - `event: mutation`: Real-time notification dispatched whenever any client or edge node commits a mutation.
  - `event: ping`: Periodic keep-alive heartbeat every 20 seconds.
- **Client Handling**: The client's `useUniversalSync` hook receives `mutation` events and dispatches custom DOM events (`radsuite:sync-mutation`) to selectively refresh affected React queries without full-page reloads.

### 2.3 Two-Stage PACS Ingestion Pipeline
To provide full clinical transparency, studies ingested from Hospital PACS display a two-stage progress ledger:
1. **Stage 1 (Hospital PACS -> Local Medical Sandbox SSD)**:
   - Edge Harvester triggers DICOM C-GET into local Orthanc (`C:\MedicalSandbox`).
   - Progress bar: Blue (`Copying: X/Y Slices (Z%)`).
   - Badge: `In Medical Sandbox` when fully cached locally.
2. **Stage 2 (Local Medical Sandbox SSD -> Cloud S3 Storage)**:
   - S3 Uploader streams slices matching modality and keyword filters to Ceph S3 (`https://s3.sehatai.org`).
   - Progress bar: Amber/Green (`Uploading: X/Y Slices (Z%)`).
   - Badge: `S3 Synced` when 100% of DICOM instances are verified in cloud storage.

---

## 3. Edge Filtering & Slice-Integrity Guarantees
- **Word-Boundary Keyword Regex**: Edge nodes enforce regex `(^|[^a-z0-9])${kw}([^a-z0-9]|$)` to prevent unintended uploads of non-target studies (e.g. knee or extremity MRIs).
- **Slice-Count Aware Sync Check**: Upload queue verifies `localSlices >= minSlices` before declaring a study complete, preventing premature truncation when PACS delivers instances across multiple bursts.
