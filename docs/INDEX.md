# Rad Suite Documentation Index

Welcome to the **Rad Suite Technical Documentation**. This directory serves as the single source of truth for architectural invariants, subsystem designs, API specifications, and domain services.

---

## Documentation Structure

```
docs/
├── INDEX.md                            # Master navigation and subsystem directory (this file)
├── architecture/                       # Core system design, infrastructure, and protocols
│   ├── overview.md                     # 4-layer architecture, code standards, modularity
│   ├── storage-and-cloud.md            # S3/Ceph storage, multi-series taxonomy, LRU cache, RadiAnt ZIP
│   ├── pacs-and-sources.md             # DIMSE C-GET, Hospital PACS harvester, 5-tier storage
│   ├── two-tier-pacs-ingestion.md      # Strict Tier 1 LAN harvest vs Tier 2 WAN filter, VPS hot-staging, S3 archiver
│   ├── hospital-pacs-stability-and-vitrea.md # Anti-choking invariants, daytime harvest limits, Vitrea 192.168.0.151 ingestion
│   ├── clinic-pc-nodes.md              # Clinic edge daemons, reverse tunnel, Windows Session 0, OTA
│   ├── edge-node-remote-commands.md    # Reverse-heartbeat relay, Base64 PowerShell loader, Session 0 PATH, DIMSE concurrency
│   ├── dual-instance-vps-deployment.md # Decoupled VPS architecture: Port 4125 (Clinical) vs 4128 (Atlas Academy), separate directories & processes
│   └── auth-and-security.md            # Dual-identifier login, AES-256-GCM, RBAC settings
├── integrations/                       # External systems, hospital portals, and cloud APIs
│   ├── hmis-portal.md                  # Punjab HMIS portal, safety locks, Livewire sync, harvesting
│   └── google-docs-drive.md            # Google Drive/Docs clinical export, OAuth, auto-sync
├── features/                           # Workstation features, clinical workflows, and UI tools
│   ├── landing-and-alpha-access.md     # Public landing, alpha waitlist, invite codes, screen RBAC
│   ├── brand-identity-and-single-source-icons.md # Single source of truth SVG, clinical green scheme, multi-platform generator
│   ├── workstation-and-reporting.md    # Standby explorer, split/PiP reporting modes, mobile suite & FAB
│   ├── worklist-and-allocation.md      # Resident claim locks, discrepancy matrix, WhatsApp handover, multi-sort
│   ├── local-ai-and-dictation.md       # Llama-server runner, port 8090, dictation parser, regional prompts
│   ├── patient-and-case-management.md  # Mandatory MRN/accession rule, manual case ingest, clinical clipboard
│   ├── official-reporting-stationery.md # PGMI/LGH official reporting stationery, consultant roster, 1-click print, PDF/DOCX
│   └── single-source-templates.md      # Single source of truth CT/MRI template service, 61 HMIS templates, Option B, contrast engine
└── plans/                              # Historical and active architecture implementation plans
    ├── 2026-09-30-unified-pacs-cloud-architecture.md
    ├── 2026-10-04-hmis-hospitals-and-session-lock.md
    ├── 2026-10-04-hmis-password-and-settings-redesign.md
    ├── 2026-10-04-hmis-tracking-and-published-reports.md
    ├── 2026-10-04-pacs-hmis-pgr-workspace.md
    └── 2026-10-05-streamline-agents-md.md
```

---

## Subsystem Quick Reference

