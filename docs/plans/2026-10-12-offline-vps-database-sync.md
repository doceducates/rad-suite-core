# Offline-First Secure Case Database Synchronization Plan

> **For Rad Suite**: Strict adherence to AGENTS.md (modularity < 250-350 lines, 4-layer architecture, HIPAA audit logging, zero data loss, database backup invariant).

## Goal Description
Enable clinicians to work completely offline on their local workstation SQL database (SQLite `radsuite.db`), creating cases, dictating reports, amending findings, and updating patient records. When the workstation comes online (via Wi-Fi, Ethernet, or mobile tethering), all local changes are securely synchronized to the remote VPS database without data loss, race conditions, or accidental overwrites ("without messing up"), and any remote updates are pulled back to keep both databases in sync.

---

## User Review Required

> [!IMPORTANT]
> **Zero Clinical Data Loss Invariant**: In radiology reporting, overwriting a doctor's findings or impression is unacceptable. Our synchronization engine enforces **Immutable Revision Archival**: if a report was modified on both the VPS and the local workstation while offline, the active report takes the latest timestamp, but the divergent version is automatically preserved in `report_revisions` (`status: 'sync_divergent_revision'`). Clinicians can inspect and restore any previous version at any time from the Version History UI.

> [!WARNING]
> **Database Schema Additions**: We will add `updated_at` columns to `patients` and `studies` (reports already have `updated_at`) and create a new durable table `case_sync_outbox`. Per AGENTS.md Rule 6, a local backup of `radsuite.db`, `radsuite.db-wal`, and `radsuite.db-shm` into `db_backups/` will be created before running any migration.

---

## Open Questions for Clarification

1. **VPS Database Engine**:
   - **Option A (Recommended)**: The VPS runs Rad Suite or Clinic Gateway with an authenticated HTTPS API (`https://<your-vps>/api/v1/sync/cases`). This is firewall-proof and works through hospital networks without opening raw database ports.
   - **Option B (Direct PostgreSQL)**: The VPS runs a standalone PostgreSQL server accessible over SSL/TLS (`POSTGRES_SYNC_URL`).
   *(Our plan implements Option A as primary with native fallback support for Option B)*.
2. **Sync Topology**:
   - **Bidirectional (Two-Way)**: Local changes push to VPS; new cases or updates created on VPS pull down to local workstation.
   - **Active-Passive (Push with Remote Archive)**: Workstation is primary; VPS serves as real-time mirror and backup.
   *(We propose Bidirectional by default so multiple devices or remote consultants stay unified)*.

---

## Synchronization Architecture

```
┌────────────────────────────────────────────────────────┐
│ LOCAL WORKSTATION (Offline-First)                      │
│                                                        │
│  [Radiologist Workstation / Report Editor]             │
│         │                                              │
│         ▼                                              │
│  [Local Domain Services: report, patient, study]       │
│         │                                              │
│         ├─► Writes to SQLite tables (immediate < 5ms)  │
│         │   (patients, studies, reports, revisions)    │
│         │                                              │
│         └─► Enqueues into [case_sync_outbox]           │
│             (status: 'pending', action: 'upsert'|'del')│
│                                                        │
│  [OfflineSyncManager Hook & Background Job Worker]     │
│         │ (Triggered on 'online' event or interval)    │
│         ▼                                              │
│  [CaseSyncClient Transport Adapter]                    │
└─────────┬──────────────────────────────────────────────┘
          │ Encrypted HTTPS (TLS 1.3) + Bearer Sync Token
          ▼ (or direct TLS PostgreSQL pool if configured)
┌────────────────────────────────────────────────────────┐
│ REMOTE VPS (Central Server)                            │
│                                                        │
│  POST /api/v1/sync/cases/push                          │
│  GET  /api/v1/sync/cases/pull?since=<timestamp>        │
│         │                                              │
│         ▼                                              │
│  [VPS Sync Controller (Layer 1)]                       │
│         │ (Zod payload validation + API token auth)    │
│         ▼                                              │
│  [VPS Case Ingestion Service (Layer 2)]                │
│         │ (Transaction, conflict detection, revision) │
│         ▼                                              │
│  [VPS Database (PostgreSQL or SQLite)]                 │
│   • patients                                           │
│   • studies                                            │
│   • reports & report_revisions                         │
│   • tombstoned_accessions                              │
│   • audit_log                                          │
└────────────────────────────────────────────────────────┘
```

