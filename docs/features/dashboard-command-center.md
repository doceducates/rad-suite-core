# Dashboard Command Center — Clinical Homepage & Shift Pulse

The **Command Center** (`/dashboard`) serves as the mission-critical homepage and operational flight deck for radiologists, residents, and clinical directors in Rad Suite.

---

## 1. Architectural Overview & 4-Layer Implementation

- **Layer 1 (Transport)**: `src/app/api/dashboard/stats/route.ts` — Authenticated GET endpoint providing real-time telemetry polling with strict error shielding.
- **Layer 2 (Domain/Services)**: `src/services/dashboard.service.ts` & `src/types/dashboard.ts` — Encapsulates shift detection, active draft identification, modality mix tallying, hourly velocity sparkline calculation, and hospital node health aggregation. Strictly < 250 lines.
- **Layer 3 (Data)**: Leverages Drizzle ORM schemas (`studies`, `reports`, `patients`, `auditLog`, `hmisDraftVault`).
- **Layer 4 (Presentation)**: Modular widgets in `src/components/dashboard/` orchestrated via `DashboardView` bento grid.

---

## 2. Core Functional Modules

### A. Context & Shift Awareness Header
- **Dynamic Shift Identification**:
  - **Day Shift (08:00 – 01:00)**: Multimodality diagnostic coverage (MRI, multislice CT, ultrasound, plain radiography).
  - **Night Shift (01:00 – 07:00)**: Emergency trauma rota focusing on COD (Call On Duty) plain CT Brain trauma protocol (adhering to Invariant 14).
- **Live Clock & Timezone**: Real-time 24-hour timekeeping and workstation date stamps.
- **Immediate Intake**: Quick button to spawn `WorklistManualCaseModal` without leaving the flight deck.

### B. "Continue Where You Left Off" Hero Card
- Continuously identifies the logged-in clinician's most recent unfinalized draft (`draft` or `preliminary` status).
- Displays patient demographics, modality badge, last edited relative time, and findings preview.
- **Keyboard Shortcut**: Press `[Space]` anywhere on the dashboard to immediately open `/workstation?accession=...`.
- If no draft is open, displays a "Ready for Next Case" state with one-click access to the hospital worklist.

### C. 4-Pillar Clinical Telemetry Bento Grid
1. **Emergency STAT Queue**: Real-time counter of acute trauma cases; pulses in high-visibility crimson when > 0.
2. **Reporting Velocity**: Today's finalized reports against personal shift target (default 25 cases) with visual progress bar.
3. **Draft Vault**: Counts active drafts in-flight and PGR preliminary drafts awaiting consultant sign-off.
4. **Punjab HMIS Bridge**: Verifies local durable draft vaulting and confirms Invariant 5 zero-submit lock.

### D. Space-Saving Urgent Triage Queue
- Displays up to the **last 10 urgent or unassigned scans** awaiting reporting.
- Wrapped in a space-saving scrollable viewport (`max-h-[220px] overflow-y-auto`) showing **3–4 cases at a glance** with smooth touch and desktop scrolling.
- Direct 1-click **Report** button launching the diagnostic workstation stage.

### E. Clinical Pending Cases Queue
- Positioned directly below Urgent Triage in the primary clinical column.
- Displays the last **10–20 cases on clinical hold** in a compact scrollable container (`max-h-[260px]`).
- For each case: Patient Name, MRN, Modality, Accession, **Clinical Reason Badge** (e.g. *Awaiting Prior Comparison Films*, *Missing Paper History*, *Awaiting Renal Profile / Creatinine*, *Poor Image Quality / Motion*), **Assigned Consultant** (with icon), clinical notes, and hold duration.
- 1-Click **Resume** button launching `/workstation?accession=...`.

### F. Pending Cases Bottlenecks & Workload Analytics
- Interactive dual-tab visual graph widget:
  - **By Cause**: Comparative frequency bars displaying the most common delay reasons and percentages.
  - **By Consultant**: Workload distribution bars identifying which consultant has the most pending cases.
  - **Key Metrics Row**: Highlights *Total On Hold*, *Leading Bottleneck*, and *Highest Volume Reviewer*.
- Fully responsive across mobile, tablet, and multi-monitor workstations.

### G. Modality Distribution & Reporting Velocity Curve
- Interactive visual distribution of cases by modality (MR, CT, XR, US) with count and percentage chips.
- Lightweight SVG sparkline plotting reporting output by hour across the 24-hour shift cycle.

### H. Hospital Edge & Node Radar
- **Hospital PACS**: Status of DIMSE / C-GET harvester at `10.0.0.100:104`.
- **HMIS Gateway**: Status of local draft vault and sync dispatcher.
- **Local AI Dictation Hub**: Health of local Llama-server / MedGemma on port 8090.
- **Storage Tier**: Hot SSD cache utilization and S3 polite archival.

### I. Ergonomic Quick Launchpad
- 🎙️ **Voice Studio (`/studio`)**: AI speech-to-text dictation lab.
- ⚡ **Rapid Scribe (`/batch`)**: Batch reporting mode for routine studies.
- 📥 **Intake & OCR (`/intake`)**: Requisition slip and QR intake.
- 📚 **Radiopaedia Reference (`/worklist?tab=radiopaedia`)**: Imaging pearls and DDx pool.
- 📋 **My Cases (`/my-cases`)**: Clinician's allocated queue.

### J. Tamper-Evident Audit Feed
- Stream of the 4 most recent events recorded in `auditLog` with verification of cryptographic hash integrity.

---

## 3. Global Dashboard Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `[Space]` | Resume active in-progress draft in Workstation |
| `[W]` | Open full Hospital Worklist (`/worklist`) |
| `[M]` | Open personal assigned cases (`/my-cases`) |
| `[R]` | Refresh dashboard telemetry and node radar |
| `[1]` | Sidebar shortcut to Command Center |
