# AGENTS.md — Rad Suite Development Specification & Rules of Engagement

Welcome to **Rad Suite Core** (`rad-suite-core`), the official unified open-core workstation (port `3780`).
Legacy `rad-suite` is permanently archived; all clinical development occurs strictly in this repository.
Any developer or AI agent modifying this codebase MUST strictly follow these foundational rules:

## 1. Architectural Modularity & File Size Invariant
- **Target Size**: Under 250 lines per file. Maximum allowed: 350 lines.
- **Rule**: If a file exceeds 350 lines, you MUST extract subcomponents, hooks, or helper utilities.
- **No Monolithic Files**: Do NOT bundle schemas, UI, and business logic together.

## 2. Strict 4-Layer Architecture
- **Layer 1 (Transport)**: `src/app/api/*` — Thin controllers ONLY. Authenticate sessions (`requireAuth`), enforce RBAC (`rbacService`), validate request DTOs, and delegate to Services.
- **Layer 2 (Domain/Services)**: `src/services/*` — Pure business logic, state machines, and calculations. No direct HTTP objects here.
- **Layer 3 (Data)**: `src/db/*` — Modular Drizzle schemas, typed models, and database dialect connectors.
- **Layer 4 (Presentation)**: `src/components/*` — Atomic UI primitives in `src/components/ui/`, feature modules in `src/components/{dicom,editor,intake,hmis,audit}/`.

## 3. Security & HIPAA Compliance Invariants
- **Session Security**: 256-bit cryptographic tokens stored in HttpOnly, SameSite=Lax, Secure cookies. Never store auth tokens in localStorage.
- **Input Validation**: EVERY mutating endpoint MUST parse payloads using Zod schemas (`src/lib/validation.ts`).
- **SQL Injection Prevention**: NEVER concatenate raw SQL strings. Always use Drizzle ORM query builders or parameterized sql tags.
- **Tamper-Evident Audit Trail**: Every access or change to Protected Health Information (PHI) MUST trigger `auditService.log()`.
- **Error Shielding**: NEVER leak raw SQL error strings, database paths, or stack traces to the client.
- **Mandatory Auth & Default-Deny RBAC on All Features / Edits**: EVERY new feature, screen (`page.tsx`), and API route edit MUST enforce server-side authentication (`requireAuth`, `getCurrentUser`) and RBAC (`rbacService.canAccessScreen`, `hasPermission`, `canAccessStorageSource`). Never rely on client-side UI hiding alone. Sensitive screens (PACS, nodes, users, audit) and storage tiers (S3, DIMSE, remote edge nodes) are restricted by default; non-admins must never access or view infrastructure telemetry, hardware IDs, or unpermitted storage sources. Reference: [`docs/architecture/auth-and-security.md`](docs/architecture/auth-and-security.md) (Section 8: AI Agent Contract).

## 4. Multi-Platform Hardware Isolation & Theming
- Hardware APIs (Web Speech, Camera QR, Canvas WebGL, Audio) must be wrapped inside safe hooks (`src/hooks/*`) with `typeof window !== 'undefined'` guards so the codebase can compile seamlessly to Desktop (Tauri) and Mobile (Capacitor/PWA).
- Use semantic Tailwind classes mapped to CSS variables (`bg-background`, `bg-card`, `text-foreground`, `border-border`). Always test in both Dark and Light modes.
- **High-Performance Viewports & Zero Layout Thrashing**: Canvas viewports (DICOM & Anatomy Atlas) MUST never invoke `getBoundingClientRect()` inside pointer/touch move or animation loops. Cache geometry via `ResizeObserver`, decode off-thread (`img.decode()`), and coalesce gesture events with `requestAnimationFrame` for 60–120 FPS. Reference: [`docs/features/ANATOMY_ATLAS_CROSS_SECTIONAL.md`](docs/features/ANATOMY_ATLAS_CROSS_SECTIONAL.md).

