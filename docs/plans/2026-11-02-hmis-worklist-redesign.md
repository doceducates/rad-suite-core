# HMIS Worklist Cockpit Redesign & Clinical Intelligence Suite Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the HMIS Worklist (`localhost:3780/worklist`) into a unified clinical workstation suite by removing the redundant `⭐ My Cases` tab, reorganizing tabs along the actual clinical patient lifecycle (Intake & Tracking $\rightarrow$ Reporting Queue $\rightarrow$ Published Reports Archive $\rightarrow$ TAT Analytics $\rightarrow$ Discrepancies $\rightarrow$ Archive Logbook), and providing instant on-demand retrieval of historical prior scans (via MRN `1920231719795`) and official signed PDFs (via Accession `192610008123`).

**Architecture:** A modular tab-orchestrated clinical cockpit. The tab bar (`WorklistTabBar`) controls view modes. Reporting studies render the high-throughput PACS-synced table; Patient Tracking renders the Livewire-scraped intake & acknowledgment monitor (`HmisTrackingPanel`); Published Reports renders the all-time historical archive (`HmisPublishedPanel`); and TAT renders the milestone latency viewer (`HmisTatPanel`). All source files strictly adhere to the `<300` lines invariant.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Node.js Playwright scraper (`plugins/hmis-gateway`), Zod validation, Drizzle ORM.

---

## 🧭 Clinical Lifecycle & Tab Architecture

| Tab Name & Key | Underlying HMIS Portal Route | Primary Clinical Purpose & Key Information |
| :--- | :--- | :--- |
| **🏥 Reporting Queue**<br>`proceeded` (or `all`) | `/radiology/proceeded-patients` | **Cases ready for reporting / Add Result**.<br>Patients who HAVE been acknowledged & performed by radiographers.<br>Sub-filters: *All*, *Unassigned Pool*, *Claimed*, Modality (CT/MRI/XR). |
| **🛰️ Intake & Tracking**<br>`tracking` | `/radiology/tracking-list` | **Real-time department flow & Acknowledgment Monitor**.<br>Identifies the critical blind spot: ⚠️ **Pending Radiographer Ack**.<br>Surfaces **Patient Phone Number**, **CNIC**, Shift, Room, Technologist name. |
| **📜 Published & Priors**<br>`published` | `/radiology/published-reports` | **All-Time Historical Archive (No 30-day limit!)**.<br>• **MRN Search** (e.g. `1920231719795`): Pulls all historical CT/MRI/XR priors.<br>• **Accession Search** (e.g. `192610008123`): View & download official signed PDF. |
| **⏱️ TAT Analytics**<br>`tat` | `/radiology/accession/tat` | **Turnaround Time Milestone Tracker**.<br>Visual latency waterfall: Order $\rightarrow$ Reception $\rightarrow$ Ack $\rightarrow$ Performed $\rightarrow$ Verified $\rightarrow$ Published. |
| **⚠️ Discrepancies**<br>`discrepancy` | Local DB vs PACS | Identifies HMIS orders without PACS studies, or PACS images without HMIS orders. |
| **📋 Archive & Logbook**<br>`archive` | Workstation local vault | Historical finalized cases, date-range filtering, and Excel/CSV logbook exports. |

> [!NOTE]
> **Why `⭐ My Cases` is removed from this page**: `My Cases` is already a dedicated top-level page in the left navigation sidebar (`localhost:3780/my-cases`). Removing it from the HMIS Worklist eliminates redundancy and frees up the tab bar for true clinical stages.

---

## 📋 Phased Implementation Tasks

### Phase 1: Tab Architecture & Navigation Streamlining

#### Task 1: Update `WorklistTabBar` Component (<150 lines)
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/src/components/worklist/worklist-tab-bar.tsx`
- Test: `d:/Projects/Rad-Reporting/rad-suite-core/tests/unit/worklist-tab-bar.test.tsx` (or visual verification)

**Implementation Details:**
1. Update `WorklistTabType`:
   ```typescript
   export type WorklistTabType = 
     | 'proceeded' 
     | 'tracking' 
     | 'published' 
     | 'tat' 
     | 'discrepancy' 
     | 'archive';
   ```
2. Remove the `⭐ My Cases` tab button completely.
3. Add tabs for:
   - `🏥 Reporting Queue` (badge: proceeded count / unassigned count)
   - `🛰️ Intake & Tracking` (badge: tracking total, warning dot if pending ack > 0)
   - `📜 Published & Priors` (highlight badge: "All-Time Search")
   - `⏱️ TAT Analytics`
   - `⚠️ Discrepancies`
   - `📋 Archive & Logbook`
4. Support legacy string aliases (`all`, `hmis`, `unassigned`) by normalizing them to `proceeded` to prevent URL bookmark breaks.

---

#### Task 2: Update `useWorklistCases` Hook (<300 lines)
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/src/hooks/use-worklist-cases.ts`
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/src/hooks/use-worklist-filter-persistence.ts`

**Implementation Details:**
1. Update `validTabs` array to:
   ```typescript
   const validTabs = ['proceeded', 'all', 'tracking', 'published', 'tat', 'discrepancy', 'archive', 'unassigned'];
   ```
2. Normalize tab changes so switching to `'tracking'`, `'published'`, or `'tat'` keeps the active tab state persistent in URL query params (`?tab=tracking`, `?tab=published`, etc.).
3. Retain existing sub-filtering for `proceeded` (e.g. unassigned pool filter, modality filter).

---

### Phase 2: Worklist View Switching & File-Size Refactoring (<300 Lines Rule)

#### Task 3: Extract Reporting Table View to Obey Line Limit
**Problem:** `src/components/worklist/worklist-table.tsx` is currently **335 lines** (near the 350 max limit). Adding new view renderers directly will exceed the limit.
**Files:**
- Create: `d:/Projects/Rad-Reporting/rad-suite-core/src/components/worklist/worklist-reporting-view.tsx` (~180 lines)
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/src/components/worklist/worklist-table.tsx` (reduce to ~200 lines)