---

## Safety & Non-Destructive Conflict Resolution Invariants

1. **Topological Order Ingestion**:
   To satisfy foreign key constraints without locking issues:
   `Patients` (by `mr_number`) ➔ `Studies` (by `accession_number`) ➔ `Reports` (by `study_id`) ➔ `Report Revisions` (by `(report_id, version)`).
2. **Revision-Based Conflict Resolution**:
   - If a report is modified concurrently on local and VPS:
     - Compare `updated_at` timestamps.
     - The later timestamp becomes active in `reports`.
     - The earlier or conflicting payload is automatically archived into `report_revisions` with a note `[Sync Conflict Snapshot]`, guaranteeing **zero loss of written findings or impressions**.
3. **Idempotent Upserts**:
   - Every database write uses `ON CONFLICT (accession_number) DO UPDATE` or `ON CONFLICT (mr_number) DO UPDATE`. Resending a packet ten times yields the exact same clean state without duplicate records.
4. **Tombstone Sync**:
   - Deletions are tracked in `tombstoned_accessions`. When syncing, deletions propagate as tombstones so deleted cases never resurrect upon pull.
5. **Network Resilience & Outbox Drain**:
   - Outbox rows stay `pending` until an HTTP 200 `{ success: true }` confirmation is returned by the VPS.
   - If the network drops mid-sync, items remain safely buffered in SQLite and retry automatically on the next connection pulse with exponential backoff.

---

## Proposed Changes

### Layer 3: Data & Schemas

#### [MODIFY] `src/db/schema/patients.ts`
- Add `updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()` for change delta tracking.

#### [MODIFY] `src/db/schema/studies.ts`
- Add `updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()` for change delta tracking.

#### [NEW] `src/db/schema/case-sync.ts`
- Define `caseSyncOutbox`:
  - `id`: UUID primary key
  - `entityType`: `'case_bundle' | 'patient' | 'study' | 'report' | 'tombstone'`
  - `entityId`: Text (accession number or MRN)
  - `action`: `'upsert' | 'delete'`
  - `payloadJson`: Text (complete bundled case data)
  - `status`: `'pending' | 'syncing' | 'synced' | 'failed' | 'conflict'`
  - `retryCount`: Integer (default 0)
  - `errorMessage`: Text
  - `lastAttemptAt`: Timestamp
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp
  - Composite indexes on `(status, createdAt)` and `(entityType, entityId)`.

#### [MODIFY] `src/db/sqlite-init.ts`
- Add `case_sync_outbox` table initialization.
- Safely add `updated_at` column to `patients` and `studies` if missing via idempotent `ALTER TABLE` checks.

---

### Layer 2: Domain Services

#### [NEW] `src/services/sync/case-sync-types.ts`
- Define TypeScript contracts: `CaseSyncBundle`, `SyncPushPayload`, `SyncPushResult`, `SyncPullResult`, `SyncStatusSummary`.

#### [NEW] `src/services/sync/case-sync-bundle.service.ts`
- `buildCaseBundle(accession: string)`: Assembles full relational bundle (Patient + Study + Report + Revisions + Tombstone status) from local DB.
- `applyCaseBundle(bundle: CaseSyncBundle)`: Ingests bundle into local or VPS database using topological idempotent upserts and non-destructive revision conflict resolution.

#### [NEW] `src/services/sync/case-sync-outbox.service.ts`
- `enqueueCaseSync(accession: string, action: 'upsert' | 'delete')`: Adds or updates pending outbox row.
- `getPendingSyncCount()`: Returns count of pending offline changes.
- `drainSyncOutbox()`: Iterates pending items, sends them via `CaseSyncClient`, and updates outbox status.

#### [NEW] `src/services/sync/case-sync-client.service.ts`
- Dispatches HTTP requests to VPS sync endpoints with bearer authentication, timeout guards, and network health probing.
- Fallback connector to direct PostgreSQL pool if `POSTGRES_SYNC_URL` is set.

#### [MODIFY] `src/services/report.service.ts`
- Call `enqueueCaseSync(accessionNumber, 'upsert')` inside `saveReport()` so any saved report is automatically queued for VPS sync.

#### [MODIFY] `src/services/case-deletion.service.ts`
- Call `enqueueCaseSync(accessionNumber, 'delete')` when a study is removed or tombstoned.