## 5. Punjab HMIS Critical Safety Invariants
- **Strict Zero-Submit & Zero-Reject**: ONLY draft saves (`action: 'save'`) are permitted. Final submission and Reject links MUST be hard-locked at DOM, network, and controller layers.
- **Durable Local Vault First**: Every report MUST be saved in Rad Suite's `hmis_draft_vault` before any network packet is dispatched to HMIS.
- **Deferred Livewire Sync**: Updating TinyMCE iframe requires updating underlying textarea and dispatching native DOM `input` and `change` events.
- **Single-Device Session Concurrency & Mandatory Pre-Shutdown Logout**: HMIS blocks multiple active logins for the same account. Whenever a user logs out of HMIS or the workstation/Tauri stops, the system MUST gracefully log out of the HMIS portal (`#logout-form` / `/logout`) and terminate the gateway process (`POST /api/system/shutdown`). Hard-killing the gateway (`taskkill /F`) without remote portal logout is strictly prohibited to prevent account lockouts on other devices.

## 6. Database Safety (`radsuite.db`), Multi-Tenant Architecture & Backup Invariant
- **Canonical Database (`radsuite.db`)**: Workstation database is strictly `./radsuite.db` (do not rename in core; it houses all clinical cases, reports, and schema migrations).
- **Mandatory Pre-Operation Backup**: Before running any database migration, seed, batch update, or test runner, ALWAYS create a backup copy of `radsuite.db`, `radsuite.db-wal`, and `radsuite.db-shm` into `db_backups/`.
- **Test Database Isolation**: Vitest and all test suites MUST run against an isolated test database (`./test-radsuite.db`) via `vitest.config.ts`. NEVER run tests against the live workstation database (`./radsuite.db`).
- **Zero-Loss User Vault Protection**: Never execute seed scripts, truncate operations, or retention reapers that prune active user cases or draft reports on the live workstation database.
- **Unified Multi-Tenant DB & DICOM Separation**: Never create separate databases for admins and users. Use a single normalized database with row-level ownership (`assigned_radiologist_id`, `pgr_author_id`). Only metadata and reports sync through the database outbox; binary PACS image slices MUST NEVER traverse SQL database channels (stream via S3/Ceph object storage only). Reference: [`docs/architecture/case-sync-and-offline.md`](docs/architecture/case-sync-and-offline.md).

## 7. Centralized Notification & Progress Service Invariant
- **Zero Raw Browser Alerts**: NEVER use `window.alert()`, `window.confirm()`, or craft bespoke local alert banners.
- **Unified Reactive API**: ALL user notifications, toasts, and warnings MUST route through `notify` (`@/services/notification.service`): `notify.success()`, `notify.error()`, `notify.warning()`, `notify.info()`.
- **Fire-and-Forget Background Tasks**: For multi-step, batch, or remote jobs (HMIS draft saves, exports, syncs), always use `notify.progress()` to spawn a non-blocking floating progress card and immediately release the user interface.

## 8. Reusable UI Primitives & Design Consistency Invariant
- **Check `src/components/ui/` First**: Always reuse canonical primitives (`Button`, `Card`, `Modal`, `Input`, `Badge`, `CopyButton`, `TablePagination`, `NotificationHost`, `DropdownMenu`, `CalendarPicker`).
- **Zero Ad-Hoc Monoliths**: NEVER hand-roll raw backdrop wrappers (`fixed inset-0 bg-black/...`), duplicate modal shells, or bespoke table styles across feature pages.
- **Single Reusable Component Invariant**: Never recreate or duplicate UI components (dropdown menus, calendars, action pickers, split buttons) across feature folders. Always create or extend a single, canonical, composable primitive in `src/components/ui/` and reuse it across tables, toolbars, and filters to keep the codebase compact, unified, and standard.
- **Semantic Theme Tokens Only**: Style exclusively with theme variables (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `bg-surface-container`). Hardcoded arbitrary colors (`bg-[#...]`) are strictly forbidden.
- **Accessible Dialog Standard**: All modals/dialogs MUST support `Escape` key dismissal, backdrop clicking, and proper ARIA dialog semantics via `<Modal />`.

