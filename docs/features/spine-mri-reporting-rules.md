# Spine MRI Reporting Standards & Resident Workflow Specification

This document establishes the canonical reporting rules, medicolegal terminology standards, and impression synthesis patterns for MRI spine studies in Rad Suite.

---

## 1. Resident / PGR Workflow & Status Invariant
- **Drafting State**: All resident-generated and transcribed reports MUST be saved with `status: 'preliminary'` (or `'draft'`) and associated study `status: 'in_progress'`.
- **Zero Premature Finalization**: Never set a report to `'final'` or study to `'reported'` during preliminary transcription. Finalization is reserved for formal consultant sign-off.

---

## 2. Mandatory Medicolegal Extraspinal & Soft Tissue Section
- Every lumbar/spine MRI report MUST conclude its Findings with a dedicated **Extraspinal & Soft Tissues** bullet.
- **Defensive & Field-of-View Protected Terminology**: Because spinal scans utilize narrow fields of view, never state absolute negatives like "normal pelvis" or "normal sacroiliac joints". Use protective gross terminology:
  ```html
  <li><p><strong>Extraspinal &amp; Soft Tissues:</strong> Within the limits of the field of view, no gross extraspinal abnormality or soft tissue collection is identified. Partially visualized sacroiliac joints, pelvic structures, and retroperitoneum reveal no obvious gross signal abnormality or suspicious mass lesion on this examination.</p></li>
  ```

---

## 3. High-Yield "Consultant Summary" Impression Standard (Option 4 / Option 2)
Referring surgeons and hospital consultants require rapid, punchy takeaways. Long sprawling paragraphs repeating the findings are strictly forbidden.
- **Structure**:
  - **Bullet 1 (Primary Compressive Pathology)**: A single consolidated, high-yield sentence combining all surgical/compressive levels, specific nerve roots impinged (traversing vs. exiting), annular tears, and severe canal/recess stenosis, on a background of degenerative spondylosis.
  - **Bullet 2 (Distinct Secondary Finding - If present)**: Hemangioma, active fracture, focal marrow edema, or acute discitis.
- **Impression Invariants**:
  1. **Zero Redundant "Details as Cited Above" Filler**: Do NOT routinely append `(details as cited above)`. State the diagnosis cleanly and directly. Only reference detailed descriptions if the pathology has complex multi-level comminution, infection, or extensive measurements.
  2. **Cervical Spondylosis Terminology**: In cervical spine reports, always describe degenerative disc bulges as **diffuse disc-osteophyte bulges** (or **disc-osteophytic bulges**).
  3. **No Millimeter Measurements in Impression**: Keep raw AP measurements (e.g. `11 mm`, `6.3 mm`) strictly in the Findings section.
  4. **No Modic Changes in Impression**: Modic type 1/2 changes remain strictly in Findings.
  5. **Zero Boilerplate Advice**: Do NOT add generic filler (e.g. *"Clinical and neurological correlation is advised"*). Only add crisp, targeted advice for critical surgical emergencies (e.g. acute cord compression, progressive myelopathy, Pott's spine).

---

## 4. Resident Sign-Off Invariant
- Every report must conclude with:
  ```html
  <p><strong>Reported by: </strong><em>Dr. Jane Doe (Resident Radiologist)</em></p>
  ```
