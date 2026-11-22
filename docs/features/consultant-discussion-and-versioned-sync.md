# Consultant Discussion Workspace & Versioned Report Synchronization

## 1. Executive Summary
The **Consultant Discussion Workspace** (`/workspace/[accession]?mode=report` $\rightarrow$ **Discuss** tab) provides a high-efficiency, decluttered clinical interface designed specifically for consultant radiologist sign-out and resident case review. It replaces cluttered chip matrices and modal diffs with a clean, directly editable two-column workspace backed by persistent database storage and versioned report synchronization.

---

## 2. Interface Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Report]  [Discuss (Active)]                                             MRI Spine • 4 Abnormalities  │
├───────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│ LEFT PANEL: POSITIVE FINDINGS                     │ RIGHT PANEL: ADDITIONAL NOTES & DICTATION         │
│ [+ Add Finding]                 (4 Active)        │ [Mic / Dictate]                         [Clear]   │
│                                                   │                                                   │
│ ┌─ L2–L3 ───────────────────────────────────────┐ │ ┌───────────────────────────────────────────────┐ │
│ │ Diffuse non-compressive disc bulge indenting  │ │ │ Type or dictate consultant notes, urgent      │ │
│ │ thecal sac.                                   │ │ │ takeaways, or clinical instructions here...   │ │
│ └───────────────────────────────────────────────┘ │ │ e.g. "Urgent correlation for leg drop."       │ │
│ ┌─ L5–S1 ───────────────────────────────────────┐ │ │                                               │ │
│ │ Diffuse non-compressive disc bulge with 6     │ │ │                                               │ │
│ │ o'clock annular fissure.                      │ │ │                                               │ │
│ └───────────────────────────────────────────────┘ │ │                                               │ │
│ ┌─ Vertebrae/Alignment ─────────────────────────┐ │ │                                               │ │
│ │ Normal alignment; partial disc desiccation at │ │ │                                               │ │
│ │ L2–L3, L3–L4, L5–S1; no neural compression.   │ │ └───────────────────────────────────────────────┘ │
│ └───────────────────────────────────────────────┘ │                                                   │
├───────────────────────────────────────────────────┴───────────────────────────────────────────────────┤
│ 4 positive findings ready to compile • Report v1      [Sync to Main Report (v2) ->]                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key Workflow Principles:
1. **Uncluttered & Focused**: Zero extraneous chip ribbons, "0 of 7" clutter, or bulky empty states.
2. **Direct In-Place Editing**: Radiologists can edit finding labels (e.g., `L4–L5`, `Vertebrae/Alignment`, `Vascular Suspicion`) and finding descriptions directly without multi-step dialogs.
3. **Speech Dictation**: Live Web Speech API integration in the right panel for hands-free consultant notes.

---

## 3. Database Persistence (`reports.discussion_json`)
Every edit to positive findings or consultant notes is automatically persisted to the canonical SQLite database (`radsuite.db`) through debounced auto-save (900ms):
- **Transport Endpoint**: `POST /api/reports/[id]/discussion`
- **Database Column**: `reports.discussion_json` (TEXT in SQLite, JSONB in PostgreSQL)
- **Data Payload**:
  ```json
  {
    "positiveFindings": [
      { "id": "f1", "label": "L4–L5", "text": "Diffuse disc bulge..." }
    ],
    "consultantNotes": "Urgent neurosurgical correlation recommended.",
    "updatedAt": "2026-11-01T18:22:24.063Z"
  }
  ```

---

## 4. How Reports Are Re-Synthesized and Synced Back

When the radiologist clicks **"Sync to Main Report (v{N+1})"**:
1. **Clinical Compilation (`compileDiscussionToReportHtml`)**:
   - **Findings**: Unaffected levels maintain normal anatomical baseline while positive findings are formatted as bold anatomical items inside `<ul><li><p><strong>[Level]:</strong> [Text]</p></li></ul>`.
   - **Impression**: Synthesizes high-yield diagnostic bullet points from all abnormal findings, appends the consultant notes / clinical takeaways, and finishes with the reporting doctor's formal signature.
2. **Version Bump & Revision Snapshot**:
   - Calls `saveReport(milestoneTag='Synced from Discussion (v{N+1})')`.
   - Inserts an immutable audit record into `report_revisions` with the new version number (`v1` $\rightarrow$ `v2`).
   - Updates `currentVersion` in the workspace header.
3. **Smooth View Transition**:
   - Displays notification: `notify.success("Report synced and Version {N+1} recorded!")`.
   - Automatically returns to the standard `Report` tab displaying the updated findings and impression.

---

## 5. Responsive Version Control & Audit Drawer (`ReportRevisionDrawer`)
Clicking the version badge (`v1`, `v2`, etc.) in the workstation header opens the Version Control & Audit Drawer:
1. **Universal Identifier Resolution**:
   - Resolves revisions seamlessly across Report UUID, Study UUID, or Study Accession Number (`resolveReportId()`).
   - If no historical snapshot exists yet in `report_revisions`, automatically synthesizes `v1 (Active Working Draft)` so the user always sees their current draft rather than an empty modal.
2. **Responsive Dual-Pane Architecture**:
   - Fixed negative-margin layout bug (`-m-6` removed).
   - Desktop: Side-by-side split (`w-72 md:w-80` timeline + flex-1 inspection pane).
   - Mobile / Tablet: Responsive toggle header allowing seamless switching between `[Timeline]` and `[Preview]` tabs.
3. **Safety & Audit Actions**:
   - 1-click **Copy Snapshot** button.
   - Non-destructive **Revert to v{N}** action with explicit confirmation dialog.
   - Visible close button (`X`) and `Escape` hotkey dismissal.