## 9. Mandatory Documentation Policy (Invariant)
- **DO NOT Bloat AGENTS.md**: Never append feature specifications, endpoints, guides, or changelogs directly into `AGENTS.md`. Keep `AGENTS.md` short and concise (< 120 lines).
- **Modular Documentation in `docs/`**: When implementing new features, modifying architectures, or creating integrations:
  1. Create or update the relevant document in `docs/architecture/`, `docs/integrations/`, or `docs/features/`.
  2. If introducing a brand-new domain or subsystem, create a new focused Markdown document in `docs/` and add a reference row to the Documentation Index below.
  3. Keep docs up to date in the final verification step of every task.

## 10. Centralized Environment Configuration & Zero Hardcoded URLs Invariant
- **Zero Hardcoded URLs & Ports**: NEVER hardcode domain names, hostnames, or ports (e.g. `localhost:3000`, `localhost:3780`, `localhost:3785`, `localhost:3788`, `localhost:8080`, `localhost:8090`) in frontend components, API handlers, or service files.
- **Centralized Resolution**: Always resolve workstation, HMIS gateway, and LLM endpoints through `@/lib/config` (`config.appUrl`, `config.hmisGatewayUrl`, `config.localLlmUrl`, `config.port`) or environment variables (`process.env.NEXT_PUBLIC_APP_URL`, `process.env.HMIS_GATEWAY_URL`, `process.env.PORT`).

## 11. Remote Clinic PC Edge Node Anti-Lockout Invariant
- **Zero Single-File Remote Overwrites**: NEVER push or overwrite a single script file (e.g., `admin-actions.js`) on a remote Clinic PC via raw `exec` PowerShell commands without syncing all dependent modules first. Always use atomic full-bundle OTA updates (`update-script` or `update-node.ps1`).
- **Zero Top-Level Cross-Module `require()` in Edge Scripts**: All helper imports in `scripts/clinic-host/*.js` MUST use lazy `try { require(...) } catch {}` inside functions so a missing file can NEVER break the agent or command dispatcher.
- **Inline Zero-Dependency Lifeline**: `clinic-agent.js` and `clinic-watchdog.js` MUST always keep an inline, zero-dependency `exec:` and auto-repair handler using only built-in Node modules (`child_process`, `https`, `fs`), and MUST NEVER swallow action errors in an empty `catch {}`.
- **Remote Execution & DIMSE Invariants**: Never execute bare `node` (use `C:\MedicalSandbox\bin\node.exe`). Prevent `cmd.exe` shell mangling by dispatching complex scripts via Base64 PowerShell loaders (< 4KB to obey 8,191-char CMD limit). Pass explicit `nodeId` in `heartbeat` payloads and verify timestamps against `queuedAt`. Cancel blocking `DicomGetScu` Orthanc jobs before ad-hoc C-FIND. Reference: [`docs/architecture/edge-node-remote-commands.md`](docs/architecture/edge-node-remote-commands.md).

## 12. Hospital PACS Core Isolation, Silent Edge Node & Generic Naming Invariant
- **Zero Actions on Main Hospital PACS Server**: NEVER attempt to install software, agents, SSH, or execute system-level commands on the core hospital PACS server. All queries MUST use standard non-invasive DICOM DIMSE (`C-FIND`, `C-GET`) initiated strictly via the local edge node.
- **Shared Clinic Workstation Protection & Zero Popups**: The clinic PC is an active clinical reporting workstation used daily by radiologists. All edge daemons (`clinic-agent.js`, `clinic-watchdog.js`, `Orthanc.exe`) MUST run strictly as silent background Windows Services in **Session 0** (via NSSM/SC) with ZERO desktop popups, ZERO CMD windows, ZERO interactive toasts, and ZERO continuous UAC prompts.
- **Stealth & Generic Naming Invariant (Clinic Edge & PACS)**: NEVER use `"RadSuite"` or `"Rad Suite"` in Windows service names, scheduled task names, firewall rules, or edge daemon identifiers on the clinic PC or hospital PACS. Use standard generic medical IT names: `MedicalEdgeAgent` (service), `MedicalWatchdog` (service), `MedicalHealthRecovery` (task), `DICOM Edge Router (11115)` (firewall rule), and `Medical-Edge-Router/1.0` (User-Agent). Product branding is strictly confined to the central workstation/web app, never inside hospital edge infrastructure.
- Reference: [`docs/architecture/clinic-pc-nodes.md`](docs/architecture/clinic-pc-nodes.md).

