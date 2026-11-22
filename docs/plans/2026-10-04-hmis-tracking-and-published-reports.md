# Punjab HMIS Tracking List & Published Reports Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build smart, multi-modal tracking and published report retrieval endpoints and UI in `hmis-gateway` and `rad-suite`, featuring automatic 30-day date-range inference for historical accession numbers (verified with test accession `192608000987`), published report scraping with PDF link extraction, and unified lifecycle monitoring.

**Architecture:** A smart dual-channel architecture where `hmis-gateway` navigates to either `/radiology/tracking-list` (with Livewire `Date Range` switching and 30-day window clamping) or `/radiology/published-reports` (all-time search). `rad-suite` exposes these via authenticated REST routes (`/api/hmis/track`, `/api/hmis/published`) and renders them in `HmisCockpit` with interactive timeline steppers and 1-click PDF viewing.

**Tech Stack:** Node.js, Express, Playwright Chromium, Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Zod validation.

---

## 🔬 Live Discovery Findings (Verified with Accession `192608000987`)

Using the browser agent on `https://hmis.punjab.gov.pk`, the live system behavior was inspected:

### 1. Accession Number Anatomy & Smart Time Travel
HMIS Accession numbers encode temporal and facility data:
`[HospitalID:2][Year:2][Month:2][Sequence:6]`
- Example: `192608000987` -> Hospital `19` (LGH), Year `26` (2026), Month `08` (August), Sequence `000987`.
- **Smart Date Range**: The system automatically infers `2026-08-01 00:00:00` to `2026-08-30 23:59:59` (max 30 days enforced by HMIS) without forcing the user to select historical dates manually.

### 2. Tracking List (`/radiology/tracking-list`)
- **Default State**: Filtered to `Last 24 hours` (`select[wire:model.defer="searchFilters.time_list"]` = `"-24hour"`). Historical accessions return **0 records** unless switched.
- **Switching to Date Range**:
  - Selecting `Date Range` fires `wire:change="getTimeList()"`.
  - Dynamically renders `#from-date-datetimepicker` (`wire:model="startDate"`) and `#to-date-datetimepicker` (`wire:model="endDate"`).
  - Search trigger: `button[wire:click="searchRecords"]`.
- **Verified Record Details**:
  - Patient: Huma Kalsoom | MRN: `69202650616466` | CNIC: `3520274975302` | Contact: `3259974832`
  - Study: `MRI Lumbosacral Spine Without Contrast` (Room: MRI ROOM, Dept: OPD)
  - Full Milestones & Personnel:
    1. Order: `04/Aug/2026 - 11:50 AM` (Dr Khurram Butt)
    2. Receptions: `10/Aug/2026 - 09:09 AM` (Muhammad Majid Radiographer)
    3. Scheduled: `04/Aug/2026 - 01:17 PM` (Dr Fatima Asif)
    4. Pending Acknowledgment: `10/Aug/2026 - 09:14 AM` (Muhammad Majid Radiographer)
    5. Radiographer Acknowledgment: `10/Aug/2026 - 06:04 PM` (kashif khalid)
    6. Performed: `01/Oct/2026 - 06:25 PM` (Dr Jane Doe Radiology)
    7. Rejected: None
    8. Verified: `03/Oct/2026 - 07:46 PM` (Dr Tooba Fatima Radiologist)
    9. Published: `03/Oct/2026 - 07:46 PM` (Dr Tooba Fatima Radiologist)

