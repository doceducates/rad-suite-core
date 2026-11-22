# Offline-First Case Database Synchronization & VPS Replication

This document specifies the offline-first case database synchronization architecture, durable outbox replication, and non-destructive revision conflict resolution between the local Rad Suite workstation and the remote VPS.

---

## 1. Architectural Model & Topology

Rad Suite follows the **Notion/Linear Offline-First Star Topology**:
- **Central VPS**: Canonical central authority and multi-workstation sync hub.
- **Local Workstations & Mobile**: Autonomous offline-first clients. Edits are committed immediately to local SQLite (`radsuite.db`) with zero network latency.
- **DICOM Separation Invariant**: Large image binary files (CT/MRI volumetric scans) reside in Cloud Object Storage (S3 / Wasabi / Orthanc) and are loaded on-demand. Only case metadata, patient demographics, study parameters, reports, and revisions are synchronized through the database engine.

```
┌────────────────────────────────────────────────────────┐
│ LOCAL WORKSTATION (Offline-First)                      │
│                                                        │
│  [Radiologist Workstation / Report Editor]             │
│         │                                              │
│         ▼                                              │
│  [Local Services (report, patient, study)]             │
│         │                                              │
│         ├─► Writes to SQLite tables (< 5ms)            │
│         │   (patients, studies, reports, revisions)    │
│         │                                              │
│         └─► Enqueues into [case_sync_outbox]           │
│             (status: 'pending', action: 'upsert'|'del')│
│                                                        │
│  [useOfflineSync hook / vps-case-sync background job]  │
│         │ (Triggered on 'online' event or interval)    │
│         ▼                                              │
│  [CaseSyncClient Transport Adapter]                    │
└─────────┬──────────────────────────────────────────────┘
          │ Encrypted Outbound HTTPS (TLS 1.3) + Bearer Key
          ▼
┌────────────────────────────────────────────────────────┐
│ REMOTE VPS (Central Server)                            │
│                                                        │
│  POST /api/v1/sync/cases/push                          │
│  GET  /api/v1/sync/cases/pull?since=<timestamp>        │
│         │                                              │
│         ▼                                              │
│  [VPS Sync Controller (Zod Validation & Token Auth)]   │
│         │                                              │
│         ▼                                              │
│  [VPS Case Ingestion Service]                          │
│   • Topological Upsert (Patient -> Study -> Report)    │
│   • Immutable Revision Archival on Conflict            │
│   • Tombstone Propagation for Deletions                │
│   • Tamper-Evident Audit Trail Logging                 │
└────────────────────────────────────────────────────────┘
```

---

## 2. Safety Invariants & Conflict Resolution

1. **Zero Clinical Data Loss Invariant**:
   - In clinical radiology, overwriting a doctor's impression or findings is a patient safety violation.
   - When a report arrives from sync:
     - If the incoming report is newer: the active report is updated, and the prior report state is archived into `report_revisions` with note `[Auto-Archived Before Sync Update]`.
     - If the incoming report is older than the current local report: the incoming draft is **not dropped**; it is saved into `report_revisions` with status `sync_divergent_revision` and note `[Preserved Incoming Sync Draft]`.
   - Clinicians can open the Version History comparison modal in the workstation to view, diff, or restore any revision at any time.
2. **Topological Order Ingestion**:
   - Ingestion enforces foreign key order: `Patients` (by `mr_number`) ➔ `Studies` (by `accession_number`) ➔ `Reports` (by `study_id`) ➔ `Report Revisions`.
3. **Idempotency**:
   - All database updates use parameterized upserts (`INSERT ... ON CONFLICT DO UPDATE`). Replaying sync packets never duplicates records or triggers primary key errors.
4. **Tombstone Sync**:
   - Deleted cases are tracked in `tombstoned_accessions`. Deletions propagate across devices as tombstones so deleted cases never resurrect upon pull.

---

## 3. Data Entities Synced & DICOM Separation Invariant

