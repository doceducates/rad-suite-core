# PACS Smart Search, Triple-Tap Warm-Up & Medical Sandbox Pre-Fetching Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement smart discrete-modality and accession/MRN parsing, reliable multi-tap Hospital PACS warm-up queries with automatic 5-minute pre-fetching of Today + Yesterday scans into the local Medical Sandbox (`C:\MedicalSandbox\Orthanc\Storage`), and an intuitive, uncluttered UI for instant rush-hour reporting.

**Architecture:** 
- **Tier 1 (PACS -> Local Medical Sandbox SSD):** 5-minute background daemon polling Today + Yesterday (`last_2_days`) cases over local Gigabit LAN. Uses a 3-tap warm-up query (Pass 1 wake-up, Pass 2 capture, conditional Pass 3 confirmation if study count increased) to guarantee zero missed studies from sluggish hospital PACS. Pre-caches all scans of configured modalities without keyword blockage so radiologists experience zero retrieval latency.
- **Tier 2 (Medical Sandbox SSD -> Cloud S3):** Retains clinical keyword filtering (`ls`, `cs`, `spine`, `brain`, etc.) and queueing to conserve WAN bandwidth and cloud storage.
- **Query Intelligence:** PACS queries strictly enforce discrete modalities (`MR`, then `CT`), extract date windows from Punjab HMIS 12-digit accession numbers (`YYMM`), and wildcard partial MR numbers (`*0365*`).

**Tech Stack:** Node.js (Edge Clinic Agent), Orthanc DICOM REST API, Next.js 15 App Router, React 19, TypeScript, Drizzle ORM, Tailwind CSS.

---

### Task 1: Multi-Tap PACS Warm-Up & Smart Query Intelligence (`scripts/clinic-host/pacs-harvester.js`)

**Files:**
- Modify: `scripts/clinic-host/pacs-harvester.js`
- Test: `tests/pacs-harvester-smart-query.test.ts`

**Step 1: Write the failing unit tests for query intelligence and multi-tap logic**
Verify:
1. `parseAccessionDate('192610002999')` returns `{ year: '2026', month: '10', datePrefix: '202610' }`.
2. `queryPacsStudies` never issues `ModalitiesInStudy: ""` when modality is 'ALL' or empty; it defaults to 'MR' or iterates discrete modalities.
3. Multi-tap warm-up queries: when Pass 1 returns studies, Pass 2 is executed after a 1000ms delay, and if Pass 2 discovers more studies than Pass 1, Pass 3 is triggered.

**Step 2: Run test to verify it fails**
Run: `npm test tests/pacs-harvester-smart-query.test.ts`

**Step 3: Implement minimal code in `scripts/clinic-host/pacs-harvester.js`**
- Add `parseAccessionDate(accession)` helper.
- Update `queryPacsStudiesWithRetry`:
  - For single accession/MRN: execute Pass 1. If 0 results, wait 1000ms and execute Pass 2. If still 0 and modality was 'MR', try 'CT'.
  - For batch/date discovery: execute Pass 1, sleep 1000ms, execute Pass 2, merge results. If `pass2Count > pass1Count`, sleep 1000ms and execute Pass 3 to ensure no lagging PACS packets are dropped.
- Maintain Rule 1 invariant: file strictly below 350 lines.

**Step 4: Run test to verify it passes**
Run: `npm test tests/pacs-harvester-smart-query.test.ts`

**Step 5: Commit**
```bash
git add scripts/clinic-host/pacs-harvester.js tests/pacs-harvester-smart-query.test.ts
git commit -m "feat(pacs): implement triple-tap pacs warm-up and smart accession parsing"
```

---

### Task 2: Default Harvest Scheduling & Two-Stage Pipeline Configuration (`scripts/clinic-host/clinic-agent.js` & `agent-config.json`)

**Files:**
- Modify: `scripts/clinic-host/clinic-agent.js`
- Modify: `scripts/clinic-host/agent-config.json`

**Step 1: Write tests for schedule reconciliation and default configurations**
Verify:
1. Agent config defaults to `intervalMinutes: 5`, `scope: 'last_2_days'`, `bypassKeywords: true` (download all to sandbox), `modalities: ['MR']`.
2. S3 upload queue still respects `matchesSyncRules` with keyword filters for Tier 2 cloud sync.

