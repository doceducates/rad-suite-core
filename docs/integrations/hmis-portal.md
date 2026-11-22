# Punjab HMIS Portal Integration Standards & Safety Invariants

This document details the Punjab HMIS portal gateway integration, strict clinical safety invariants, Livewire synchronization, Proceeded Patients harvesting, lifecycle tracking, and examination timestamp extraction.

---

## 1. Core Safety Invariants & Livewire Architecture
- **Strict Zero-Submit & Zero-Reject**: ONLY draft saves (`wire:click="save('save')"` / `action: 'save'`) are permitted. Final submission (`wire:click="save('submit')"`) and Reject links (`data-target="#investigationRejection"`) MUST be hard-locked at DOM, network, and controller layers.
- **Durable Local Vault First**: Every report MUST be saved in Rad Suite's `hmis_draft_vault` before any network packet is dispatched to HMIS.
- **Dynamic Livewire ID Structure**: Section textareas follow `textarea_{sectionId}_method_{fieldTemplateId}_{fieldName}_{patientInvestigationId}`. TinyMCE iframes follow `{id}_ifr`.
- **Livewire Deferred Synchronization**: Setting TinyMCE `setContent()` updates only the iframe. You MUST also update the underlying textarea and dispatch native DOM `input` and `change` events (`ta.dispatchEvent(new Event('input', { bubbles: true }))`), otherwise `wire:model.defer` drops the data and saves an empty report.
- **Duplicate Heading Prevention**: The HMIS PDF generator already prints built-in section headers. Never inject duplicate `<p><strong>HISTORY:</strong></p>` or `<p><strong>IMPRESSION:</strong></p>` into the text bodies; use `stripDuplicateHeadings()`.
- **Technique Placement**: HMIS has no separate technique field. Clinical standard is placing `TECHNIQUE:` formatted at the head of the Report/Findings body.
- **Automated Read-Back Verification**: Never trust the HMIS "Saved" toast. The gateway must close, re-search, re-open, and read back the TinyMCE contents to verify persistence (`compareHmisContent()`).
- **Single-Device Session Lock & Collision Release**: HMIS Punjab strictly enforces a single concurrent login per account. Rad Suite detects `SESSION_COLLISION` errors and renders a 1-click release banner (`HmisSessionAlert`) calling `POST /api/hmis/force-release` alongside the global `HmisLogoutButton`, an automatic 2-minute inactivity reaper, and an automatic 8-second backoff retry on collision detection. The gateway cleanly submits `#logout-form, form[action*="logout"]` and awaits portal server-side logout confirmation before closing Playwright contexts and terminating the browser pool, ensuring that clinicians can immediately log into the Punjab HMIS portal from their standard Chrome browser without collision errors.
- **Centralized Microservice & Port Configuration**: Workstation UI components, API proxy handlers, and gateway connectors resolve endpoints strictly via `@/lib/config` (`config.hmisGatewayUrl`, `config.appUrl`, `config.localLlmUrl`, `config.port`). Hardcoded port numbers (e.g. `3788`, `3780`, `3000`) are strictly forbidden.
- **Predefined 78-Hospital Catalog & Radiologist Profile**: Rad Suite maintains the official 78 Punjab tertiary and specialized hospitals catalog in `hmis_hospitals`. Radiologists configure their preferred hospital and HMIS username in `/settings`, automatically provisioning gateway requests.
- **Isolated HMIS Password Storage & AES-256-GCM Encryption**: The external HMIS portal password is kept strictly separate from the Rad Suite platform bcrypt password (`password_hash`). Stored encrypted at rest via `encryptSecret()` in `users.hmis_password`. Client DTOs (`/api/auth/me`) expose only `hasHmisPassword: boolean` mask; decrypted on the backend via `getUserHmisCredentials()` for gateway automation requests only.
- **Resilient Batch Drafts & Queue Invariant**: High-volume reporting requests (20+ studies) use `POST /api/radiology/batch-draft` with background job tracking (`GET /api/radiology/batch/:jobId`) and real-time WebSocket progress broadcasts. Session automation queues are resilient: individual study failures trigger automatic DOM/modal reset (`resetPageState()`) without cascading deadlocks across the session Promise chain.
- **Smart Tracking Date-Range Inference & 30-Day Window**: HMIS `/radiology/tracking-list` defaults to "Last 24 hours". For historical accessions, Rad Suite and the gateway parse the accession timestamp (`[HospitalID:2][YY:2][MM:2]...`), automatically select "Date Range", and apply a clamped 30-day window (`inferDateRangeFromAccession`) to track the 9 discrete lifecycle stages (Order -> Reception -> Scheduled -> Pending Ack -> Radiographer Ack -> Performed -> Rejected -> Verified -> Published) with actor names and timestamps.
- **Historical Published Reports Archive & PDF Streaming**: Rad Suite provides all-time historical search (`GET /api/hmis/published`) querying HMIS `/radiology/published-reports` without date restrictions, and proxies official signed report PDFs (`GET /api/hmis/published/pdf/[id]`) directly to the workstation.
- **HMIS Microservice API Secret Key Forwarding**: Requests dispatched from Rad Suite to the local gateway automatically inject `Authorization: Bearer ${API_SECRET_KEY}` and `x-api-key: ${API_SECRET_KEY}` via `getGatewayHeaders()`. The gateway's `auth.middleware.js` supports both `Authorization` and `x-api-key` headers with trimmed validation to prevent 401 unauthorized errors during patient queue and report operations.
- **Reactive Portal Connectivity & Session Awareness**: Global workstation buttons (`HmisLogoutButton` in header, sidebar, and cockpit) subscribe via `useHmisStatus` to real-time microservice telemetry and active session count. When offline, buttons show a gray `HMIS Offline` status. When standby (`activeSessions === 0`), they display a green `HMIS Ready` badge without false logout actions. When a session lock is held (`activeSessions > 0`), the prominent red release action (`Release HMIS Session (N Active)`) is rendered.

---