#### [MODIFY] `src/services/background-jobs.service.ts`
- Add `'vps-case-sync'` recurring background watchdog job (runs every 60s to flush pending outbox items).

---

### Layer 1: Transport & API Handlers

#### [NEW] `src/app/api/v1/sync/cases/push/route.ts`
- VPS and local endpoint accepting incoming batches of `CaseSyncBundle[]`.
- Validates payload via Zod `CaseSyncPushSchema`.
- Verifies API token (`VPS_SYNC_API_KEY` or session auth).
- Executes database transaction and returns `{ success: true, processedCount, conflicts }`.

#### [NEW] `src/app/api/v1/sync/cases/pull/route.ts`
- Endpoint accepting `?since=<ISO_TIMESTAMP>`.
- Queries modified cases since timestamp and returns array of bundles.

#### [NEW] `src/app/api/v1/sync/cases/status/route.ts`
- Returns local outbox status, pending count, last sync timestamp, and online connectivity state.
- Supports `POST { action: 'sync-now' }` for immediate manual synchronization.

#### [MODIFY] `src/lib/validation.ts`
- Export `CaseSyncBundleSchema`, `CaseSyncPushSchema`, and `CaseSyncPullSchema`.

#### [MODIFY] `src/lib/config.ts`
- Add `vpsSyncUrl` and `vpsSyncApiKey` environment accessors.

---

### Layer 4: Presentation & UI

#### [NEW] `src/hooks/useOfflineSync.ts`
- React hook subscribing to `window.addEventListener('online')` and `navigator.onLine`.
- Automatically triggers background outbox drain when coming online.
- Displays non-blocking reactive progress via `notify.progress()`: *"Online connection restored. Syncing 3 offline cases to VPS..."*.

#### [NEW] `src/components/sync/SyncStatusBadge.tsx`
- Sleek status pill for the workstation header and worklist:
  - 🟢 **Synced**: Up to date with VPS.
  - 🟡 **Pending (N)**: N offline cases queued for sync.
  - 🔵 **Syncing...**: Active animated transfer in progress.
  - ⚪ **Offline**: No network; operating safely in local SQLite vault.
  - 🔴 **Sync Alert**: Error banner with 1-click retry.
- Includes 1-click manual "Sync Now" button.

#### [MODIFY] `src/components/workstation/stitch-header.tsx`
- Mount `<SyncStatusBadge />` next to search/actions in the workstation header.

#### [NEW] `src/components/settings/CaseSyncSettingsCard.tsx`
- Added to `/settings?tab=storage`:
  - VPS Connection URL & API Key input fields.
  - "Test VPS Connection" button with real-time latency ping.
  - Outbox inspector (Pending, Failed, Synced count with 1-click "Clear Stale" or "Force Full Resync").

---

## Verification Plan

### Automated Tests
1. **Unit & Integration Tests**:
   - `src/services/__tests__/case-sync-bundle.test.ts`:
     - Test bundle extraction from database.
     - Test bundle ingestion with idempotent upserts.
     - Test non-destructive conflict handling: ensure conflicting drafts are safely preserved in `report_revisions`.
     - Test tombstone deletion propagation.
   - `src/services/__tests__/case-sync-outbox.test.ts`:
     - Test queuing when offline.
     - Test retry counting and error capture.
     - Test outbox drain upon successful push.
2. **Execute Test Suite**:
   ```powershell
   npx vitest run src/services/__tests__/case-sync-bundle.test.ts src/services/__tests__/case-sync-outbox.test.ts
   ```

### Manual Verification
1. **Offline Simulation**:
   - Turn off Wi-Fi or disconnect network adapter (or use Chrome DevTools Offline mode).
   - Create a manual case or edit a report in Rad Suite.
   - Verify report saves immediately (< 10ms) to local SQLite.
   - Verify UI header displays **"🟡 Pending (1 case)"**.
2. **Online Reconnection**:
   - Re-enable network adapter.
   - Verify `useOfflineSync` detects online event.
   - Verify floating card notifies *"Syncing 1 case to VPS..."* and transitions to **"🟢 Synced"**.
   - Verify VPS database contains the identical patient, study, report, and revision.
3. **Conflict Safety Test**:
   - Make an edit on VPS and a different edit locally while offline.
   - Reconnect.
   - Verify neither edit is destroyed; both exist in version history (`report_revisions`).
