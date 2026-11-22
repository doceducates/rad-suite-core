# Pluggable Multi-Destination Report Sync Engine & Durable Outbox

This document specifies the universal pluggable sync provider architecture, durable outbox replication, and multi-database destination routing.

---

## 1. Architectural Strategy & Provider Pattern
Reports are synchronized using a modular Provider Pattern (`IReportSyncProvider`), decoupling the clinical editor from network transport:
- **`IReportSyncProvider` Interface (`src/types/sync-provider.ts`)**:
  - `isEnabled()`: Evaluates local or environment credentials dynamically.
  - `testConnection()`: Non-blocking latency and connectivity probe.
  - `pushReport(payload)`: Transmits standard clinical report payload to destination.

---

## 2. Canonical Storage Destinations
1. **Local SQLite Vault (`sqlite_vault`)**:
   - Primary workstation storage (`radsuite.db`). Zero-latency local file persistence.
2. **Cloud S3 Report Vault (`s3_archive`)**:
   - Replicates full clinical report JSON and readable text into deterministic cloud taxonomy:
   - `reports/{YYYY}/{MM}/{MOD}/{ACC}/report_{ACC}.json`
3. **Remote PostgreSQL Mirror (`postgres_mirror`)**:
   - Replicates into central hospital or VPS PostgreSQL database (`remote_synced_reports`) using connection pooling and parameterized upsert.
4. **Google Docs & Drive (`google_docs`)**:
   - Formatted clinical export to user's Google Drive with medical typography, header, and footer.

---

## 3. Transactional Outbox Pattern (`report_sync_outbox`)
- Direct synchronous writes to multiple external databases risk freezing the clinician UI if remote networks lag.
- **Solution**: Report save commits to local storage first (<10ms). The dispatcher asynchronously creates durable rows in `report_sync_outbox` with status `pending`, executes provider transfers concurrently, and updates status to `synced` or `failed` with error diagnostics.
- Tamper-evident audit trail records every multi-destination dispatch via `REPORT_MULTI_SYNC`.

---

## 4. Workstation Control & Settings
- Route `GET|POST /api/report-sync` allows remote status probes and on-demand resynchronization.
- `ReportSyncProvidersCard` in `/settings?tab=storage` surfaces real-time connection status and 1-click diagnostic latency probes for all registered providers.