## 2. HMIS & PACS Background Sync Engine, Modality & Department Routing & Retention
- **Unified Background Ingestion**: HMIS radiology queue and PACS/local studies are reconciled seamlessly via `syncHmisAndPacsWorklist()` (`POST /api/hmis/sync-worklist`). Cases are indexed into the local SQLite database without blocking workstation render or scraping on page loads.
- **Modality & Department Categorization**: Studies are partitioned and filtered by department (`All`, `🚨 ER`, `🏥 OPD`, `🛏️ Ward`) and modality (`CT`, `MRI`, `X-Ray`, etc.). Clinicians can quickly toggle patient streams via `WorklistFilterBar` without UI clutter.
- **Case-Specific Lifecycle Milestone Tracking**: The gateway tracking endpoint (`GET /api/hmis/track`) is consumed via `syncCaseTrackingStatus()` (`POST /api/cases/[accession]/track-sync`) with a 1-click refresh button in `WorklistRowItem` to populate real-time milestones (`Order`, `Reception`, `Scheduled`, `Pending Ack`, `Radiographer Ack`, `Performed`, `Rejected`, `Verified`, `Published`) and update `studies.hmis_status` and `studies.hmis_milestones_json`.
- **Database Retention & Vacuum Reaper**: To eliminate database bloat from high-volume hospital order feeds, `runWorklistRetentionCleanup()` runs periodically as a background job:
  - Preserves all cases with reports or claims indefinitely.
  - Prunes unlinked, unreported stale HMIS index records older than 90 days.
  - Executes `VACUUM` on SQLite to reclaim disk storage, maintaining a lean metadata index (< 60MB for 100,000 cases).

---

## 3. Multi-Filter Proceeded Patients & High-Throughput Harvesting
- **Complete Portal Filter Integration**: HMIS gateway `GET /api/radiology/worklist` and Rad Suite `GET /api/hmis/worklist` mirror all filter controls from Punjab HMIS `/radiology/proceeded-patients` (`modality`, `subCategory`, `serviceType`, `department`, `status`, `gender`, `room`, `dateType`, `timeList`, `startDate`, `endDate`, `mrn`, `accession`, `name`, `contact`, `cnic`, `cpt`).
- **Configurable Page Sizing & High-Throughput Harvesting**: Eliminates the default 10-patient bottleneck with configurable page sizing (`perPage: 10, 25, 50, 100`, default 100) and optional multi-page harvesting (`fetchAllPages=true`, clamped by `maxPages: 1-20`).
- **Native Playwright Input & Livewire v2 Synchronization**: All filter controls in `worklist-handler.js` use Playwright's native `el.fill()` and `page.selectOption()` rather than synthetic DOM `page.evaluate()` assignments, guaranteeing that Livewire v2 triggers reactive network requests without dropped filter parameters.
- **4-Stage Fallback Patient Search & Prefix Normalization**: Individual patient lookups (`/api/radiology/patient?mrn=...`) sequentially apply: (1) Default today search with auto-expanded `perPage: 100`, (2) Order date vs. Scheduled date switch, (3) 14-day date range fallback for older requisitions, and (4) Hospital prefix swapping (`10` <-> `19`) with fuzzy 10-digit national MRN matching (`cleanQ.slice(-10) === cleanR.slice(-10)`).
- **Dual-Identifier Clinical Normalization**: Modality strings (`CT`, `MRI`, `X-Ray`, `Ultrasound`) and encounter types (`OPD`, `ER`, `IPD`, `Private`) are mapped to official HMIS dropdown option codes via `radiology.filter-mapper.js`.
- **Structured Worklist Envelope**: Responses return `{ totalRecords, page, perPage, count, hasNextPage, filtersApplied, records }`, allowing client-side pagination, total queue tracking, and zero data loss.
- **Proceeded Patients Status Normalization (`scheduled` / `awaiting_report`)**: Studies harvested from HMIS Proceeded Patients have been scanned by radiographers but await diagnostic reporting. They must NEVER be marked as `draft` or `final` automatically. Rad Suite persists them as `status = 'scheduled'` and `hmis_status = 'awaiting_report'`, rendered as `⏳ Awaiting Report` in the UI to prevent clinical confusion with finalized or in-progress reports.
- **Unified Bridge Ingestion & Shared Persistence Engine (`ingestHmisRecordsToDb`)**: Both the live HMIS Bridge endpoint (`GET /api/hmis/worklist`) and the background synchronization service (`syncHmisAndPacsWorklist()`) share the atomic database ingestion engine `ingestHmisRecordsToDb()`. Any studies scraped when viewing the HMIS Bridge are immediately persisted to SQLite `studies` and `patients` tables, guaranteeing that the Departmental Worklist (`/worklist`) and HMIS Bridge never diverge.
- **Frontend-Indexed Query Invariant & Non-Blocking Auto-Sync**: The Worklist UI queries exclusively from the local SQLite indexed database (`unified-case.service.ts`) for sub-50ms performance and zero lag. On initial mount of the Departmental Worklist (`useWorklistCases`), a non-blocking background check queries `/api/hmis/status`; if the gateway is online and standby (`activeSessions === 0`), it silently dispatches `handleSyncHmis()` and seamlessly updates the UI without blocking workstation navigation.
- **Zero-Loss Accession Fallback & Sub-Region Anatomical Normalization**: In `hmis-worklist-normalizer.ts`, patients with missing portal accession anchors automatically fallback to `INV-${patientInvestigationId}` or `HMIS-${mrn}`, preventing dropped orders. `inferBodyPart()` normalizes examination titles to discrete anatomical regions (`LS Spine`, `Cervical Spine`, `Thoracic Spine`, `Whole Spine`, `Brain`, `Chest`, `Abdomen`, `MSK`) so worklist filter tabs match ingested cases with 100% precision.
- **Adaptive Multi-Page Timeout**: `fetchHmisWorklist` applies adaptive network timeouts (`90000ms` when `fetchAllPages=true`, `35000ms` for single-page requests), avoiding premature aborts when harvesting high-volume queues.

---

## 4. True Examination Timestamp Extraction, Radiographer & Referring Doctor Persistence
- **High-Fidelity Examination Timestamp Parsing**: The HMIS proceeded patients table embeds the exact examination date, time, and performing radiographer in Column 1 (`[DD]/[Mon]/[YYYY] - [HH]:[mm] [AM/PM] Added by: [Name] Radiographer`). `radiology.scraper.js` extracts and normalizes this into Pakistan Standard Time (`YYYY-MM-DDTHH:mm:ss+05:00`), ISO date (`YYYY-MM-DD`), and time (`HH:mm:ss`).
- **Database Alignment Invariant**: Studies ingested or updated via `syncHmisAndPacsWorklist()` persist the actual examination timestamp into `studies.scheduled_at`, technologist into `studies.technologist`, and referring physician into `studies.referring_doctor`. Never fallback to the current sync timestamp when real examination timestamps are returned by HMIS.
- **Worklist Table Formatting**: `unified-case.service.ts` maps `studyDate` and `studyTime` from `studies.scheduled_at`. `formatDicomDateTime()` renders the human-readable date and time (e.g. `03/10/26 9:36:00 PM`) exactly matching the clinical scan time on HMIS portal.