## 13. Two-Tier PACS Ingestion & Anti-Choking Invariant
- **Tier 1 (LAN Harvest & Anti-Choking Guard)**: Free Gigabit LAN harvest via `harvestSchedule`. `bypassKeywords: true` is STRICTLY PROHIBITED during daytime scanning shifts (08:00–17:00)—pulling 2,000+ slice studies exhausts the PACS association pool (2–5 threads), crashing port 8040 (`ECONNREFUSED`) and blocking Siemens scanner auto-pushes. Daytime harvest MUST strictly filter by modality (`MR`) and keywords (`spine`, `cervical`, `lumbar`). Vitrea (`VITREACONSOLE` at `192.168.0.151:3003`, AET `QRSCP`) serves as secondary LAN ingestion.
- **Tier 2 (WAN Sync Filter)**: Limited internet upload to VPS/S3 is governed strictly by `syncRules`. Evaluate `matchesSyncRules()` at the study level BEFORE queueing or generating slice tasks. Non-matching studies remain in sandbox without uploading.
- **Tier 3/4 (VPS Hot-Staging & Polite Archival)**: VPS retains recent cases (today/yesterday) for 2–3 days / 10 GB quota, serving them directly to web viewer (0–1ms). Background archiver paces S3 uploads (250ms delay, 429 backoff) and only prunes studies once synced to S3. Reference: [`docs/architecture/hospital-pacs-stability-and-vitrea.md`](docs/architecture/hospital-pacs-stability-and-vitrea.md).

## 14. Strict Modality & Selective Keyword Filtering Invariant
- **Zero-Bypass Anti-Choking**: `bypassKeywords` must remain `false` by default. Only studies matching configured modalities (strictly `MR` by default) and clinical keywords are retrieved and uploaded to prevent system choking from thousands of unvetted slices.
- **Pure Filter Independence**: Modality filtering is governed strictly by user-configured filters and DICOM metadata, with zero artificial daytime vs nighttime scanner schedule assumptions.
- Reference: [`docs/architecture/clinic-edge-node-rules.md`](docs/architecture/clinic-edge-node-rules.md).

## 15. Modular Plugin & Open Core Invariant
- **Open Core Separation**: Diagnostic primitives (DICOM viewer, structured TipTap reporting, Anatomy Atlas `/atlas`, Vitrea 3D VRT, standard DIMSE) remain in open core.
- **Enterprise Isolation via Plugins**: Proprietary integrations (Punjab HMIS, custom AI weights, clinic PC edge harvesters) MUST be isolated into modular plugins (`plugins/<plugin-id>` or `.zip` packages) that interface strictly via `<PluginSlot />` UI slots (`workstation:toolbar`, `workstation:sidebar`, `workstation:tab`, `settings:tab`) and dynamic route proxies (`/api/plugins/...`). Never tightly couple proprietary hospital logic into core codebase.
- **Zero-Leak Invariant**: NEVER hardcode personal doctor credentials, hospital internal IPs (e.g. `10.0.0.100`), or backdoor passwords into core.
- Reference: [`docs/architecture/modular-plugins-and-open-core.md`](docs/architecture/modular-plugins-and-open-core.md).

## 16. Documentation Index & Subsystem Search Map
When working on specific features, refer to the authoritative documentation files in `docs/`:

| Subsystem / Feature Area | Documentation File | Key Concepts & Specs Covered |
| :--- | :--- | :--- |
| **System Architecture & Layers** | [`docs/architecture/overview.md`](docs/architecture/overview.md) | 4-layer flow, coding conventions, project structure, HIPAA |
| **Modular Plugins & Open Core** | [`docs/architecture/modular-plugins-and-open-core.md`](docs/architecture/modular-plugins-and-open-core.md) | Open core boundaries, `<PluginSlot />` slots, manifest specs, zip packaging, dynamic proxy |
| **Two-Tier PACS & Bandwidth** | [`docs/architecture/two-tier-pacs-ingestion.md`](docs/architecture/two-tier-pacs-ingestion.md) | Strict Tier 1 LAN harvest vs Tier 2 WAN filter, VPS hot-staging, S3 archiver |
| **HMIS Portal Integration** | [`docs/integrations/hmis-portal.md`](docs/integrations/hmis-portal.md) | Safety locks, Livewire sync, collision release, tracking API, Proceeded Patients |
| **Cloud Storage & S3 Mirror** | [`docs/architecture/storage-and-cloud.md`](docs/architecture/storage-and-cloud.md) | S3 path-style, Ceph throttling, taxonomy, LRU disk cache, RadiAnt ZIP |
| **Hospital PACS & Storage Sources** | [`docs/architecture/pacs-and-sources.md`](docs/architecture/pacs-and-sources.md) | DIMSE C-GET, hospital PACS direct harvester, 5-tier federated aggregator |
| **Two-Tier PACS & Anti-Choking** | [`docs/architecture/hospital-pacs-stability-and-vitrea.md`](docs/architecture/hospital-pacs-stability-and-vitrea.md) | Port 8040 anti-choking invariant, daytime focused keywords, Vitrea 192.168.0.151 ingestion, scanner recovery |
| **Clinic PC Edge Nodes** | [`docs/architecture/clinic-pc-nodes.md`](docs/architecture/clinic-pc-nodes.md) | Reverse-command heartbeat, Windows Session 0 service, SigV4 edge, OTA |
| **Edge Node Rules & Invariants** | [`docs/architecture/clinic-edge-node-rules.md`](docs/architecture/clinic-edge-node-rules.md) | Zero loose DCM in S3, two-tier staging, keyword bypass rules, DIMSE protection |
| **Edge Commands & Diagnostics** | [`docs/architecture/edge-node-remote-commands.md`](docs/architecture/edge-node-remote-commands.md) | Reverse-heartbeat relay, Base64 PowerShell loader, Session 0 PATH, multi-node targeting, DIMSE concurrency |
| **Clinic Gateway Microservice** | [`docs/architecture/clinic-gateway.md`](docs/architecture/clinic-gateway.md) | Standalone edge hub, two-stage PACS/S3 progress ledger, remote exec |
| **Auth, Users & Role Admin** | [`docs/architecture/auth-and-security.md`](docs/architecture/auth-and-security.md) | Dual-identifier login, case-sensitive usernames, AES-256-GCM, admin role |
| **Case DB & Offline Sync** | [`docs/architecture/case-sync-and-offline.md`](docs/architecture/case-sync-and-offline.md) | Unified multi-tenant DB, outbox replication, non-destructive revisions, zero DICOM in SQL |
| **Workstation UI & PiP Mode** | [`docs/features/workstation-and-reporting.md`](docs/features/workstation-and-reporting.md) | Standby screen, split/PiP reporting modes, mobile diagnostic suite & FAB |
| **Worklist, Allocation & Handover** | [`docs/features/worklist-and-allocation.md`](docs/features/worklist-and-allocation.md) | Case claim locks, discrepancy matrix, WhatsApp clinical handover, multi-sort |
| **Local AI & Smart Dictation** | [`docs/features/local-ai-and-dictation.md`](docs/features/local-ai-and-dictation.md) | Llama-server runner, port 8090, clinical dictation parser, regional prompts |
| **Patient Records & Clipboard** | [`docs/features/patient-and-case-management.md`](docs/features/patient-and-case-management.md) | Mandatory MRN/accession rule, manual entry, granular clinical copy suite |
| **Google Docs & Drive Sync** | [`docs/integrations/google-docs-drive.md`](docs/integrations/google-docs-drive.md) | Restricted OAuth (`drive.file`), clinical folder tree, native doc upload, auto-sync |
| **Anatomy Atlas & High-Speed Rendering** | [`docs/features/ANATOMY_ATLAS_CROSS_SECTIONAL.md`](docs/features/ANATOMY_ATLAS_CROSS_SECTIONAL.md) | 49 eAnatomy modules, 60–120 FPS RAF cine scrub, off-thread img.decode ring buffer, zero-reflow SVG projection |
| **Vitrea 3D VRT & GIR Raymarcher** | [`docs/features/VITREA_3D_RAYMARCHING_AND_GIR.md`](docs/features/VITREA_3D_RAYMARCHING_AND_GIR.md) | 6-tap normal gradient, Blinn-Phong GIR specular, stochastic jitter, early ray exit, Vitrea presets |
| **Clinical Diff & Templates** | [`docs/features/clinical-revision-diff-and-templates.md`](docs/features/clinical-revision-diff-and-templates.md) | Milestone snapshots (v1/v2/v3), LCS diff viewer, pure bullets vs H3, two-tier impression |
| **MCP & AI Agent Connectivity** | [`docs/architecture/mcp-and-ai-agent-connectivity.md`](docs/architecture/mcp-and-ai-agent-connectivity.md) | Universal Stdio/SSE MCP server, tenant isolation, RBAC scopes, extensible tool registry |
| **Clinical Reporting & Rules** | [`docs/reporting/CLINICAL_REPORTING_RULES.md`](docs/reporting/CLINICAL_REPORTING_RULES.md) | Official 2-heading format, pure bullets, impression synthesis, age gates, golden templates |
| **Decoupled VPS & Atlas Architecture** | [`docs/architecture/dual-instance-vps-deployment.md`](docs/architecture/dual-instance-vps-deployment.md) | Physical separation, Port 4125 vs 4128, independent `.next/` builds, `atlas.db` |
| **Full Documentation Index** | [`docs/INDEX.md`](docs/INDEX.md) | Master table of contents and complete map of all documentation |

