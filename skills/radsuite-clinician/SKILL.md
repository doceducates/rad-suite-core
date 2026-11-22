---
name: radsuite-clinician
description: Operate Rad Suite Medical Imaging Workstation to query worklists, inspect cases, draft structured radiology reports, query PACS, and perform differential lookups.
---

# Rad Suite Clinician Skill

Operate **Rad Suite Core**, a high-performance clinical radiology reporting workstation and PACS archive manager.

## When to Use This Skill
Use this skill whenever you need to:
- Review active hospital imaging queues and triage pending radiology cases.
- Retrieve complete clinical history, indication, prior comparisons, and series metadata for a study.
- Formulate evidence-based, structured radiology reports (Findings, Impression, Recommendations).
- Search cross-sectional anatomy in the eAnatomy atlas or reference cases on Radiopaedia.
- Query hospital PACS archives via DICOM C-FIND and check PACS node connectivity.

---

## Strict Clinical Safety Invariants

> [!IMPORTANT]
> **Strict Zero-Submit & Human-in-the-Loop Approval**:
> All agent mutations MUST remain in **`status: 'draft'`**. AI agents are strictly forbidden from signing, approving, or finalizing reports. Final clinical sign-off is reserved exclusively for the human radiologist.

> [!IMPORTANT]
> **Multi-Tenant Row Isolation**:
> Every query and mutation is bound to the authenticated clinician's `tenantId`. Never attempt to cross hospital boundaries or query unassigned tenants.

> [!CAUTION]
> **Laterality & Critical Findings**:
> Always cross-verify anatomical laterality (Left vs. Right) between Findings and Impression. If an acute or life-threatening finding is detected (e.g., acute intracranial hemorrhage, pulmonary embolism, pneumothorax, bowel perforation), explicitly set `criticalFinding: true` and highlight the finding prominently in the report Impression.

---

## Core Workflow: Structured Clinical Reporting

### 1. Worklist Triage & Inspection
```json
// Query urgent or pending CT studies in current worklist
radsuite_get_worklist({
  "modality": "CT",
  "status": "scheduled",
  "priority": "urgent",
  "limit": 10
})
```

### 2. Case Demographics & Technique Review
```json
// Fetch full study metadata, patient history, and prior report state
radsuite_get_case({
  "accessionNumber": "ACC-2026-0042"
})
```

### 3. AI Drafting & Clinical Structuring
```json
// Generate suggested findings structure based on scan type and indication
radsuite_suggest_report({
  "modality": "CT",
  "bodyPart": "Brain",
  "indication": "Trauma, severe headache, rule out bleed",
  "preliminaryNotes": "Normal gray-white differentiation, no acute midline shift"
})
```

### 4. Differential Diagnosis & Knowledge Pearl Lookups
```json
// Search disease pearls and imaging references
radsuite_generate_differential({
  "findings": "Hyperdense crescentic extra-axial collection along right frontoparietal convexities crossing suture lines",
  "patientAge": 68,
  "patientGender": "Male",
  "clinicalHistory": "Fall 2 days ago"
})

// Query eAnatomy for anatomical relationships
radsuite_anatomy_lookup({
  "query": "middle meningeal artery"
})
```

### 5. Saving Draft Report
```json
// Save findings and impression as a draft revision
radsuite_save_report_draft({
  "accessionNumber": "ACC-2026-0042",
  "findings": "Brain parenchyma shows preserved gray-white matter differentiation. No acute intra-axial hemorrhage, acute territorial infarction, or mass effect. Ventricles and sulcal spaces are age-appropriate. Symmetrical basal cisterns. Calvarium is intact.",
  "impression": "No acute intracranial hemorrhage or territorial infarction.",
  "technique": "Non-contrast volumetric axial CT of the head with multiplanar reformations.",
  "criticalFinding": false
})
```

---

## PACS Archive Operations

### Query PACS via DICOM C-FIND
```json
radsuite_pacs_cfind({
  "modality": "MRI",
  "dateRange": "today"
})
```

### PACS Node Connectivity Ping
```json
radsuite_pacs_ping({})
```

---

## Tool Reference Matrix

| Tool Name | Scope Required | Mutating? | Description |
| :--- | :--- | :--- | :--- |
| `radsuite_get_worklist` | `cases:read` | No | Fetch active tenant radiology worklist |
| `radsuite_get_case` | `cases:read` | No | Full clinical study metadata & demographics |
| `radsuite_claim_case` | `cases:write` | Yes | Claim unassigned study for reporting |
| `radsuite_get_report` | `reports:read` | No | Fetch current report & revision history |
| `radsuite_save_report_draft` | `reports:draft_write` | Yes | Save draft findings & impression |
| `radsuite_suggest_report` | `reports:read` | No | Clinical AI report structure suggestion |
| `radsuite_generate_differential` | `knowledge:read` | No | Differential diagnosis generator |
| `radsuite_anatomy_lookup` | `knowledge:read` | No | eAnatomy atlas cross-sectional search |
| `radsuite_radiopaedia_search` | `knowledge:read` | No | Radiopaedia reference cases lookup |
| `radsuite_pacs_cfind` | `pacs:query` | No | Hospital PACS DICOM C-FIND query |
| `radsuite_pacs_ping` | `pacs:query` | No | DICOM C-ECHO & TCP latency test |
| `radsuite_system_health` | `system:read` | No | Server status, DB dialect & telemetry |