| Data Entity | Relational Table | Fields Synchronized | Synchronization Destination |
| :--- | :--- | :--- | :--- |
| **Patients** | `patients` | `mr_number`, `full_name`, `age`, `gender`, `dob`, `phone`, `cnic`, `guardian_name`, `clinical_notes`, `allergies`, `updated_at` | Central Relational DB (`patients`) |
| **Studies** | `studies` | `accession_number`, `modality`, `scan_type`, `body_part`, `priority`, `status`, `scheduled_at`, `referring_doctor`, `technologist`, `contrast_used`, `machine_id`, `assigned_radiologist_id`, `claimed_at`, `hmis_status`, `updated_at` | Central Relational DB (`studies`) |
| **DICOM Series Inventory** | `studies.series_json` / metadata | Series UID, series number, description, modality, slice count (~1-2 KB summary) | Central Relational DB |
| **Reports** | `reports` | `findings`, `impression`, `technique`, `comparison`, `recommendation`, `critical_finding`, `status`, `signed_by`, `signed_at`, `pending_reason`, `updated_at` | Central Relational DB (`reports`) |
| **Revisions** | `report_revisions` | Version number, author ID/name/role, status, findings, impression, timestamp, audit notes | Central Relational DB (`report_revisions`) |
| **Deletions** | `tombstoned_accessions` | Accession number, deletion reason, deleted timestamp | Central Relational DB (`tombstoned_accessions`) |
| **PACS Volumetric Slices** | ❌ **EXCLUDED FROM SQL** | Binary `.dcm` image instances (100MB to 5GB volumetric scans) | **Cloud Object Storage (S3 / Ceph / Wasabi)** via Tier 2 pipeline |
| **Voice Dictation Audio** | ❌ **EXCLUDED FROM SQL** | Raw audio `.wav` / `.webm` audio recordings | Local client storage / S3 audio bucket (structured text syncs to DB) |

---

## 4. UI Indicators & User Experience

- **Header Sync Badge (`SyncStatusBadge.tsx`)**:
  - `🟢 Synced`: Up to date with VPS.
  - `🟡 Pending (N)`: N offline edits queued in outbox.
  - `🔵 Syncing...`: Active background transfer.
  - `⚪ Offline`: Disconnected from internet; safely writing to local SQLite vault.
  - `🔴 Sync Alert`: Connection error with 1-click retry.
- **Reactive Background Notification & Auto-Sync**:
  - Automatically triggers via `useOfflineSync` hook when `window.addEventListener('online')` fires or during 30s background idle checks.
  - Displays a non-blocking floating progress card via `notify.progress()`.
- **Settings Dashboard (`CaseSyncSettingsCard.tsx`)**:
  - Located in `/settings?tab=storage`.
  - Real-time latency ping ("Test Connection").
  - Outbox stats inspector (Pending, Synced, Failed).
  - 1-Click "Queue All Cases" button for initial database seeding.

---

## 5. Unified Multi-Tenant Database vs. Separate Physical Databases

A frequent architectural question in clinical systems is whether administrators and clinical users should operate on separate physical databases:

### Why Separate Databases is an Anti-Pattern for Radiology
1. **Breaks Resident-Consultant Collaborative Rounds**: Radiology reporting is inherently collaborative. A PGR resident authors a preliminary findings draft, and a senior consultant or administrator reviews, patches, and approves the impression. If administrators and residents lived in separate databases, morning rounds and approval workflows would require complex cross-database replication or distributed queries.
2. **Emergency Department STAT Worklist Fragmentation**: Emergency trauma CTs and acute stroke protocols require a single, centralized triage queue. Fragmenting cases across separate databases creates severe blind spots in patient triage.
3. **Operational & Migration Overhead**: Running database migrations, daily automated backups, point-in-time recovery, and consistency checks across $N$ disparate databases multiplies failure points.

