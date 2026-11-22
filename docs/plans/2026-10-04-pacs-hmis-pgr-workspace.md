# Simple & Practical Plan: PACS, Vitrea, Cloud & HMIS Integration for PGRs

> **Status:** Plan Updated with Mobile Hamburger Navigation Drawer, HMIS Gateway Swagger Endpoints, Direct Reporting Pane Actions ("Send Draft" / "Revert to Default"), and Dedicated "My Workspace" Navigation Architecture.

**Goal:** Provide an organized, friction-free reporting workstation for PGRs and Radiologists that:
1. Handles the daily 40–50 MRI/CT caseload with 1-click **"Take Up Case"** and **"Release Case"**.
2. Eliminates manual copy-pasting with direct **"Send Draft to HMIS"** and **"Revert to Default"** buttons in the reporting editor footer.
3. Automatically tracks and synchronizes report statuses using the newly verified HMIS Gateway REST API (`http://localhost:8080/api/docs`).
4. Reconciles discrepancies between offline hospital PACS (`10.0.0.100`), Vitrea (`10.0.0.101`), local storage, and the Punjab HMIS portal.
5. Keeps the Clinic PC lightweight (<80 MB RAM, ~0% CPU) by using background sync to Contabo VPS/Cloud.
6. Delivers modern mobile responsiveness: completely hides the sidebar on mobile screens and provides a header hamburger menu button that opens a smooth slide-over side drawer.

---

## 1. HMIS Gateway REST API Endpoints (Verified via Swagger)

We inspected the running HMIS Gateway service (`http://localhost:8080/api/status`) and its Swagger definition (`/api/docs`):

| Method | Gateway Endpoint | Description & Usage in Rad Suite |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Gateway health, active session counter, safety mode (`STRICT_DRAFT_ONLY`). |
| `GET` | `/api/auth/sessions` | Multi-tenant session pool. Monitors active session locks to prevent collisions. |
| `GET` | `/api/radiology/worklist` | Fetches proceeded patients queue from HMIS (`/radiology/proceeded-patients`). |
| `GET` | `/api/radiology/patient` | Searches patient by MRN or Accession with automatic 30-day date-range inference. |
| `GET` | `/api/radiology/track` | Tracks 9-stage milestone lifecycle (`order` → `reception` → `acknowledged` → `performed` → `verified` → `published`). |
| `POST` | `/api/radiology/draft` | **Saves report draft directly to HMIS**. Enforces strict `save('save')`, populates TinyMCE & textareas, triggers Livewire events, and saves an audit screenshot. |
| `POST` | `/api/radiology/revert` *(New)* | **Reverts HMIS draft to default template**. Reselects module or injects standard normal template into HMIS TinyMCE and saves draft. |
| `GET` | `/api/radiology/screenshot/:file` | Fetches visual audit screenshot proof of draft saved in HMIS. |

---

## 2. Streamlined Navigation Architecture & Mobile Responsiveness

To give residents immediate focus and deliver a modern responsive experience across phones, tablets, and desktop workstations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SIDEBAR NAVIGATION MENU                         │
├────────────────────────────────────────────────────────────────────────┤
│  CLINICAL CORE                                                         │
│  ⭐ My Workspace        (/workspace or /worklist?tab=my_cases)  [Badge: 6] │
│     ↳ Shows ONLY cases claimed by the logged-in doctor                 │
│     ↳ Live draft progress, STAT alerts, 1-click "Open" & "Release"     │
│                                                                        │
│  📋 Department Worklist (/worklist)                            [Badge: 42] │
│     ↳ Master hospital queue (40–50 daily CT/MRI studies)               │
│     ↳ Tabs: All Cases | Unassigned Pool | Discrepancies | Archived     │
│     ↳ 1-click "Take Up Case" for any available study                   │
│                                                                        │
│  🖥️ Workstation         (/workstation/[accession])                     │
│     ↳ 3-column diagnostic viewer + clinical report editor              │
│                                                                        │
│  🎙️ Dictation Studio    (/studio)                                      │
│  📑 Batch Reporting     (/batch)                                       │
│                                                                        │
│  IMAGING & RECORDS                                                     │
│  📥 Intake & OCR        (/intake)                                      │
│  📁 Patient Records     (/patients - Historical search & signed PDFs)  │
│                                                                        │
│  HOSPITAL SYSTEM                                                       │
│  🌐 HMIS Bridge         (/hmis - Gateway telemetry & session release)  │
│  ⚙️ Settings            (/settings - PACS SCP, Clinic Node, Cloud)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile Screen Behavior (Responsive Standard):
* **Desktop & Laptops (`md:` and up)**:
  - Persistent sidebar on the left (`w-72` expanded, `w-16` collapsed).
  - Quick toggle via keyboard shortcut (`[` or `Ctrl+B`) and edge pill.