**Step 2: Update `agent-config.json` and `clinic-agent.js`**
- Set default harvest schedule to 5 minutes interval, `last_2_days` scope, and `bypassKeywords: true` for Tier 1 sandbox download.
- Keep S3 upload sync rules (`syncRules`) keyword-filtered (`ls`, `cs`, `spine`, `brain`, etc.) to protect cloud storage.
- Update heartbeat payload to report total sandbox resident studies and auto-harvest status clearly.

**Step 3: Run verification tests**
Run: `npm test`

**Step 4: Commit**
```bash
git add scripts/clinic-host/clinic-agent.js scripts/clinic-host/agent-config.json
git commit -m "feat(edge): configure 5-minute pre-fetch of today and yesterday cases to sandbox"
```

---

### Task 3: Transport & Federation Layer Smart Modality Enforcement (`src/services/hospital-pacs-federation.service.ts` & `src/app/api/pacs/hospital-query/route.ts`)

**Files:**
- Modify: `src/services/hospital-pacs-federation.service.ts`
- Modify: `src/app/api/pacs/hospital-query/route.ts`

**Step 1: Write test for federation query decomposition**
Verify:
1. When query requests `modality: 'all'`, the federation service delegates to discrete modality queries (`MR`, then `CT`) instead of sending empty modality to PACS.
2. Inferred date from accession number is passed when searching historical accessions.

**Step 2: Implement minimal changes in federation and route handlers**
- In `hospital-pacs-federation.service.ts`:
  - Ensure `searchPayload.modality` defaults to `'MR'`.
  - If searching accession, pass inferred date and discrete modality.
- In `route.ts`:
  - When user requests live harvest or query, validate and ensure modality is discrete.

**Step 3: Run tests to verify**
Run: `npm test`

**Step 4: Commit**
```bash
git add src/services/hospital-pacs-federation.service.ts src/app/api/pacs/hospital-query/route.ts
git commit -m "feat(pacs): enforce discrete modality and smart date inference in federation layer"
```

---

### Task 4: PACS Workstation Quick-Action Banner & Clean Ingestion Controls (`src/components/pacs/hospital-pacs-client-view.tsx` & `pacs-harvest-config-modal.tsx`)

**Files:**
- Modify: `src/components/pacs/hospital-pacs-client-view.tsx`
- Modify: `src/components/pacs/pacs-harvest-config-modal.tsx`
- Modify: `src/components/clinic-node/clinic-pacs-harvest-card.tsx`

**Step 1: Enhance `hospital-pacs-client-view.tsx`**
- Add a compact, uncluttered **Sandbox Quick-Status Bar** above the table:
  - Live indicator: "Medical Sandbox: X studies ready on local SSD (Instant Launch)"
  - Auto-Ingestion badge: "Auto-Polling: Today + Yesterday (MR) every 5m"
  - Quick 1-click button: **"Pre-fetch Today & Yesterday"** (triggers background harvest for `last_2_days` over LAN).
  - Quick gear link to open `PacsHarvestConfigModal`.

**Step 2: Update `PacsHarvestConfigModal.tsx` & `ClinicPacsHarvestCard.tsx`**
- Ensure defaults clearly indicate:
  - Scope: `Last 2 Days (Today + Yesterday)` (Recommended).
  - Polling: `Every 5 min (Recommended)`.
  - Tier 1 Sandbox Ingestion: `Download All Studies (Recommended)` with helper text explaining that LAN bandwidth is free and pre-caches studies for rush hour.
  - Link to S3 Sync Card for Tier 2 cloud filters.

**Step 3: Build & Lint check**
Run: `npm run build` or `npm run lint`

**Step 4: Commit**
```bash
git add src/components/pacs/hospital-pacs-client-view.tsx src/components/pacs/pacs-harvest-config-modal.tsx src/components/clinic-node/clinic-pacs-harvest-card.tsx
git commit -m "feat(ui): add uncluttered sandbox quick-status and pre-fetch controls to pacs page"
```

---

### Task 5: End-to-End Edge Node Verification & OTA Deployment

**Files:**
- Verify with live edge node `clinic-pc-primary`

**Step 1: Sync to VPS and trigger OTA update**
- Git push changes to VPS and GitHub `main`.
- Dispatch `update-script` action to `clinic-pc-primary`.
- Verify heartbeat confirms new script version and harvest execution.

**Step 2: Test live query for sample patient `192610002999` and partial MRN `0365`**
- Verify C-FIND finds patient instantly with discrete modality `MR`.
- Verify multi-tap ensures no missed studies.
- Verify Today + Yesterday scans are downloading to `C:\MedicalSandbox\Orthanc\Storage`.