## 17. Model Context Protocol (MCP) & AI Agent Invariant
- **Universal Tool Registry & RBAC**: All AI agent interactions MUST register via `McpToolRegistry` with default-deny RBAC scopes.
- **Tenant Isolation & Zero-Submit**: Every tool enforces row-level `tenantId`. Mutations are strictly confined to draft state (`status: 'draft'`).
- **Tamper-Evident Audit**: Every tool execution triggers `auditService.log()`. Reference: [`docs/architecture/mcp-and-ai-agent-connectivity.md`](docs/architecture/mcp-and-ai-agent-connectivity.md).

## 18. Clinical Reporting & Impression Synthesis Invariant
- **Strict 2-Heading Official Template (Default)**: All clinical reports default strictly to LGH Official standard: `<h3><strong>Technique</strong></h3>` and `<h3><strong>Findings</strong></h3>`. Zero intermediate subheadings inside Findings (no `Alignment:`, `Soft Tissues:`, etc.)—pure bullet points `<ul><li><p>...</p></li></ul>` only. Bold abnormal terms inline.
- **Impression Synthesis & Subsumption Rule**: Impressions MUST be concise clinical syntheses (1–2 bullet points maximum). Never repeat findings. Subsume disc desiccation, osteophytes, and minor bulges into the primary spondylosis diagnosis. Omit non-compressive upper levels when dominant lower pathology exists. Zero measurements or clock hours in impression.
- **Age-Gated Diagnostic Rule & Age Verification**: Patients under 30 must never be diagnosed with "spondylosis" (report as "mild disc bulges", "Schmorl's nodes", or "muscular spasm"). Never rely solely on scanner console DICOM age tags (`0010,1010`) which are frequently mistyped at registration (e.g. 11Y vs 27Y); verify clinical concordance and always give precedence to radiologist dictation.
- **Voice Transcription Discrepancy Gate**: If voice-to-text repeats the same level/structure with conflicting findings or ambiguous swaps (e.g. ACL vs PCL), the AI MUST NOT guess or silently invert. If unambiguous upgrade, apply and highlight prominently (`⚠️ Clarification: ...`); if ambiguous, MUST ask the radiologist before saving.
- **Auto-Fix Highlighting & Automated AI Critical Flagging**: Any corrected dictation slips/typos must be explicitly listed in the response (`📝 Transcription Polish: ...`). Acute cord compression, cauda equina syndrome, complete ligament tear, or acute hemorrhage are **automatically flagged by the AI** (never requiring manual tagging by the radiologist) using a clean siren emoji `<span title="🚨 Critical Finding: [Details]">🚨</span>` (hover shows specific critical finding) and setting `critical_finding = 1` / `priority = 'stat'` in `radsuite.db`.
- Reference: [`docs/reporting/CLINICAL_REPORTING_RULES.md`](docs/reporting/CLINICAL_REPORTING_RULES.md).

