# Unified 4-Source PACS & Cloud Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify case search, synchronization, and streaming across 4 storage tiers: (1) Direct Hospital PACS (`HMIS_PACS`), (2) Google Drive Cloud Mirror, (3) S3-Compatible Cloud Storage (AWS S3 / MinIO / R2), and (4) Local Workstation Storage (`E:\Cases`), featuring source-distinct visual badges/icons, fast local caching, and automated regression safeguards.

**Architecture:** A unified storage adapter layer (`StorageSourceAdapter`) aggregates study metadata across all 4 sources into a single normalized DTO (`UnifiedStudyResult`). High-resolution DICOM slices from remote sources (PACS, GDrive, S3) are retrieved on-demand and cached into `E:\Cases\<Accession>_<PatientName>`, enabling zero-latency 60+ FPS WebGL GPU shader rendering in the Zen Workstation.

**Tech Stack:** Next.js 15, TypeScript, Python 3.13 (`pynetdicom`, `pydicom`), Google Drive API v3 (Service Account), AWS S3 SDK (`@aws-sdk/client-s3`), Drizzle ORM, SQLite (`better-sqlite3`), WebGL 2.0 (`R16I`/`LUMINANCE`).

---

## 1. System Deep Dive: How the Current Setup Uses Images

```
 [ Hospital PACS / GDrive / S3 ]
                 │ (C-GET / HTTPS Download)
                 ▼
     [ Local NVMe Disk: E:\Cases ]
                 │
                 ├──► Metadata & Header Parsing (local-cases.service.ts)
                 │    - Extracts PatientName, MRN, Accession, Modality, Date
                 │    - Groups slices into Series (AXIAL / SAGITTAL / CORONAL)
                 │    - Physical slice ordering via IOP & IPP 3D coordinate vectors
                 │
                 ├──► Binary Slice Streaming (/api/cases/slice or Tauri IPC)
                 │    - Serves raw binary application/dicom buffer
                 │
                 ├──► Web Worker Decoupling (dicom-parser.worker.ts)
                 │    - Off-thread extraction of Int16Array pixel data
                 │    - Auto-WW/WC windowing presets calculation
                 │    - Predictive LRU cache (+/- 6 adjacent slices prefetch)
                 │
                 ▼
       [ WebGL GPU Stage: zen-dicom-canvas-stage.tsx ]
         - 16-bit texture upload (R16I) directly into GPU VRAM
         - Fragment Shader windowing: (val - (wc - ww/2)) / ww
         - Real-time 60 FPS pan, zoom, inverted contrast & scout lines
```

---

## 2. 4-Source Unified Storage Architecture

| Source | Identifier | Protocol | Default Storage / Endpoint | Icon / Badge | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Hospital PACS** | `hospital_pacs` | DICOM DIMSE (C-FIND / C-GET) | `10.0.0.100:8040` (`HMIS_PACS`) | 🖥️ `Server` (Blue) | Direct hospital live intake (on Ethernet / HMIS Wi-Fi) |
| **2. Google Drive** | `gdrive` | HTTPS Google Drive v3 REST API | `Clinic_PACS_Backup` Folder ID | 📁 `Cloud` (Sky) | Headless mirror uploaded by Clinic PC |
| **3. S3 Cloud** | `s3` | S3 REST API (SigV4) | AWS S3 / Cloudflare R2 / MinIO Bucket | 🪣 `Database` (Amber) | Remote cloud archive & teleradiology backup |
| **4. Local Archive** | `local_archive` | Native Filesystem (NVMe) | `E:\Cases` | 💾 `HardDrive` (Emerald) | Fast local workstation cache for diagnostic reporting |

---

## 3. Phased Implementation Tasks

### Phase 1: Storage Adapters & Multi-Source Domain Types

#### Task 1.1: Expand Types for Multi-Source Storage
**Files:**
- Modify: `src/types/pacs.ts`
- Test: `src/services/__tests__/pacs-sources.test.ts`

**Step 1: Write the failing test**
```typescript
import { describe, it, expect } from 'vitest';
import type { PacsStudyResult, StorageSourceType } from '@/types/pacs';

describe('Storage Source Types', () => {
  it('supports 4 unified storage source types', () => {
    const sources: StorageSourceType[] = ['hospital_pacs', 'gdrive', 's3', 'local_archive'];
    expect(sources).toHaveLength(4);
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npm test -- src/services/__tests__/pacs-sources.test.ts`

**Step 3: Implement type definitions**
In `src/types/pacs.ts`:
```typescript
export type StorageSourceType = 'hospital_pacs' | 'gdrive' | 's3' | 'local_archive';

export interface StorageSourceConfig {
  source: StorageSourceType;
  enabled: boolean;
  name: string;
  badgeColor: string;
  isOnline: boolean;
}
```

**Step 4: Run test to verify it passes**
Run: `npm test -- src/services/__tests__/pacs-sources.test.ts`

---