* **Mobile & Small Tablets (`< md`)**:
  - **Completely Hidden Sidebar**: Desktop sidebar is hidden (`hidden md:flex`) so 100% of the screen width is dedicated to the worklist or reporting views. No fixed icons taking up screen space.
  - **Header Hamburger Menu**: A hamburger menu icon (`Menu`) appears in the header on mobile.
  - **Slide-Over Side Drawer (`MobileNavDrawer`)**: Tapping the hamburger icon smoothly slides in the full navigation drawer from the left with a darkened backdrop overlay.
  - **Auto-Close**: Tapping any route link, clicking the backdrop, or pressing `Escape` closes the drawer automatically.

---

## 3. Direct Reporting Pane Actions: Zero Copy-Paste Workflow

Inside the diagnostic reporting canvas (`ZenReportFooter` in `src/components/workstation/zen-report-footer.tsx`), we add direct 1-click HMIS actions alongside Voice Dictation and Local Save:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ZEN REPORT FOOTER                                                                              │
├────────────────────────────────────┬───────────────────────────────────────────────────────────┤
│ 342 words • Auto-saved 12:44 PM    │ [🎙️ Mic] [💾 Save (Ctrl+S)] [🌐 Send Draft] [↺ Revert]  │
└────────────────────────────────────┴───────────────────────────────────────────────────────────┘
```

### Action A: "Send Draft to HMIS"
1. **1-Click Execution**: Radiologist clicks **"Send Draft to HMIS"** (or presses `Ctrl+Shift+H`).
2. **Local Vault First**: Report is instantly saved into `hmis_draft_vault` in Rad Suite.
3. **Automated Gateway Dispatch**: Rad Suite calls `POST /api/radiology/draft` on the HMIS Gateway:
   - Automatically matches the CPT study to the HMIS module (e.g., *CT Brain* or *MRI Lumbar Spine*).
   - Injects formatted `TECHNIQUE`, `FINDINGS`, and `IMPRESSION`.
   - Adds attribution (`Reported By: Dr. Sarah Lin (PGR) | Verified By: Consultant`).
   - Syncs TinyMCE iframe and underlying Livewire textareas.
   - Clicks `wire:click="save('save')"` (Strictly locked: Never submits).
   - Captures an audit screenshot.
4. **Instant UI Confirmation**: Button displays a green checkmark `[✓ Saved to HMIS 12:45 PM]` with a link to view the verification screenshot.

### Action B: "Revert to Default on HMIS"
1. **Safe Rollback**: If a draft needs to be reset, the radiologist clicks **"Revert to Default"**.
2. **Confirmation Safeguard**: A lightweight modal asks: *"Revert draft on HMIS portal back to the standard normal template for this case?"*
3. **Execution**: Rad Suite calls `POST /api/radiology/revert` on the gateway:
   - Reselects the module dropdown in HMIS or sets the official normal template.
   - Saves the fresh draft in HMIS.
   - Updates Rad Suite local editor and status badge to `DEFAULT_NORMAL`.

---

## 4. Multi-System Discrepancy Reconciliation

Each study row in the worklist displays 4 clear presence indicators:

```
[Accession: 192610000839]  [Patient: Muhammad Ali]  [Modality: MRI]
Presence:  [PACS: ✓]  [Vitrea: ✓]  [Local Disk: ✓]  [HMIS: Draft Saved]
```

### Discrepancy Alerts & Filters:
1. **"Missing in HMIS"** (study present on PACS/Vitrea, but patient record missing in HMIS):
   - Highlighted in amber.
   - 1-click filter button allows PGRs or clerical staff to pull up all un-registered studies.
2. **"Missing on PACS"** (patient investigation scheduled in HMIS, but DICOM images not yet pushed from MRI scanner console).
3. **"Vitrea / PACS Sync Gap"** (present on PACS server but not yet retrieved onto Vitrea workstation).

---

## 5. Implementation Roadmap (Phased & Atomic)

### Phase 1: HMIS Gateway Extension Enhancements
- **Target**: `HMIS-extension/standalone-api`
- Add `POST /api/radiology/revert` endpoint in `radiology.routes.js` and `radiology.controller.js`.
- Implements module reload / standard template injection in `radiology.service.js`.
- Updates `swagger.js` OpenAPI docs.

### Phase 2: Database & Core Allocation Service
- **Target**: `rad-suite/src/db` and `rad-suite/src/services`
- Verify / ensure `studies` table tracking columns: `assignedRadiologistId`, `claimedAt`, `hmisStatus`, `hmisLastCheckedAt`.
- Create `case-allocation.service.ts`:
  - `claimCase(accession, user)` with concurrency protection.
  - `releaseCase(accession, user)` to return case to common pool.
  - HIPAA audit logging via `auditService.log()`.
- Create `case-reconciliation.service.ts`:
  - Matrix calculation across PACS, Vitrea, Local, Cloud, and HMIS.

### Phase 3: Transport Layer (Thin API Controllers)
- **Target**: `rad-suite/src/app/api`
- `POST /api/cases/[accession]/claim`: Locks case to current user.
- `POST /api/cases/[accession]/release`: Releases lock.
- `GET /api/cases/[accession]/status`: Returns unified claim and HMIS tracking info.
- `POST /api/hmis/draft`: Dispatches report to HMIS Gateway `POST /api/radiology/draft`.
- `POST /api/hmis/revert`: Dispatches revert request to HMIS Gateway `POST /api/radiology/revert`.

### Phase 4: Presentation Layer & Mobile Responsive Navigation
- **Target**: `rad-suite/src/components`
- **Mobile Responsive Drawer**:
  - Update `Sidebar` to hide completely on mobile (`hidden md:flex`).
  - Add hamburger button (`Menu` icon) to `Navbar` visible only on mobile (`md:hidden`).
  - Create `MobileNavDrawer` component with slide-in animation, backdrop overlay, and auto-close on link navigation.
- **Navigation Architecture**: Update `NAV_ITEMS` in `src/components/layout/nav-items.ts` to include `My Workspace` and `Department Worklist`.
- **Worklist Filter Bar**: Add tabs `[All Cases]` | `[My Cases]` | `[Unassigned Pool]` | `[Discrepancies]`.
- **Worklist Row Item**: Add **"Take Up Case"** / **"Release Case"** button and system status chips.
- **Reporting Footer**: Enhance `zen-report-footer.tsx` with **"Send Draft to HMIS"** and **"Revert to Default"** buttons.
- **Hook Integration**: Update `use-report-editor-actions.ts` to wire up the API calls with loading states and user toasts.

### Phase 5: Verification & Documentation Sync
- Vitest unit tests for allocation, reconciliation, and API endpoints.
- Full Vitest suite regression run (`npm test`).
- Update `README.md` and `AGENTS.md` per Mandatory Documentation Synchronization Invariant.

---

## 6. How the Cloud & Clinic PC Sync Works (Simply Explained)

* **Clinic PC**: Sits in the hospital. Connected via Ethernet to PACS (`10.0.0.100`) and via Wi-Fi to Internet.
* **Lightweight Job**: A background script copies completed studies from Ethernet directly to your Contabo VPS / Google Drive.
* **Low Impact**: It does zero rendering. CPU is ~0% and RAM is ~70 MB. The Clinic PC never bogs down.
* **Remote Speed**: When you or PGRs open cases at home, they load directly from your high-speed Contabo VPS in **1–2 seconds**, with no frozen screens.