### The Rad Suite Solution: Seamless Unified Database with Row-Level Scoping
- **Single Source of Truth**: All patients, studies, reports, and revisions reside in unified normalized tables.
- **Ownership & Assignment Scoping**:
  - Studies have explicit assignment keys: `assigned_radiologist_id`, `pgr_author_id`, `signed_by`, and `hospital_id`.
  - **Consultants & PGRs**: View common departmental worklists to claim cases, but see their claimed studies in `/my-cases`. Non-admins are blocked from editing reports claimed by other doctors via `canEditReport()`.
  - **Administrators**: Full departmental oversight, audit access, node telemetry, and reassignment authority within the same unified database.
  - **Private Credentials**: User-private data (encrypted Google OAuth refresh tokens, personal voice macros, private templates) are isolated strictly by `user_id`.

---

## 6. User-Session Authenticated Sync & Scoped Pulling Protocol

Sync endpoints (`/api/v1/sync/cases/*`) support dual-authentication and intelligent scoping to protect bandwidth:

- **Dual Authentication Handshake**:
  - **Clinician Clients**: Authenticate via `Authorization: Bearer <sessionToken>` matching an active user session. Changes in `sync_changelog` and `audit_log` are attributed directly to the logged-in doctor.
  - **Headless Edge Nodes & Services**: Authenticate via `x-api-key` matching `getVpsSyncApiKey()`.
- **Scoped Pull Queries (`/api/v1/sync/cases/pull`)**:
  - `scope=my_cases`: Fetches only studies assigned to or authored by the requesting clinician. Ideal for mobile and tablet handovers.
  - `scope=active_shift` (Default): Synchronizes cases from the active 48-hour clinical shift (today + yesterday) or with status `pending` / `in_progress`.
  - `scope=all`: Full historical database pull. Strictly restricted to system `admin` users; non-admins requesting `all` are automatically scoped down to `active_shift`.
- **Hospital PACS Telemetry Shielding**:
  - The pull endpoint only returns `pacsStudies` (Tier 1 LAN harvest index) if the requesting user has role `admin` or explicit `pacs` storage grant via `rbacService.canAccessStorageSource(user, 'pacs')`. Non-permitted users receive only their authorized cases.

---

## 7. Industry-Standard Multi-Tenant Partitioning & Type-Prefixed ID Architecture

Rad Suite Core adopts a Stripe/Linear-grade identifier and partitioning schema to eliminate UUID ambiguity, support multi-facility hospital consortia, and enable zero-downtime database replication:

### 1. Chronological Type-Prefixed Identifiers (`src/lib/id.ts`)
Entity identifiers follow `<prefix>_<base36_timestamp><entropy>`:
- `tnt_...` — Hospital Tenant (e.g. `tnt_lgh` for Lahore General Hospital)
- `usr_...` — Clinician / System Account (e.g. `usr_admin_mudassir`, `usr_resident_01`)
- `pat_...` — Patient Record
- `std_...` — Diagnostic Imaging Study
- `rep_...` — Clinical Report
- `rev_...` — Report Revision
- `vault_...` — HMIS Draft Vault Snapshot
- `sess_...` — Authenticated Session Token
- `aud_...` — Cryptographic Audit Log Entry

### 2. Multi-Tenant Scoping & Default Hospital Invariant
- **Canonical Tenant Table (`tenants`)**: Contains hospital facility codes, subdomain mappings, and clinical configuration overrides.
- **First-Class Partitioning Key (`tenant_id`)**: Present on `users`, `patients`, `studies`, `reports`, `audit_log`, `hmis_draft_vault`, and `pacs_servers`.
- **Default Hospital Tenant (`tnt_lgh`)**: Pre-seeded with Code `LGH`, Name `Lahore General Hospital`, ensuring 100% backward compatibility for standalone clinics while ready for multi-center deployment.
- **Compound Performance Indexes**: `idx_users_tenant`, `idx_patients_tenant`, `idx_studies_tenant`, `idx_reports_tenant` guarantee sub-millisecond query isolation across hospital departments.