**Implementation Details:**
1. Move the table `<thead>`, `<tbody>`, empty-state illustration, and `TablePagination` into `worklist-reporting-view.tsx`.
2. In `worklist-table.tsx`, render:
   - `<WorklistTabBar ... />`
   - View switcher:
     - If `tabFilter === 'proceeded'` or `'all'`: `<WorklistReportingView ... />` (with `WorklistFilterBar`)
     - If `tabFilter === 'tracking'`: `<HmisTrackingPanel />`
     - If `tabFilter === 'published'`: `<HmisPublishedPanel defaultSearch={searchQuery} />`
     - If `tabFilter === 'tat'`: `<HmisTatPanel defaultAccession={searchQuery} />`
     - If `tabFilter === 'archive'`: `<WorklistReportingView isArchive ... />`
   - Modals and selection bar remain unified.

---

### Phase 3: Published Reports Deep Integration (Prior Study Lookup & PDF)

#### Task 4: Verify & Wire Published Reports Panel (`HmisPublishedPanel`)
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/src/components/hmis/hmis-published-panel.tsx`
- Test with Sample Data:
  - Accession: `192610008123` (published today)
  - MRN: `1920231719795` (patient historical studies)

**Implementation Details:**
1. Ensure `HmisPublishedPanel` accepts `initialQuery` and `initialType` props so if a clinician is searching an MRN or Accession in the worklist and clicks "Published & Priors", it auto-populates the query!
2. Add quick copy buttons for Prior Report findings:
   - Allows radiologist to copy previous report impressions directly into the current study report.
3. Direct PDF download action:
   - Stream official signed PDF from `/api/hmis/published/pdf/[id]`.

---

### Phase 4: Turnaround Time (TAT) Gateway Handler & UI Panel

#### Task 5: Add TAT Scraper to `plugins/hmis-gateway`
**Files:**
- Create: `d:/Projects/Rad-Reporting/rad-suite-core/plugins/hmis-gateway/src/modules/radiology/tat-handler.js` (<150 lines)
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/plugins/hmis-gateway/src/modules/radiology/radiology.routes.js`
- Modify: `d:/Projects/Rad-Reporting/rad-suite-core/plugins/hmis-gateway/src/config/selectors.js`

**Implementation Details:**
1. Define TAT URL and selectors:
   - `TAT_URL`: `/radiology/accession/tat`
   - `TAT_ACCESSION_INPUT`: `input[name*="accession" i], input[placeholder*="Accession" i]`
   - `TAT_SEARCH_BTN`: `button[type="submit"], button:has-text("Search")`
2. Implement `TatHandler.getAccessionTat(page, accession)`:
   - Navigate to `/radiology/accession/tat`.
   - Fill accession number and submit.
   - Extract stages, timestamps, responsible operators, and stage durations.

#### Task 6: Add Next.js TAT API Route & UI Component
**Files:**
- Create: `d:/Projects/Rad-Reporting/rad-suite-core/src/app/api/hmis/tat/route.ts` (<80 lines)
- Create: `d:/Projects/Rad-Reporting/rad-suite-core/src/components/hmis/hmis-tat-panel.tsx` (<220 lines)

**Implementation Details:**
1. Next.js Route `GET /api/hmis/tat?accession=...`:
   - Validated via Zod (`z.object({ accession: z.string().min(5) })`).
   - Authenticated with RBAC (`roles: ['admin', 'radiologist', 'resident']`).
   - Tamper-evident PHI audit logging.
2. `HmisTatPanel` UI:
   - Accession search bar.
   - Visual vertical or horizontal milestone timeline with stage delta badges (e.g. "+15m Order $\rightarrow$ Reception", "+3.5h Tech Ack $\rightarrow$ Performed").
   - Total turnaround time metric card (e.g. "Total TAT: 4h 12m").

---

### Phase 5: Verification & Safety Guarantees

#### Task 7: End-to-End Typecheck & Line-Count Verification
**Commands:**
```powershell
# 1. Verify TypeScript compiles with 0 errors
npm --prefix "d:\Projects\Rad-Reporting\rad-suite-core" run typecheck

# 2. Verify all modified/created files are <300 lines
Get-ChildItem -Path "d:\Projects\Rad-Reporting\rad-suite-core\src\components\worklist","d:\Projects\Rad-Reporting\rad-suite-core\src\components\hmis" -Include *.tsx,*.ts | ForEach-Object { [PSCustomObject]@{ File=$_.Name; Lines=(Get-Content $_.FullName).Count } } | Format-Table -AutoSize
```

#### Task 8: Live Verification with User Test Samples
1. **Accession `192610008123`**:
   - Query in Published Reports tab $\rightarrow$ confirm study title, doctor, and PDF stream work.
   - Query in TAT tab $\rightarrow$ confirm milestone progression.
2. **MRN `1920231719795`**:
   - Query in Published Reports tab $\rightarrow$ confirm historical studies appear.
3. **Tracking & Acknowledgment Alert**:
   - Switch to "Intake & Tracking" $\rightarrow$ confirm ⚠️ Pending Radiographer Ack counter warns clinician of unacknowledged cases.

---

## 🎯 Expected Outcome
The HMIS Worklist becomes a complete, clean, and intuitive radiology cockpit:
- Zero clutter from duplicate `My Cases` tab.
- Instant visibility into patient flow and unacknowledged scans.
- Immediate access to historical priors and signed PDFs for comparison.
- Full compliance with the `<300` lines invariant.