## 19. Strict VPS Decoupling Invariant (Rad Suite Core vs DocEducates Atlas)
- **100% Physical & Architectural Separation**: Rad Suite Core and DocEducates Atlas are two completely separate, independent projects on the VPS (`178.238.231.54`):
  1. **Clinical Workstation (Rad Suite Core)**:
     - VPS: `/www/wwwroot/radiology.sehatai.org` (Port `4125`, SQLite `radsuite.db`, aaPanel host node daemon).
     - Scope: Clinical hospital reporting, PACS DIMSE C-GET/C-FIND, Punjab HMIS sync, voice dictation, doctor/resident RBAC.
  2. **Educational Academy (DocEducates Atlas)**:
     - VPS: `/www/wwwroot/atlas.doceducates.com` (Port `4128`, SQLite `atlas.db`, Systemd `doceducates-atlas.service`).
     - Scope: 2D eAnatomy cross-sectional viewer, 3D anatomical body models, student quiz/bookmarks, student auth.
- **Independent Build & Deployment Isolation**: Each project maintains its own isolated codebase, `package.json`, `.next/` build artifact, dependencies, and database. Building, restarting, or modifying Rad Suite Core will **NEVER** rebuild, restart, or impact Atlas.
- **Nginx Static Serving**: Nginx directly serves `/_next/static/` via kernel `sendfile` from each project's respective root (`/www/wwwroot/radiology.sehatai.org/.next/static/` and `/www/wwwroot/atlas.doceducates.com/.next/static/`). Slices are served via protected internal Nginx aliases without duplicating the 732MB `.radatlas` binaries.
- Reference: [`docs/architecture/dual-instance-vps-deployment.md`](docs/architecture/dual-instance-vps-deployment.md).

## 20. Universal Background Task & Cancellability Invariant
- **Single Source of Truth**: All multi-step background operations (HMIS batch dispatches, PACS C-GET retrievals, cloud S3 uploads, DICOM folder imports, batch reverts, and export routines) MUST register with `backgroundTasksService` (or emit via `notify.progress` with an explicit `taskId` and `canStop: true`).
- **Mandatory Cancellation Hook**: Every multi-step background loop MUST check for an abort signal or cancellation token (`isCancelled`) before dispatching subsequent items. When `backgroundTasks.stopTask(id)` is triggered, the operation must cleanly halt, mark pending items as `'stopped'`, and persist partial progress.
- **Durable Rehydration & Resumption**: All background tasks must serialize state to `radsuite:background_tasks:v1`. Operations interrupted by page reloads must rehydrate as `'interrupted'` and expose a clean resumption mechanism for unprocessed sub-items.