### 3. Published Reports (`/radiology/published-reports`)
- Accessed from Header `Menus` -> `Published Reports`.
- Filters: `searchMrn`, `searchContact`, `searchCnic`, `searchAccession` (`button[wire:click="searchRecords"]`).
- **Key Advantage**: There is **NO date restriction** when searching by Accession or MRN. Searching `192608000987` returned the record across all history in <1s!
- **Verified Columns & Actions**:
  - `Published Date`: `03/Oct/2026 - 07:46 PM` (Added by: Dr Tooba Fatima Radiologist)
  - `Billing Status`: Paid
  - `Investigation`: `MRI Lumbosacral Spine Without Contrast` (Accession# `192608000987`)
  - `View Report`: Direct PDF URL `https://hmis.punjab.gov.pk/radiology/published-report-pdf/NTIxNTIxODI=` (Base64 ID: `52152182`)

---

## 📋 Phased Implementation Plan

### Phase 1: HMIS Gateway Core Enhancement (`rad-suite/hmis-gateway`)

#### Task 1.1: Enhance Date Helper & Selectors
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/config/selectors.js`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/utils/date-helper.js`
- Test: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/tests/unit/date-helper.test.js`

**Implementation Details:**
- Update `SELECTORS.RADIOLOGY`:
  - `TRACKING_TIME_SELECT`: `select[wire\\:model\\.defer="searchFilters.time_list"], select[wire\\:change="getTimeList()"]`
  - `TRACKING_FROM_DATE`: `#from-date-datetimepicker`
  - `TRACKING_TO_DATE`: `#to-date-datetimepicker`
  - `PUBLISHED_ACCESSION`: `input[wire\\:model\\.defer="searchAccession"]`
  - `PUBLISHED_MRN`: `input[wire\\:model\\.defer="searchMrn"]`
  - `PUBLISHED_TABLE_ROWS`: 'table tbody tr'
  - `PUBLISHED_PDF_LINK`: 'a[href*="published-report-pdf"]'
- Add 30-day window clamping in `date-helper.js` to ensure start and end never exceed 30 days (HMIS Livewire validation ceiling).

#### Task 1.2: Implement Scrapers for Tracking Milestones & Published Reports
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/modules/radiology/radiology.scraper.js`

**Implementation Details:**
- Enhance `extractTrackingMilestones()`:
  - Capture all 9 discrete stages with timestamp AND actor names (Dr / Radiographer).
  - Extract Investigation ID, CPT Name, Room, Clinic, Priority, MRN, Name, CNIC.
- Add `extractPublishedRecords()`:
  - Scrape Published Date, Added By, MRN, Name, CNIC, Gender, Doctor, Clinic, Room, Test Type, Billing Status, Study Title, Accession, and base64 PDF URL.

#### Task 1.3: Update Tracking Search Service with Smart Time-Travel
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/modules/radiology/radiology.service.js`

**Implementation Details:**
- In `executeTrackSearch(page, query)`:
  - If `accession` is provided, automatically call `inferDateRangeFromAccession(accession)`.
  - If date range is inferred or passed explicitly via `startDate` / `endDate`:
    1. Select `'Date Range'` on `select[wire:model.defer="searchFilters.time_list"]`.
    2. Dispatch `change` and wait 1000ms for Livewire DOM injection.
    3. Fill `#from-date-datetimepicker` and `#to-date-datetimepicker`.
    4. Dispatch `input` and `change` events on both pickers.
  - Fill accession / MRN and click search.
  - Return detailed milestones.

#### Task 1.4: Add Published Reports Scraper Service & Route
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/modules/radiology/radiology.service.js`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/modules/radiology/radiology.controller.js`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/modules/radiology/radiology.routes.js`

**Implementation Details:**
- Add `getPublishedReports(credentials, query)` to `RadiologyService`.
- Expose `GET /api/radiology/published?accession=...&mrn=...`.
- Add proxy for `GET /api/radiology/published/pdf/:encodedId` to stream the official HMIS report PDF.

---

### Phase 2: Rad Suite Backend Integration (`rad-suite/src`)

#### Task 2.1: Update Validation & DTO Schemas
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/src/lib/validation.ts`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/src/services/hmis/hmis-models.ts`

**Implementation Details:**
- Add `HmisPublishedQuerySchema` (accession, mrn, contact, cnic).
- Update `HmisSearchQuerySchema` with optional `startDate`, `endDate`, `autoInferDate`.
- Define `HmisPublishedReportRecord` and `HmisDetailedTrackingRecord` types.

#### Task 2.2: Add Gateway Client Functions
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/src/services/hmis/hmis-gateway-client.service.ts`

**Implementation Details:**
- Implement `fetchHmisPublishedReports(params)`.
- Implement `fetchHmisPublishedPdf(encodedId)`.
- Update `trackHmisReport(params)` to pass date hints.

#### Task 2.3: Implement Next.js API Routes
**Files:**
- Create: `d:/Projects/Rad-Reporting/rad-suite/src/app/api/hmis/published/route.ts`
- Create: `d:/Projects/Rad-Reporting/rad-suite/src/app/api/hmis/published/pdf/[id]/route.ts`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/src/app/api/hmis/track/route.ts`

**Implementation Details:**
- Secure endpoints with `withAuth` requiring `admin`, `radiologist`, or `resident` roles.
- Add tamper-evident PHI audit logging: `action: 'hmis_fetch_published_report'`.

---

### Phase 3: Rad Suite UI Cockpit & Workstation Experience

#### Task 3.1: Create Published Reports Panel Component
**Files:**
- Create: `d:/Projects/Rad-Reporting/rad-suite/src/components/hmis/hmis-published-panel.tsx` (<250 lines)

**Implementation Details:**
- Fast accession/MRN search with instant results.
- Render clean card/table showing Patient info, Published date, Radiologist, Billing status, and direct "View / Download PDF" button.
- Support 1-click loading into report viewer.

#### Task 3.2: Upgrade Milestone Lifecycle Tracker
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/src/components/hmis/hmis-milestone-tracker.tsx` (<250 lines)

**Implementation Details:**
- Display all 9 real stages (Order, Reception, Scheduled, Pending Ack, Radiographer Ack, Performed, Rejected, Verified, Published).
- Render doctor/staff names and exact timestamps next to each milestone.
- Show "Smart Date-Travel Badge" (e.g. "Auto-detected August 2026: 2026-08-01 to 2026-08-30").

#### Task 3.3: Wire Up HMIS Cockpit Tabs
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/src/components/hmis/hmis-cockpit.tsx` (<300 lines)

**Implementation Details:**
- Add `'published'` tab to `ActiveTab` in `HmisCockpit`.
- Render `HmisPublishedPanel` alongside `Worklist`, `Search`, `Composer`, and `Tracker`.

---

### Phase 4: Testing & Documentation Synchronization

#### Task 4.1: End-to-End Live Verification with Accession `192608000987`
**Files:**
- Test: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/tests/live/tracking-and-published.test.js`

**Verification Criteria:**
- Querying `192608000987` via `/api/radiology/track` successfully time-travels to August 2026 and returns 9 milestones.
- Querying `192608000987` via `/api/radiology/published` returns `Huma Kalsoom`, `Dr Tooba Fatima`, and PDF URL `NTIxNTIxODI=`.

#### Task 4.2: Documentation Synchronization
**Files:**
- Modify: `d:/Projects/Rad-Reporting/rad-suite/AGENTS.md`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/README.md`
- Modify: `d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/docs/swagger.js`

**Documentation Updates:**
- Document `/api/radiology/published` and `/api/radiology/published/pdf/:id`.
- Document automatic 30-day date range inference logic for historical accession tracking.
- Update architectural invariants in `AGENTS.md`.

---

## 🚀 Execution Readiness
All selectors, Livewire events, and DOM paths have been verified with Playwright on the live production portal. Ready to execute!