---

## 5. Procedure Module Resolution, Heading Deduplication & Doctor Attribution
- **Single Source of Truth for Procedure Modules**: The 60 official HMIS procedure modules (39 MRI, 21 CT) are stored in:
  - Rad Suite Native Service: [`src/services/hmis/hmis-modules.data.ts`](file:///d:/Projects/Rad-Reporting/rad-suite/src/services/hmis/hmis-modules.data.ts)
  - Gateway Engine: [`hmis-gateway/src/modules/radiology/radiology-modules.js`](file:///d:/Projects/Rad-Reporting/rad-suite/hmis-gateway/src/modules/radiology/radiology-modules.js)
  - Extension Bridge: [`HMIS-extension/standalone-api/src/modules/radiology/radiology-modules.js`](file:///d:/Projects/Rad-Reporting/HMIS-extension/standalone-api/src/modules/radiology/radiology-modules.js) and [`HMIS-extension/src/modules/radiology-constants.ts`](file:///d:/Projects/Rad-Reporting/HMIS-extension/src/modules/radiology-constants.ts).
- **Intelligent 60-Procedure Module Resolver (`resolveModuleId` / `resolveHmisModuleId`)**: Automatically maps examination scan types, modalities, and anatomical synonyms to HMIS procedure module IDs (e.g. `"MRI Lumbar Spine Without Contrast"` $\rightarrow$ `792` `"MRI LS SPINE"`, `"CT Brain Plain"` $\rightarrow$ `803` `"CT BRAIN"`). If the study description does not match synonyms, it falls back to dynamic substring matching against all available `#changeModule` options on the live DOM.
- **Heading Normalization & Typography Scaling**: HMIS default templates use `<h3>` headings. When clinicians author or paste structured reports with `<h1>` or `<h2>` tags for Technique, Findings, or sections, `content-injector.js` automatically normalizes `<h1...>` and `<h2...>` to `<h3>...</h3>`. This prevents excessively large headings in the HMIS TinyMCE editor and eliminates broken line heights on official printed PDFs.
- **Smart Heading Deduplication (`content-injector.js`)**: When clinicians author structured reports with `<h3><strong>Technique</strong></h3>` and `<h3><strong>Findings</strong></h3>`, the injector preserves clean formatting without injecting redundant `<p><strong>FINDINGS:</strong></p>` or `<p><strong>TECHNIQUE:</strong></p>` boilerplate. Pre-existing placeholder text (`<p>History</p>` and `<p>Impression</p>`) auto-injected by HMIS is sanitized and replaced.
- **Mandatory Reporting Doctor Signature**: Radiologists configure their official signature (e.g. `Dr. Jane Doe (Resident Radiologist)`) in HMIS Profile Settings (`users.hmis_reporting_doctor_name`). The injector automatically appends `<p><br></p><p><strong><em>Reported by:</em></strong><em> ${doctorName}</em></p>` to the Impression if not already typed, preventing duplicate signatures while ensuring strict attribution compliance.
- **Livewire TinyMCE Synchronization Sequence**: Selecting `#changeModule` triggers Livewire's `getModuleSections()`; the engine waits for `window.tinymce.editors` to initialize, executes `ed.setContent()` and `ed.save()`, dispatches native `input` and `change` DOM events on underlying textareas to capture `wire:model.defer`, and triggers `button[wire:click="save('save')"]`. Submit buttons remain strictly locked.

---

## 6. Report Overwrite, Re-drafting & Versioning Invariant
- **HMIS In-Place Draft Updates**: On the Punjab HMIS portal, each order has a discrete `patient_investigation_id`. When a draft report is saved, the portal retains the record in the Proceeded Patients queue.
  - If a draft already exists on HMIS, clicking "Add Result" reopens the modal with the previously saved draft text populated in TinyMCE.
  - When Rad Suite pushes an updated draft, the injector clears and replaces the TinyMCE content with the latest text and triggers `wire:click="save('save')"`.
  - Livewire executes an SQL `UPDATE` on the existing `patient_investigation_id` row. **It NEVER creates duplicate draft records, multiple reports, or extra rows in HMIS.**
- **Rad Suite Multi-Tier Audit & Version Control**:
  - In Rad Suite's SQLite database, each study has a single active report row in `reports`.
  - Every time a new draft is pushed to HMIS, the previous version is archived into `report_revisions` with a cryptographic timestamp and author ID.
  - The local vault `hmis_draft_vault` is updated with the exact payload and HMIS response metadata, ensuring an indelible audit trail without overwriting local historical archives.

---

## 7. Quick HMIS Draft & Multi-Case Batch Save Architecture
- **1-Click Table Row Quick Draft (`WorklistQuickHmisButton`)**:
  - Located directly in the Actions cell of each row in `WorklistRowItem` (both in `/my-cases` and `/worklist`).
  - Allows clinicians to dispatch draft reports to Punjab HMIS directly from the table with a single click, without having to load the full dual-pane workstation interface.
  - Automatically fetches linked report findings, validates that report content is non-empty, and dispatches the complete clinical payload (`modality`, `scanType`, `bodyPart`, `cpt`, `investigationId`, `technique`, `findings`, `impression`, `pgrName`) to `POST /api/hmis/draft`.
  - Provides instant inline visual feedback: Spinner (`Saving...`), Emerald Check (`HMIS OK`), or Rose Alert (`Failed`), and immediately updates local study `hmisStatus` to `'draft'`.
- **Multi-Case Batch Draft Dispatch (`MyCasesBatchHmisModal`)**:
  - Located in the selection action bar (`MyCasesSelectionBar`) when multiple cases are checked in `My Cases`.
  - Sequential processing with polite inter-study pacing (1500ms) to allow Playwright and HMIS portal session modals to close cleanly and prevent session collision.
  - Fallback report resolution: checks both `c.studyId` and `c.accessionNumber` to ensure reports stored in either `reports` or `hmis_draft_vault` are accurately dispatched.
  - Comprehensive clinical metadata guarantee: automatically packages `scanType`, `modality`, `bodyPart`, `cpt`, and `investigationId` so the gateway's `resolveModuleId` engine always targets the exact procedure module (e.g. `792` for MRI Lumbar Spine).
  - Empty report safeguard: cases with unauthored reports are automatically flagged as pending/failed with a clear prompt, rather than dispatching blank textareas.

---

## 8. Fire-and-Forget Background Dispatch Queue & Centralized Notification System
- **Non-Blocking Fire-and-Forget Queue (`hmisBackgroundQueue` / `enqueueHmisDrafts`)**:
  - Located in `src/services/hmis/hmis-background-queue.service.ts`.
  - Dispatches draft saves in the background without modal lockups or freezing the workstation UI (< 50ms acknowledgment).
  - Radiologists can trigger 1-click single-case saves or multi-case batch saves (e.g., 20 cases from **My Cases**) and immediately continue reading, dictating, or navigating.
- **Universal Floating Notification & Progress Host (`NotificationHost`)**:
  - Mounted centrally in `src/app/layout.tsx` via `src/components/ui/notification-host.tsx` and reactive store `src/services/notification.service.ts`.
  - Displays real-time progress cards for background jobs with live percentage bars and step indicators (`Saving case 3/5: Neha (192610001121)...`).
  - Converts all historical blocking browser `window.alert()` dialogs, 6-level prop-drilled `hmisNotice` chains, and local banners into unified, non-blocking toasts (`notify.success`, `notify.error`, `notify.warning`, `notify.info`).
- **In-Place Modal Pipelining (`hmis-gateway`)**:
  - In `hmis-gateway/src/modules/radiology/radiology.service.js`, the scraper detects if the browser context is already on the proceeded patients worklist.
  - Skips redundant, slow `page.goto` full page reloads, closing and resetting the modal in-place.
  - Drops sequential save duration per case from ~7–8s down to ~2.5–3.5s.

---

## 9. Case Ownership & Assignment Gating Invariant (Zero Accidental Dispatch)
- **Strict Ownership Lock on HMIS Actions**: To eliminate accidental dispatches when browsing the department worklist, `HMIS Draft` and `Revert HMIS` are strictly locked to cases claimed by the active clinician (`study.assignedRadiologistId === currentUserId`).
- **Worklist Row Gating**: The 1-click table action `WorklistQuickHmisButton` only renders for cases assigned to the authenticated user.
- **Reporting Modal & Workstation Interactive Gating**:
  - Unassigned cases: HMIS actions are replaced with a 1-click **"Take Up Case"** button. Clicking it atomically claims the case in Rad Suite and unlocks HMIS actions in real time.
  - Foreign claims: Displays a locked indicator (`🔒 Claimed by [Doctor Name]`) with disabled HMIS dispatch.
- **Server-Side Security Enforcement**: Endpoints `/api/hmis/draft` and `/api/hmis/revert` validate `studies.assigned_radiologist_id` against the caller's session (blocking unassigned with `400` and foreign claims with `403`), while preserving admin emergency override.

---

## 10. Government Datacenter Geo-Firewall & Edge Forwarding Architecture
- **PITB / Government Portal Geo-Fencing**:
  - The Punjab Health Department server (`hmis.punjab.gov.pk` / `phelms.punjab.gov.pk`) drops network packets originating from international cloud/datacenter IP ranges (e.g., German/EU VPS hosts).
  - Direct unproxied headless scraping on non-Pakistani VPS instances triggers connection timeouts (`curl: (28) Connection timed out`).
- **Tri-Path Operational Model**:
  1. **Primary Clinical Path (Chrome Extension)**: Runs in the doctor's domestic Pakistani browser session (PTCL, Nayatel, StormFiber, hospital LAN). Bypasses all geo-blocks, prevents session collisions, and provides visual report confirmation.
  2. **Automated On-Premise Path (Clinic Edge Node)**: The clinic host in Pakistan can run `hmis-gateway` on-premise, receiving headless dispatch requests forwarded securely from Rad Suite VPS.
  3. **Portable Docker Microservice Path (`Proxifly` + `ProxyScrape` `PK` Proxy Pool)**: Runs `hmis-gateway` inside Docker on any international VPS or cloud host, automatically harvesting and verifying Pakistani (`PK`) proxies every 5 minutes with end-to-end TLS validation (see Section 12).

---

## 11. Revert to Unopened (Virgin State) Invariant
- **The Empty Module Rule (`value: ''`)**: In Punjab HMIS, when a patient arrives on the proceeded patients queue, no module is selected (`value: ''`, labeled "Select Module"). The history, report, and impression editors are unmounted and invisible.
- **Why Module Selection Flags the Case**: The moment ANY module is selected in `#changeModule`, Livewire renders the section editors. If that modal is saved (even with completely empty findings), HMIS flags the investigation in its database as "in progress" / "seen by doctor".
- **Reverting to Virgin State**: To restore a patient back to the pristine state as if no clinician ever opened or started reporting it:
  - The gateway MUST select the empty module option (`await page.selectOption(SELECTORS.RADIOLOGY.MODULE_SELECT, '')`).
  - It MUST NOT select any named module (e.g. `792`).
  - Saving with `''` unmounts all editors in Livewire and resets the HMIS record back to untouched/unopened.
  - Future AI agents or developers MUST NEVER replace `''` with a named module in `revertDraft()`.

---

## 12. Portable Docker Microservice, API Key Hardening & Pakistan (`PK`) Proxy Engine
- **Plug-and-Play Container Architecture (`hmis-gateway/Dockerfile` & `docker-compose.yml`)**:
  - Packaged on `mcr.microsoft.com/playwright:v1.44.0-jammy` with `init: true` (prevents zombie Chromium processes), `shm_size: '1gb'`, JSON log rotation, and native Docker `HEALTHCHECK` against `/health`.
  - Connects to any Rad Suite workstation via `HMIS_GATEWAY_URL` and shared `API_SECRET_KEY`.
- **Constant-Time API Key Enforcement (`auth.middleware.js` & `server.js`)**:
  - Validates `API_SECRET_KEY` across both REST endpoints (`x-api-key` or `Authorization: Bearer <token>`) and WebSocket upgrade handshakes (`ws://` headers or `?apiKey=` query param) using `crypto.timingSafeEqual`.
  - Setting `REQUIRE_API_KEY=true` fails closed (`503`) if `API_SECRET_KEY` is accidentally omitted in production.
- **Multi-Source Pakistan (`PK`) Proxy Harvester & TLS Prober (`proxy-manager.js` & `proxy-prober.js`)**:
  - **Sources**: Automatically pulls 5-minute refreshed Pakistan (`PK`) proxy feeds (`http`, `https`, `socks4`, `socks5`) from **Proxifly CDN** (`cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/countries/PK/data.json`) and **ProxyScrape v4 API** (`api.proxyscrape.com/v4/free-proxy-list/get?...&country=pk`), plus optional static `HMIS_PROXY_URL`.
  - **Pre-Flight Socket + End-to-End TLS Verification**: Concurrently tests candidate `PK` proxies by negotiating the proxy tunnel (`HTTP CONNECT`, `SOCKS5`, or `SOCKS4a`) to `hmis.punjab.gov.pk:443` and performing a strict TLS handshake (`rejectUnauthorized: true`) before sending `HEAD /login`. This guarantees that only live, low-latency Pakistani proxies are added to the hot-standby pool and prevents MITM SSL interception by rogue public proxies.
  - **Automatic Session Failover**: `SessionManager` assigns the fastest verified `PK` proxy per Playwright `BrowserContext` (`ignoreHTTPSErrors: false`). If a proxy drops mid-login, `proxyManager.reportProxyFailure()` blacklists it for 15 minutes and transparently retries with the next fastest `PK` proxy.
  - **Proxy Modes (`PROXY_MODE`)**:
    - `auto` *(default)*: Tests direct reachability to `hmis.punjab.gov.pk` first; if reachable (inside Pakistan), uses direct connection; if geo-blocked (international VPS), activates the `PK` proxy pool.
    - `proxifly` / `pool`: Always routes through the verified `PK` proxy pool.
    - `custom`: Uses `HMIS_PROXY_URL` with automatic fallback to the `PK` pool (`PROXY_FALLBACK_POOL=true`).
    - `direct`: Disables proxies completely.
  - **Telemetry & Control Endpoints**: `GET /api/proxy/status` and `POST /api/proxy/refresh` (also documented in Swagger UI at `/api/docs`).
- **Docker Update Workflows (Code Changes & Bug Fixes)**:
  1. **Local Dev Instant Hot-Reload (< 1s)**: `npm run docker:dev` (`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`) bind-mounts `./src:/usr/src/app/src:ro` with `node --watch src/server.js` so code edits reload immediately without rebuilding.
  2. **Production Fast Layer Rebuild (~2–4s)**: Because `Dockerfile` caches the Playwright base image and `npm ci` layer before `COPY src/ ./src/`, running `bash ./scripts/update-gateway.sh` (Linux/VPS) or `.\scripts\update-gateway.ps1` (Windows) rebuilds only the `src/` layer in ~2–4 seconds and verifies `/health`.

---

## 13. Responsive Results Modal, Ephemeral Proof Lightbox & Verification Modes
- **Dispatch Options Modal (`HmisDispatchOptionsModal`)**:
  - Rendered before executing single or batch HMIS dispatches from `/my-cases`, `/workstation`, and `/worklist`.
  - Simple, uncluttered selection:
    - **Fast Save (~15s/case)**: In-page editor verification & HMIS toast confirmation.
    - **Verify in HMIS (~40s/case)**: Full dual-pass read-back check from HMIS TinyMCE editors (`deepVerify: true`).
- **Responsive Multi-Patient Results Modal (`HmisBatchResultsModal`)**:
  - Global host `<HmisBatchResultsHost />` mounted in `src/app/layout.tsx`.
  - Mobile-first design: cleanly switches from a compact, touch-friendly stacked card layout on mobile (`< 640px`) to a high-contrast data table on tablet/desktop.
  - Displays patient name, MRN, accession, status (`Saved`, `Failed`, `Skipped`), Dual-Verified badge, elapsed seconds, error diagnostics, and 1-click **"Proof 📷"** button.
  - Summary stats pill banner (`Total`, `Saved`, `Failed`) at the modal top.
- **Ephemeral Audit Screenshot Lightbox (`HmisScreenshotLightbox`) & Auto-Purging**:
  - Ephemeral audit screenshots captured by the gateway are stored in `hmis-gateway/audit-logs/`.
  - Auto-purged after **20 minutes** on gateway startup and post-save, and immediately on demand via `DELETE /api/radiology/screenshot/purge` (proxied by Next.js `/api/hmis/screenshot/purge`) when dismissing the results modal.
  - Fullscreen, responsive lightbox allows instant inspection of the saved portal state and download of proof images.
- **Universal Notification Service with Live Accordion**:
  - `notify.progress` floating cards feature an expandable "Details" accordion tracking live status rows per patient from anywhere in the application.
  - **Context-Aware Completion Behavior**:
    - **Same Screen**: Automatically closes floating notification and presents the Results Modal.
    - **Navigated Away**: Preserves clinician focus without pop-up interruption; renders an actionable "View Results" button inside the floating notification card.

---

## 14. HMIS Locked Final Submission & Backend Pipeline Architecture
- **Multi-Layer Clinical Safety Lock**:
  - In strict compliance with Punjab HMIS Safety Invariants (AGENTS.md Rule 5), final report submission on the external HMIS portal (`action: 'submit'`) is locked by default and enabled via `HMIS_ALLOW_FINAL_SUBMIT=true`.
  - **Layer 1 (Presentation / DOM)**: `ZenReportFooter` renders the `HMIS Submit` button immediately next to `HMIS Draft`. When unlocked, clicking the button invokes the mandatory pre-flight confirmation modal (`HmisSubmitConfirmModal`), preventing accidental one-click submissions.
  - **Pre-Flight Confirmation Modal (`HmisSubmitConfirmModal`)**: Conforms strictly to Rule 8 canonical `<Modal>` primitives. It presents:
    1. Patient demographic & exam summary (Name, Age, Gender, MRN, Accession, Modality, Scan Type).
    2. Clinician attribution details (Reporting PGR Resident and Supervising Consultant Radiologist).
    3. Impression preview with stripped attributions and clean clinical formatting.
    4. Permanent medical record publication warning banner emphasizing that submission permanently writes to `hmis.punjab.gov.pk`.
    5. Action buttons ("Cancel" and emerald "Confirm & Submit to HMIS" with spinner loading states).
  - **Layer 2 (Transport Controller)**: `POST /api/hmis/submit` interrogates `config.hmisAllowFinalSubmit`. When disabled (`false`), the endpoint fails closed immediately with HTTP `423 Locked`. When enabled, it verifies case ownership, loads user credentials, and dispatches to the gateway.
  - **Layer 3 (Domain / Service)**: `dispatchHmisSubmit()` in `src/services/hmis/hmis-report-dispatch.service.ts` verifies `config.hmisAllowFinalSubmit` before touching the network or database.
  - **Layer 4 (Gateway Engine & Submit Guard)**: In `plugins/hmis-gateway`, `env.ALLOW_FINAL_SUBMIT` enables `safety.middleware.js` to allow `action: 'submit'`. `submit-guard.js` allows clicking `button[wire:click="save('submit')"]` while permanently enforcing anti-rejection (`/reject/i` remains strictly blocked). `radiology.service.js` clicks `SELECTORS.RADIOLOGY.SUBMIT_FINAL_BTN`, verifies completion, and captures an indelible audit screenshot (`submit-${mrn}-${Date.now()}.png`).
- **Environment Toggle**:
  - The feature gate is configured via `HMIS_ALLOW_FINAL_SUBMIT=true` (backend and gateway `.env`) and `NEXT_PUBLIC_HMIS_ALLOW_FINAL_SUBMIT=true` (client UI) in `.env.local`.
- **Durable Local Vault First Invariant**:
  - Any submit dispatch persists an indelible audit snapshot in `hmis_draft_vault` with `status: 'pending_submit'` BEFORE dispatching network packets to the gateway.
  - The upstream payload dispatches to `${getGatewayBase()}/api/radiology/submit-result` with `action: 'submit'`.
  - Upon verified 200 OK from the gateway, the vault record is updated to `status: 'submitted'` and the local study `hmisStatus` is updated to `'submitted'`.

---

## 15. HMIS Batch Revert to Default (Empty State Reset)
- **Batch Revert Floating Action Button**: Located in the floating batch actions toolbar (`MyCasesSelectionBar`) in **My Cases** (`/my-cases`). Rendered with an amber theme badge and `<RotateCcw />` icon immediately adjacent to `Submit HMIS`.
- **Pre-Flight Confirmation Modal (`HmisBatchRevertModal`)**: Conforms strictly to Rule 8 canonical `<Modal>` primitives, presenting the exact case count, selected case chips (`patientName (accession)`), and clinical reassurance that Rad Suite local drafts remain safely archived in history while online HMIS portal records are reset.
- **Fire-and-Forget Background Service (`enqueueHmisBatchRevert`)**:
  - Located in `src/services/hmis/hmis-batch-revert.service.ts`.
  - Conforms to Rule 7 (Centralized Notification & Progress Service Invariant).
  - Uses `notify.progress()` to spawn a non-blocking floating progress card with per-case status rows (`pending` -> `saving` -> `success` / `failed`).
  - Sequentially dispatches `POST /api/hmis/revert` with polite pacing (600ms) to ensure the gateway's Playwright modal closes and resets cleanly without collision deadlocks.
- **Local Database & Workstation Status Alignment**:
  - In `src/services/hmis/hmis-report-dispatch.service.ts`, `dispatchHmisRevert()` automatically updates `studies.hmisStatus` to `'awaiting_report'` and `hmis_draft_vault` to `'reverted'`.
  - When the batch finishes, `notify.success()` confirms the revert count and `onComplete()` triggers `fetchMyCases()`, resetting the table status badges back from `HMIS: Draft` to the default `HMIS: Awaiting Report` state in real time.

---

## 16. Universal Reverse Proxy Gateway Rewrite & SSR Zero-Crash Invariant
- **Universal `/hmis-api` Client Rewrite**:
  - In `next.config.ts`, requests to `/hmis-api/:path*` are transparently rewritten to `${process.env.HMIS_GATEWAY_URL || 'http://127.0.0.1:3788'}/:path*`.
  - On the client browser (`typeof window !== 'undefined'`), `config.hmisGatewayUrl` resolves to `${window.location.origin}/hmis-api`.
  - This guarantees that both local development (`http://localhost:3000/hmis-api`) and production VPS (`https://radiology.sehatai.org/hmis-api`) seamlessly connect to their respective HMIS gateway microservices without CORS blocks, without opening public ports, and without hardcoded hostnames or IP addresses (adheres strictly to Rule 10).
- **Server-Side Rendering (SSR) Zero-Crash Guard**:
  - In `src/app/(dashboard)/hmis/page.tsx`, the `db.select().from(hmisSubmissions)` query is wrapped inside a defensive `try / catch` block.
  - If the database table or dialect experiences a temporary discrepancy, the server component degrades gracefully with an empty list (`[]`) rather than throwing an unhandled exception that causes Next.js to trigger a 404 (`_not-found.html`).
- **Idempotent Table Auto-Creation**:
  - The `hmis_submissions` table is declared in `src/db/sqlite-init.ts` and tracked in `src/db/sqlite-migrations.ts`, ensuring that all workstation instances (local and remote VPS) automatically provision the required audit table on startup.

---

## 17. HMIS Gateway Multi-User Caching & Singleflight Request Coalescing
- **Multi-Tenant In-Memory Cache (`HmisCacheService`)**:
  - Located in `hmis-gateway/src/core/hmis-cache.js`.
  - Cache entries are strictly isolated by account identifier (`${username}:${hospitalId}`) to eliminate cross-tenant leakage.
  - Bounded with LRU capacity protection (default 500 entries) and sub-millisecond memory lookups (`< 1ms`).
- **Granular TTLs by Subsystem**:
  - `worklist`: **25 seconds** TTL. Caches Proceeded Patients queue queries for rapid multi-user and pagination access while ensuring new scan orders appear within 25s.
  - `patient`: **90 seconds** TTL. Caches 4-stage fallback search results by MRN or Accession.
  - `track`: **60 seconds** TTL. Caches 9-stage milestone tracking timelines.
  - `published`: **10 minutes** TTL. Caches finalized reports and signed PDF responses.
- **Stale-While-Revalidate (SWR) Background Pre-Warming**:
  - `worklist` and `patient` namespaces support SWR grace windows (default **60 seconds**).
  - When a query arrives between 25s and 85s after the last scrape, the gateway returns the cached list **instantly in 0ms (`X-Cache: SWR`)** while silently triggering an asynchronous Playwright revalidation in the background.
  - Radiologists experience zero loading spinners during shift handovers.
- **Singleflight In-Flight Request Deduplication (Request Coalescing)**:
  - When multiple doctors, reporting stations, or browser tabs trigger identical queries simultaneously (e.g. at 8:00 AM shift start), only **one** Playwright browser navigation executes.
  - Subsequent concurrent requests attach directly to the existing in-flight Promise and resolve at the exact same millisecond (`X-Cache: COALESCED`).
  - Completely resolves Playwright queue lock contention without multiple 15-second browser navigations.
- **Strict Clinical Write-Through Invalidation**:
  - In compliance with clinical safety invariants, newly saved or reverted reports must immediately reflect on subsequent reads.
  - When `POST /api/radiology/draft` (`saveDraft`) or `POST /api/radiology/revert` (`revertDraft`) finishes:
    - Gateway immediately invalidates the entire `worklist` namespace for that user.
    - Gateway purges matching `patient` and `track` entries for the specific Accession and MRN.
    - Subsequent worklist queries execute a fresh live scrape, picking up the updated investigation status immediately.
- **Forced Cache Bypass (`bypassCache=true`)**:
  - Clinicians can force a live portal harvest by passing `?bypassCache=true` or standard HTTP `Cache-Control: no-cache` header, skipping the cache read and updating the cache with fresh data.
- **Wire-Level Acceleration**:
  - Built-in Gzip/Deflate compression (`compression` middleware) shrinks high-volume 100-patient JSON payloads from ~150KB to ~18KB (85%+ bandwidth reduction).
  - Weak ETags enable `304 Not Modified` responses for unchanged queues.
- **Telemetry & Purge Endpoints**:
  - `GET /api/cache/stats`: Returns hits, misses, coalesced count, hit ratio, active entries, and TTLs.
  - `POST /api/cache/clear`: Administrative cache purge (per-user or global).
  - Telemetry is exposed in `GET /api/status` for real-time workstation status monitoring.

---

## 18. Radiology Tracking List & Patient Bio/Contact Intelligence (`/radiology/tracking-list`)
- **Full Tracking List Endpoint (`GET /api/radiology/tracking-list` and `GET /api/hmis/tracking-list`)**:
  - Unlocks full queue visibility into the Livewire component `radiology.tracking-list` across the entire hospital or department.
  - Allows bulk monitoring of active cases without requiring a single pre-known MRN or Accession.
- **Verified Form Controls & Selectors**:
  - **Date Range Filter**: `select[wire:model.defer="searchFilters.time_list"]` supports `"-24hour"` (default) or `"Date Range"`. Selecting Date Range reveals `#from-date-datetimepicker` (`wire:model="startDate"`) and `#to-date-datetimepicker` (`wire:model="endDate"`), dispatching Livewire event `set-date-range`.
  - **Department Shift**: `select[wire:model="searchFilters.department_shift"]` supports All (`""`), Morning `61` (08:30–14:30), Evening `62` (14:30–20:30), and Night `63` (20:30–08:00).
  - **Role SubCategory (Modality)**: `select[name="role_sub_category"]` maps clinical modalities: CT-Scan (`"1"`), Fluoroscopy (`"2"`), Mammography (`"3"`), MRI (`"4"`), Ultra-Sound (`"5"`), X-Ray (`"6"`), Cardiac (`"31"`), Cardiology (`"32"`).
  - **Department (Service Type)**: `select[wire:model.defer="searchFilters.searchDepartment"]` maps OPD (`"1"`), ER (`"2"`), IPD (`"3"`), Private (`"4"`).
  - **Room Filter**: `select[name="searchFilters.searchRoom"]` maps procedure suites (e.g. `135` for CT Scan Room, `136` for MRI Room).
  - **Direct Search Inputs**: `searchFilters.mrn`, `searchFilters.name`, `searchFilters.contact`, `searchFilters.cnic`, `searchFilters.cpt`, `searchFilters.accession`.
- **High-Throughput Page Sizing & Pagination**:
  - Dropdown `select[wire:model="perPage"]` supports `10`, `25`, `50`, `100`.
  - The gateway defaults to `perPage: 100`, multiplying throughput 10x compared to HMIS's default 10 records per page.
  - Supports direct page jumps via Livewire `gotoPage(pageNum, 'page')` and sequential multi-page harvesting (`fetchAllPages=true`, `maxPages=20`).
- **Rich Bio & Contact Intelligence**:
  - Column 2 contains full patient biographical information including **Patient Phone Number (Contact)** and **CNIC**, enabling radiologists and receptionists to coordinate directly with patients for follow-ups, recall scans, or contrast checks.
  - Column 5 extracts CPT procedure name alongside clinical urgency badges (`routine`, `urgent`, `emergency`).
  - Column 6 extracts all 9 lifecycle milestone timestamps along with the responsible doctor, radiographer, or staff member.

---

## 19. HMIS Single-Device Concurrency & Mandatory Pre-Shutdown Logout
- **Punjab HMIS Single-Device Concurrency Restriction**:
  - The Punjab HMIS portal strictly forbids concurrent active sessions for the same user credentials.
  - If a session is left dangling in background browser instances or if the workstation is stopped abruptly (e.g. `taskkill /F`), the portal server keeps the session lock active, preventing the radiologist from logging in on other clinical workstations, mobile devices, or during app restart.
- **Graceful Shutdown & Remote Portal Logout Endpoint (`POST /api/system/shutdown`)**:
  - `POST /api/system/shutdown` and `POST /api/auth/shutdown` trigger `sessionManager.closeAll()`.
  - The gateway submits `#logout-form` or clicks logout on `https://hmis.punjab.gov.pk` for every active user context.
  - Waits for portal redirection to `/login` to ensure the remote cookie and session are officially invalidated by Punjab HMIS servers.
  - Closes all Playwright browser contexts, unlinks local session storage states, and terminates the Node.js process with `process.exit(0)`.
- **Automatic Gateway Stop on User Logout**:
  - Calling `POST /api/hmis/logout` in Rad Suite now automatically executes remote portal logout, clears storage states, and stops the HMIS Gateway microservice via `stopGatewayProcess()`.
  - The UI immediately updates to `HMIS Offline (Launch)` and frees the account for immediate login on external devices.
- **Tauri Desktop & Node Process Lifecycle Hooks**:
  - Tauri desktop app (`src-tauri/src/lib.rs`) executes `shutdown_hmis_gateway_if_running()` during window close events (`WindowEvent::CloseRequested`, `RunEvent::ExitRequested`), releasing the portal session before shutting down the local backend server.
  - `scripts/stop-radsuite.ps1` provides a clean 1-command shutdown script that gracefully logs out HMIS before stopping Rad Suite.

---

## 20. Proceeded Patients Worklist Extraction Robustness Invariants (`/radiology/proceeded-patients`)
- **Combined Add-Result Link Matching**:
  - In HMIS `proceeded-patients`, examination links are formatted as `a[href*="combine-add-result"]` which frequently lack the `accession=` query parameter (supplying only `mrn` and `patient_investigation_id`).
  - The scraper selects `a[href*="combine-add-result"], a[href*="accession="], a[href*="patient_investigation_id="]` and falls back to Column 6 investigation cell text, ensuring no study is dropped when `accession=` is omitted in the anchor href.
- **Multi-Line Accession Un-wrapping**:
  - On narrow screens and responsive table viewports, HMIS wraps accessions into multiple lines (e.g. `Accession# 192611\n001205`).
  - Scraper strips all whitespace (`replace(/\s+/g, '')`) before regex evaluation, ensuring full 12-digit accession numbers (`192611001205`) are recovered rather than truncated 6-digit prefixes.
- **Single-Digit Day Timestamp Parsing**:
  - HMIS date formatting alternates between two-digit days (`05/Nov/2026`) and single-digit days (`5/Nov/2026`).
  - Datetime parser pattern `([0-9]{1,2})\/([A-Za-z]{3})\/([0-9]{4})` normalizes days with `padStart(2, '0')`, ensuring days 1 through 9 of each month parse into valid ISO date objects (`YYYY-MM-DD`).
- **Span Lookahead Delimiters**:
  - Inline span tags without separating whitespace (`Name: Ali RazaCNIC: 3520120502201Gender: M`) use regex lookaheads `(?=\s*CNIC[:\s]|\s*Gender[:\s]|[\r\n]|$)` and exact 13-digit CNIC extractors `([0-9-]{13,15}|\d+)` to prevent bio string corruption.
- **Bootstrap DateTimePicker Input Targeting & 48h Preset Selection**:
  - Bootstrap datetime pickers wrap `<input>` elements inside `<div id="from-date-datetimepicker">`. Setting `.value` on the container div fails to populate the input.
  - Automation targets `#from-date-datetimepicker input` directly and synchronizes both jQuery `$(div).data('DateTimePicker').date(...)` and native DOM `input`/`change` events.
  - For standard shift intervals (within 48 hours), the handler natively detects and selects the portal's built-in 48-hour preset option, preserving native portal worklist stability.

---

## 21. Hardened 4-Point Clinical Verification Gate (Cross-Contamination Prevention)
- **Elimination of Blind Keyword Selectors**:
  - Previously, fallback selectors such as `tr:has-text("${matchedKeyword}") a[wire:click*="addSampleResult"]` could click unrelated rows matching broad anatomy strings (e.g. "lumbar") when an accession or MRN search returned zero rows.
  - Blind keyword row clicking is strictly prohibited. Table rows must match either the specific accession number, MRN, or exact investigation token.
- **Mandatory 4-Point Pre-Injection Modal Gate**:
  - Before injecting any text into TinyMCE or saving a draft, the gateway opens the `#AddSampleResult` modal and verifies 4 independent clinical anchors against the modal DOM text:
    1. **Patient MRN Gate**: Normalizes digits (e.g. `19202655873074`) and confirms presence in the modal header/text.
    2. **Accession Number Gate**: For non-manual accessions, confirms the accession is present in the modal header or investigation info.
    3. **Patient Name Gate**: Tokenizes the patient name (excluding titles like Mr, Mrs, Bibi, BB), taking significant tokens $\ge 3$ characters (e.g., `PARVEEN`), and ensures at least one significant name token exists in the modal text.
    4. **Study Anatomy / Modality Gate**: Checks target anatomical keywords (e.g. Lumbar, Cervical, Thoracic, Brain, Knee, Abdomen) against the modal procedure header to prevent wrong-study injection.
- **Clean Modal Abort (`abortModal`)**:
  - If any verification check fails, the gateway immediately dismisses the modal via `#AddSampleResult .close, button:has-text("Cancel")` and throws a descriptive error (`HMIS_GATEWAY_PATIENT_MISMATCH`).
  - This prevents UI modal lockups, leaves the worklist clean for the next patient in batch processing, and completely stops cross-patient data contamination.

---

## 22. Historical Back-Date Accession Inference & Resilient Batch Retry System
- **Accession Month Date Inference (`inferDateRangeFromAccession`)**:
  - Punjab HMIS accession numbers encode hospital, year, and month: `[HospitalID:2][Year:2][Month:2][Seq:6]` (e.g., `192609003949` $\rightarrow$ Year 2026, Month 09 = September).
  - When querying or syncing by accession number, `buildHmisSyncPayload` and `worklist-handler.js` automatically infer the target calendar month (`startDate: 2026-09-01`, `endDate: 2026-09-30`).
  - The automation switches the portal's `time_list` select to `'Date Range'`, populates `#from-date-datetimepicker` and `#to-date-datetimepicker` via Playwright inputs and Livewire bindings, and retrieves historical cases without artificial 14-day or 48-hour truncations.
- **Actionable Batch Failed Patient Management (`BatchHmisItemRow`)**:
  - In `MyCasesBatchHmisModal`, failed patients display explicit diagnostic failure reasons rather than an opaque badge.
  - **Single-Item Retry**: Each failed item row includes an independent "Retry" action that resends only that case.
  - **Inline Accession Verification & Correction**: Clinicians can expand "Fix Acc", review candidate accession numbers discovered for the patient's MRN, update the accession in-place, and re-key the case without leaving the batch workflow.
  - **Selective Batch Retry**: A footer button **"Retry Failed Cases (N)"** processes all failed items in sequence while completely preserving all previously successful saves.