#### Task 1.2: Google Drive Case Ingestion Adapter
**Files:**
- Create: `src/services/gdrive-case.service.ts`
- Test: `src/services/__tests__/gdrive-case.test.ts`

**Step 1: Write test for Google Drive study listing & parsing**
Verify that studies synced in Google Drive (folder per study containing `.dcm` files or zip archive) are listed and mapped to `PacsStudyResult` with `source: 'gdrive'`.

**Step 2: Implement Google Drive Adapter**
- Uses Service Account credentials from `C:\MedicalSandbox\config\service-account.json` or environment variables `GDRIVE_SERVICE_ACCOUNT_KEY` and `GDRIVE_FOLDER_ID`.
- Lists study folders inside the designated Google Drive folder.
- Downloads study metadata or downloads DICOM files into `E:\Cases\<Accession>_<PatientName>` upon request.

**Step 3: Verify tests pass**
Run: `npm test -- src/services/__tests__/gdrive-case.test.ts`

---

#### Task 1.3: S3 Storage Ingestion Adapter
**Files:**
- Create: `src/services/s3-case.service.ts`
- Test: `src/services/__tests__/s3-case.test.ts`

**Step 1: Write test for S3 bucket study discovery**
Verify that S3 bucket listing parses prefixes `studies/<accession>/` into `PacsStudyResult` with `source: 's3'`.

**Step 2: Implement S3 Case Service**
- Configurable endpoint (`AWS`, `MinIO`, or `Cloudflare R2`).
- Streams objects on-demand down to `E:\Cases`.

---

### Phase 2: Unified Ingestion, Caching & Deduplication Layer

#### Task 2.1: Multi-Source Case Aggregator
**Files:**
- Create: `src/services/unified-source-aggregator.service.ts`
- Modify: `src/services/pacs.service.ts`
- Test: `src/services/__tests__/unified-source-aggregator.test.ts`

**Architecture:**
- Simultaneously fans out queries across enabled sources:
  1. `local-cases.service` (`E:\Cases`)
  2. `pacs-dimse.service` (`HMIS_PACS` if online)
  3. `gdrive-case.service` (if configured)
  4. `s3-case.service` (if configured)
- Aggregates results into a single unified array.
- Deduplication rule: If an accession exists both in `E:\Cases` (local) and on a remote source (`hospital_pacs`, `gdrive`, or `s3`), mark it as `isDownloaded: true` with `source: 'local_archive'`, while attaching secondary source badges so the user sees all locations where the study exists.

---

### Phase 3: Presentation Layer — Source Badges, Icons & Filters

#### Task 3.1: Source Badge Primitive & Quick Filter Bar
**Files:**
- Create: `src/components/pacs/pacs-source-badge.tsx`
- Modify: `src/components/workstation/pacs-search-item.tsx`
- Modify: `src/components/workstation/pacs-search-modal.tsx`
- Modify: `src/components/pacs/pacs-filter-bar.tsx`

**UI Features:**
- Visual Badges:
  - 🖥️ **Hospital PACS**: Blue badge + `Server` icon
  - 📁 **Google Drive**: Sky badge + `Cloud` icon
  - 🪣 **S3 Cloud**: Amber badge + `Database` icon
  - 💾 **Local Workstation**: Emerald badge + `HardDrive` icon
- Quick Source Pills:
  `[ All Sources ] [ 💾 Local (E:) ] [ 🖥️ Hospital PACS ] [ 📁 Google Drive ] [ 🪣 S3 Cloud ]`
- On-Demand Retrieval UX:
  When opening a case hosted on Google Drive, S3, or PACS that is not yet in `E:\Cases`, show a subtle download progress toast while pulling slices directly to disk, then auto-open the WebGL canvas.

---

## 4. Regression & Setting Safeguards Already Added

| Safeguard Test | Location | Purpose | Status |
| :--- | :--- | :--- | :--- |
| **Modality Tag Invariant** | `src/services/__tests__/pacs-safeguards.test.ts` | Asserts `pacs_bridge.py` uses `ModalitiesInStudy` (`0008,0061`) instead of `Modality` (`0008,0060`) | ✅ Passing |
| **Fast Offline Failover** | `src/services/__tests__/pacs-safeguards.test.ts` | Asserts queries timeout in `< 1000ms` when at home without hanging the UI | ✅ Passing |
| **C-GET Protocol Guard** | `src/services/__tests__/pacs-safeguards.test.ts` | Asserts `retrieveProtocol` defaults to `C-GET` rather than failing C-MOVE | ✅ Passing |
| **Dynamic Gateway Routing** | `src/services/__tests__/pacs-safeguards.test.ts` | Asserts `scripts/fix-pacs-network.ps1` dynamically detects active Ethernet gateway | ✅ Passing |
| **RadiAnt Configuration** | `src/services/__tests__/pacs-safeguards.test.ts` | Verifies `pacs.xml` preserves host settings for `HMIS_PACS` | ✅ Passing |