| Subsystem / Topic | Documentation File | Core Concepts & Highlights |
| :--- | :--- | :--- |
| **System Architecture & Layers** | [`docs/architecture/overview.md`](./architecture/overview.md) | 4-layer architecture, <250 line file size rule, HIPAA compliance, hardware isolation |
| **Cloud Storage & S3 Mirror** | [`docs/architecture/storage-and-cloud.md`](./architecture/storage-and-cloud.md) | S3 path-style, Ceph 503 throttling, multi-series taxonomy, LRU disk cache, RadiAnt ZIP |
| **Case Database & Offline Sync** | [`docs/architecture/case-sync-and-offline.md`](./architecture/case-sync-and-offline.md) | Unified multi-tenant DB, outbox replication, revision conflict safety, user-scoped sync |
| **Multi-Device Realtime Sync** | [`docs/architecture/multi-device-sync.md`](./architecture/multi-device-sync.md) | SSE live stream (/api/v1/sync/stream), sync_changelog, two-stage PACS ingestion pipeline |
| **Pluggable Report Sync** | [`docs/architecture/report-sync.md`](./architecture/report-sync.md) | Provider pattern, durable outbox replication, SQLite/PostgreSQL/S3/Google Docs sync |
| **Hospital PACS & Storage Sources** | [`docs/architecture/pacs-and-sources.md`](./architecture/pacs-and-sources.md) | DIMSE C-GET, 48h PACS DB index, /pacs workstation, bulk S3 sync, local retention reaper |
| **Two-Tier PACS & Bandwidth** | [`docs/architecture/two-tier-pacs-ingestion.md`](./architecture/two-tier-pacs-ingestion.md) | Strict Tier 1 LAN harvest vs Tier 2 WAN filter, VPS hot-staging, S3 archiver |
| **PACS Stability & Vitrea Ingestion** | [`docs/architecture/hospital-pacs-stability-and-vitrea.md`](./architecture/hospital-pacs-stability-and-vitrea.md) | Port 8040 anti-choking invariant, daytime focused filtering, Vitrea 192.168.0.151, Syngo console recovery |
| **Clinic PC Edge Nodes** | [`docs/architecture/clinic-pc-nodes.md`](./architecture/clinic-pc-nodes.md) | Reverse-command heartbeat, Windows Session 0 service, SigV4 uploader, OTA updates |
| **Edge Commands & Diagnostics** | [`docs/architecture/edge-node-remote-commands.md`](./architecture/edge-node-remote-commands.md) | Reverse-heartbeat relay, Base64 PowerShell loader, Session 0 PATH, multi-node targeting, DIMSE concurrency |
| **Clinic Gateway Microservice** | [`docs/architecture/clinic-gateway.md`](./architecture/clinic-gateway.md) | Standalone port 4130 hub, SQLite WAL replication ledger, transparent pass-through proxy, Docker |
| **Decoupled VPS & Atlas Architecture** | [`docs/architecture/dual-instance-vps-deployment.md`](./architecture/dual-instance-vps-deployment.md) | Physical separation, Port 4125 vs 4128, independent `.next/` builds, `atlas.db` |
| **Auth, Users & Role Admin** | [`docs/architecture/auth-and-security.md`](./architecture/auth-and-security.md) | Dual-identifier login, AES-256-GCM, multi-tier RBAC & storage isolation, AI agent contract |
| **Notion Editor & Gutter Comments** | [`docs/architecture/notion-editor-patterns.md`](./architecture/notion-editor-patterns.md) | Reverse-engineered Notion schema, dual-mode gutter comments, screenshot paste, scrollable menu |
| **HMIS Portal Integration** | [`docs/integrations/hmis-portal.md`](./integrations/hmis-portal.md) | Zero-submit/reject safety, Livewire sync, collision release, tracking API, Proceeded Patients harvesting |
| **Google Docs & Drive Sync** | [`docs/integrations/google-docs-drive.md`](./integrations/google-docs-drive.md) | Restricted OAuth (`drive.file`), clinical folder tree, native doc upload, auto-sync |
| **Landing Page & Alpha Gate** | [`docs/features/landing-and-alpha-access.md`](./features/landing-and-alpha-access.md) | High-conversion landing, pre-registration waitlist, invite codes, screen-level RBAC & admin |
| **Brand Identity & Icon Pipeline** | [`docs/features/brand-identity-and-single-source-icons.md`](./features/brand-identity-and-single-source-icons.md) | Canonical SVG master, clinical green palette (#8ecf9e/#4a7c59), automated multi-res favicons, Tauri & Android mipmap generator |
| **Workstation UI & Reporting** | [`docs/features/workstation-and-reporting.md`](./features/workstation-and-reporting.md) | Standby screen, split/PiP reporting modes, Case Insights & Viva side drawer, mobile diagnostic suite & FAB |
| **Consultant Discussion & Versioned Sync** | [`docs/features/consultant-discussion-and-versioned-sync.md`](./features/consultant-discussion-and-versioned-sync.md) | Decluttered 50/50 discussion workspace, directly editable positive findings, notes & voice dictation, SQLite persistence, versioned report sync |
| **Worklist, Allocation & Handover** | [`docs/features/worklist-and-allocation.md`](./features/worklist-and-allocation.md) | Case claim locks, discrepancy matrix, WhatsApp clinical handover, multi-column sorting |
| **Local AI & Smart Dictation** | [`docs/features/local-ai-and-dictation.md`](./features/local-ai-and-dictation.md) | Llama-server runner (port 8090), dictation parser, regional prompts catalog, real-time polish |
| **Anatomy Atlas & High-Speed Rendering** | [`docs/features/ANATOMY_ATLAS_CROSS_SECTIONAL.md`](./features/ANATOMY_ATLAS_CROSS_SECTIONAL.md) | 49 eAnatomy modules, 60–120 FPS RAF cine scrub, off-thread img.decode ring buffer, zero-reflow SVG projection |
| **Vitrea 3D VRT & GIR Raymarcher** | [`docs/features/VITREA_3D_RAYMARCHING_AND_GIR.md`](./features/VITREA_3D_RAYMARCHING_AND_GIR.md) | 6-tap normal gradient, Blinn-Phong GIR specular, stochastic jitter, early ray exit, Vitrea presets |
| **Patient Records & Clipboard** | [`docs/features/patient-and-case-management.md`](./features/patient-and-case-management.md) | Mandatory identifier invariant, manual entry modal, granular clinical copy suite |
| **Spine MRI Reporting Standards** | [`docs/features/spine-mri-reporting-rules.md`](./features/spine-mri-reporting-rules.md) | Resident preliminary status invariant, defensive extraspinal terminology, high-yield Option 4 impression |
| **Official Stationery & Printouts** | [`docs/features/official-reporting-stationery.md`](./features/official-reporting-stationery.md) | PGMI/LGH institutional letterhead, 18-faculty consultant picker, 1-click patient printouts, PDF/DOCX parity |
| **Single Source Templates** | [`docs/features/single-source-templates.md`](./features/single-source-templates.md) | Single source of truth CT/MRI template service, 61 HMIS templates, Option B clinical paragraphs, PACS & contrast matcher |
| **Command Center Dashboard** | [`docs/features/dashboard-command-center.md`](./features/dashboard-command-center.md) | Clinical flight deck homepage, Day/Night shift context, STAT radar, active draft resume, modality mix & velocity |
| **Desktop App & OTA Updates** | [`docs/features/desktop-app-and-ota-updates.md`](./features/desktop-app-and-ota-updates.md) | Tauri v2 NSIS installer, Minisign OTA updater, default LGH PACS (10.0.0.100), splash screen & wizard |
| **Desktop Distribution & Pipeline** | [`docs/architecture/desktop-distribution-and-ota.md`](./architecture/desktop-distribution-and-ota.md) | Automated build pipeline (`release-desktop.ps1`), S3/VPS stager, direct download API, in-app update checks |
| **Mobile & Tablet Architecture** | [`docs/architecture/mobile-and-tablet-architecture.md`](./architecture/mobile-and-tablet-architecture.md) | Tauri 2.0 Mobile, Android tablets/phones, S-Pen 120Hz, sub-50MB RAM, native MPR WebGL2 |
| **Admin Telemetry & Workstations** | [`docs/features/admin-telemetry-and-workstations.md`](./features/admin-telemetry-and-workstations.md) | Real-time client workstation tracking, online status, installer download metrics, Command Center KPI bar |
| **MCP & AI Agent Connectivity** | [`docs/architecture/mcp-and-ai-agent-connectivity.md`](./architecture/mcp-and-ai-agent-connectivity.md) | Universal Stdio/SSE MCP server, tenant isolation, RBAC scopes, extensible tool registry |

---

## Agent & Developer Guidelines
1. **Never dump feature specs into `AGENTS.md`**: Keep `AGENTS.md` concise (<150 lines) and reserved strictly for non-negotiable operational invariants.
2. **Document new features here**: When creating or significantly altering a subsystem, update or create the appropriate markdown document under `docs/` and add a row to this index.
