# Implementation Plan: Workstation Navigation, My Cases, PACS Archive, & Structured Clinical Reporting

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver an intuitive, clutter-free clinical workstation experience by introducing:
1. A dedicated **"My Cases"** menu defaulted to the **Active Shift (Today + Yesterday)** with on-demand access to older cases, multi-select batch HMIS draft saving, WhatsApp clinical handover, and locked submit controls.
2. Prominent **Manual Case** indicators with duplicate MRN collision detection and 1-click HMIS reconciliation.
3. A unified **PACS Workstation** table for multi-source imaging browsing (Local E:, S3 Cloud, Google Drive, Hospital PACS/Orthanc, Clinic Node).
4. Streamlined **Reporting Action Controls** in the workstation (eliminating button clutter; auto-save + single role-based primary action: `Submit for Verification` for PGR / `Verify & Sign` for Consultant).
5. Upgraded **Workstation Header Search (⌘K)** with quick-switching (`My Queue`, `Patient Priors with PiP`, and `PACS Archive`).
6. Standardized **Structured Reporting** across all text editors with anatomical headings, bullets, and numbered impressions.

**Architecture:** Adheres strictly to Rad Suite's 4-layer architecture (Transport API, Domain Services, Drizzle SQLite Data, Presentation Components) with file size invariant (< 250 lines target, 350 max). Follows the Punjab HMIS Critical Safety Invariant (Strict Zero-Submit & Zero-Reject: ONLY draft saves permitted; final submit button hard-locked).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Drizzle ORM, SQLite, Tailwind CSS, Lucide Icons, TipTap Clinical Editor.

---

## Plan Overview & Key Deliverables

1. **Active Shift Default Date Filter**:
   - "My Cases" automatically loads **Today + Yesterday** cases.
   - Fast initial page load with zero clutter from past months.
   - Quick date pills: `[Active Shift (Today + Yesterday)]` (default) | `[7 Days]` | `[30 Days]` | `[All Cases Archive]`.

2. **Streamlined Reporting Actions (Zero Button Clutter)**:
   - Eliminates duplicate/confusing buttons across header and footer.
   - Continuous silent Auto-Save with subtle `✓ Saved` status.
   - Role-aware single Primary Action button:
     - For **PGR / Resident**: `📤 Submit for Verification` (prompts WhatsApp handover & snapshots revision).
     - For **Consultant / Admin**: `✅ Verify & Sign` (digitally signs report, marks final).
   - Secondary tools cleanly consolidated into `••• More Actions`.

3. **Dedicated "My Cases" Workstation Page**:
   - Clean table displaying only the logged-in user's assigned/claimed cases.
   - Selection bar with batch actions:
     - **Save Draft to HMIS**: dispatches drafts sequentially with durable local vault first.
     - **Submit Cases (LOCKED 🔒)**: hard-locked for testing phase per safety invariants.
     - **WhatsApp Clinical Handover**: formatted for Consultant Verification & PGR Daily Reports.
     - **Batch Status Update & Release**: bulk transition or release to pool.

4. **Manual Case Indicator & Duplicate MRN Reconciliation**:
   - Distinct `[✍️ Manual Entry]` badge for manual cases.
   - Automatic duplicate MRN detection (`[⚠️ Duplicate MRN]`).
   - 1-click **"Merge with HMIS"** dialog to transfer manual draft reports into official HMIS studies.
   - HMIS background sync automatically links incoming records to existing manual MRN drafts.

5. **Dedicated PACS Workstation Multi-Source Table**:
   - Unified table across all storage locations (Local E:\Cases, S3 Cloud, Google Drive, Orthanc PACS, Clinic PC).
   - Source filter pills: All, Local Disk, S3, GDrive, Hospital PACS, Clinic Node.
   - Direct actions: Launch in RadiAnt, Download DICOM, Open in Zen Workstation, Import to Worklist.

6. **Workstation Header Search (⌘K) Quick-Switch & Prior Navigator**:
   - 3-tab modal:
     - `📋 My Cases Queue`: 1-click instant switch to next patient without leaving split workstation.
     - `🔍 Patient Priors`: auto-filtered to current patient's MRN with 1-click PiP comparison load.
     - `🗄️ PACS Archive`: search across all storage sources with Dense Table toggle.

7. **Structured Quick Report Modal & Text Editor Formatting**:
   - Standardized template integration from `MASTER_TEMPLATE_CATALOG`.
   - Auto-detection of templates based on modality and scan description.
   - Anatomical headings and bullet points for findings; numbered list for impressions.
   - Formatting toolbar: Add Bullet, Add Number, Format Spacing, Template Selector.

---

### Task 1: Navigation & Menu Reorganization
- Modify `src/components/layout/nav-items.ts` to add `my_cases` (`/my-cases`) and `pacs` (`/pacs`).
- Update `src/services/__tests__/nav-items-cleaned.test.ts`.

### Task 2: My Cases Workstation Page with Shift Default & Batch Actions
- Add `shift` / `recent` date filter support in `src/services/unified-case.service.ts`.
- Create `src/app/(dashboard)/my-cases/page.tsx`.
- Create `src/components/my-cases/my-cases-table.tsx`.
- Create `src/components/my-cases/my-cases-selection-bar.tsx`.
- Create `src/components/my-cases/my-cases-batch-hmis-modal.tsx`.

### Task 3: Manual Case Indicator & Duplicate MRN Collision Resolution
- Add `isManual` to `studies` schema in `src/db/schema/sqlite.ts` and `src/db/schema/studies.ts`.
- Update `createManualPatientAndStudy` in `src/services/patient-management.service.ts`.
- Update `getUnifiedWorklist` in `src/services/unified-case.service.ts` to detect duplicate MRNs.
- Add `WorklistManualBadge` and `WorklistDuplicateMrnBadge` in `src/components/worklist/worklist-badges.tsx`.
- Add `POST /api/worklist/merge-manual` in `src/app/api/worklist/merge-manual/route.ts`.
- Update `ingestHmisRecordsToDb` in `src/services/hmis/hmis-worklist-sync.service.ts` to link matching manual MRNs.

### Task 4: PACS Workstation Multi-Source Table
- Replace redirect in `src/app/(dashboard)/pacs/page.tsx` with multi-source server component.
- Create `src/components/pacs/pacs-workstation-table.tsx`.
- Create `src/components/pacs/pacs-source-filter-pills.tsx`.

### Task 5: Streamlined Reporting Controls & Workstation Header Search (⌘K)
- Streamline reporting controls in `src/components/workstation/stitch-header.tsx` and `src/components/workstation/zen-report-footer.tsx` (auto-save indicator, role-based primary action: `Submit for Verification` / `Verify & Sign`, clean secondary menu).
- Upgrade `src/components/workstation/pacs-search-modal.tsx` with 3-tab navigation (`My Queue`, `Patient Priors / PiP`, `PACS Archive`).

### Task 6: Structured Quick Report & Text Editor Formatting
- Upgrade `src/components/worklist/worklist-templates.ts` with structured templates from catalog.
- Enhance `src/components/worklist/worklist-report-modal.tsx` with auto-detection.
- Upgrade `src/components/worklist/worklist-report-modal-body.tsx` with structured editing tools.
- Refine `src/lib/clinical-format.ts` for bullets, numbering, and spacing.

### Task 7: Verification & Documentation
- Run full test suite: `npm test`.
- Update documentation in `docs/features/worklist-and-allocation.md` and `docs/features/workstation-and-reporting.md`.
