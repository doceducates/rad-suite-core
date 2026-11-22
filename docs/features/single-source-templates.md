# Single Source of Truth Template Service & Official HMIS Catalog

This document details the Single Source of Truth Template Service for Rad Suite, its modular architecture, Option B clean clinical paragraph formatting, intelligent contrast/non-contrast study differentiation, and the complete catalog of 21 CT and 40 MRI official institutional templates (61 total).

---

## 1. Architectural Overview & Design Invariants

Prior to this implementation, template storage in Rad Suite was fragmented across:
1. Hardcoded modal maps (`worklist-templates.ts`)
2. Synthetic/condensed AI datasets (`ct-mri-templates.ts`)
3. Punjab HMIS legacy ID mappings

The new architecture unifies all reporting workflows onto a centralized **Template Service** (`src/services/template-manager.service.ts`) fed by modular catalog data files in `src/services/templates/`.

### Key Architectural Principles:
1. **Preservation of Authentic Consultant Phrasing (Option B)**:
   - Preserves 100% of the authentic PGMI / LGH / Ameer-Ud-Din Medical College consultant wording from `CT_Templates.md` and `MRI_Templates.md`.
   - Formatted as clean, flowing clinical paragraphs (`\n\n` separation) with typos, placeholders (`[X]`), and redundant tags stripped.
2. **Clinical Contrast Separation (CECT / CEMRI vs Plain / Trauma)**:
   - Non-contrast studies (e.g. Call-On-Duty trauma CT brain, plain MRI brain/spine) are strictly isolated from contrast studies.
   - Non-contrast templates never make unverified claims regarding "post-contrast enhancing lesions" or "leptomeningeal enhancement".
   - Contrast studies (`ct-brain-cect`, `mri-brain-contrast`, `mri-cervical-spine-contrast`, `mri-lumbar-spine-contrast`) include dedicated IV contrast technique, enhancement evaluation, and post-contrast impressions.
3. **Strict File Size Compliance (Rule 1)**:
   - Templates are partitioned across 8 focused domain files, each well under 250 lines (maximum limit: 350 lines).
4. **Universal Consumer Integration**:
   - The same single source of truth powers:
     - **Quick Report Modal** (`worklist-report-modal-body.tsx`): Modality-aware quick pills + full catalog dropdown.
     - **Zen Workstation Editor** (`zen-template-selector.tsx`): Full modality catalog with search and custom user templates.
     - **Template Selector Modal** (`template-selector-modal.tsx`): Cross-sectional browser.
     - **Quick Template Bar** (`quick-template-bar.tsx`): High-volume diagnostic shortcuts.
     - **Official Printout & Export Engine** (`lgh-report-sheet.tsx`, `report-export-docx.service.ts`).

---

## 2. Catalog Index & File Layout

```
src/services/templates/
├── catalog-ct-neuro.data.ts       (8 Neuro / Head & Neck CT templates: Plain, CECT, Orbits, Neck, Facial, PNS, Temporal, Face)
├── catalog-ct-body.data.ts        (7 Thoracic, Abdominal, Pelvic, and KUB CT templates)
├── catalog-ct-vasc-spine.data.ts  (6 Spine and Angiography CT templates)
├── catalog-mri-neuro.data.ts      (10 Brain Plain, Brain Contrast, Stroke/DWI, MRA, MRV, MRS, Orbits, Neck, Face, Temporal)
├── catalog-mri-spine.data.ts      (7 Cervical Plain/Contrast, Thoracic, Lumbar Plain/Contrast, Whole Spine, Brachial)
├── catalog-mri-msk-upper.data.ts  (7 Shoulder, Humerus, Elbow, Forearm, Wrist, Hand, Limb)
├── catalog-mri-msk-lower.data.ts  (7 Hip, Femur, Knee, Tibia/Fibula, Foot/Ankle, Foot, SI)
├── catalog-mri-body.data.ts       (9 MRCP, Abdomen & Pelvis, Pelvis F/M, Enterography, Breast, Fistula, PNS)
└── catalog.data.ts                (Master aggregator, bidirectional alias resolver)
```

### Complete Inventory (61 Total):
- **CT Templates (21 total)**:
  - Neuro / Head & Neck: CT Brain (Plain/Trauma), CT Brain (CECT / Contrast-Enhanced), CT Orbits, CT Neck (CECT), CT Facial Bones, CT PNS, HRCT Temporal Bones, CT Face.
  - Thorax & Abdomen: CT Chest (Routine/CECT), HRCT Chest (Plain), CT Abdomen & Pelvis (CECT), CT Pelvis (CECT), CT KUB without Contrast (Plain), CT Renal Protocol (3-Phase), CT Renal Angiography (Donor Evaluation).
  - Spine & Vascular: CT Cervical Spine, CT Lumbar Spine, CT Pulmonary Angiography (CTPA), CT Angiography Abdomen, CT Angiography Upper Limb, CT Angiography Lower Limb.
- **MRI Templates (40 total)**:
  - Neuro / Head & Neck: MRI Brain (Plain), MRI Brain (Contrast-Enhanced), MRI Brain (Stroke/DWI), MRA Brain, MRV Brain, MR Spectroscopy of Brain, MRI Orbits, MRI Neck, MRI Face, MRI Temporal Bones.
  - Spine: MRI Cervical Spine (Plain), MRI Cervical Spine (Contrast), MRI Thoracic Spine, MRI Lumbar Spine (Plain), MRI Lumbar Spine (Contrast), MRI Whole Spine, MRI Brachial Plexus.
  - MSK Upper: MRI Shoulder, MRI Humerus, MRI Elbow, MRI Forearm, MRI Wrist, MRI Hand, MRI Upper Limb.
  - MSK Lower: MRI Hip, MRI Femur, MRI Knee, MRI Tibia/Fibula, MRI Foot & Ankle, MRI Foot, MRI Sacroiliac (SI) Joints.
  - Body & Specialized: MRCP, MRI Abdomen & Pelvis, MRI Pelvis (Female), MRI Pelvis (Male/Prostate), MRI Enterography, MRI Chest (Contrast), MRI Bilateral Breast, MRI Fistulogram (Perianal), MRI PNS.

---

## 3. Intelligent Contrast & Study Matcher

`findTemplateForStudy(modality, studyDescription)` in `src/services/template-manager.service.ts`:
- Employs `isContrastStudy(description)`:
  - **Negative Precedence**: `plain`, `without contrast`, `non-contrast`, `ncct`, `unenhanced` force plain variants.
  - **Positive Indicators**: `with contrast`, `+c`, `+contrast`, `cect`, `cemri`, `contrast enhanced`, `gadolinium`, `triphasic`, `angio`, `ctpa`.
- Automatically selects the clinically accurate template:
  - `CT BRAIN PLAIN` / `COD TRAUMA` → `ct-brain-plain` (no false post-contrast claims)
  - `CECT BRAIN` / `CT BRAIN WITH CONTRAST` → `ct-brain-cect` (dedicated IV contrast evaluation)
  - `MRI BRAIN ROUTINE` → `mri-brain-plain`
  - `CEMRI BRAIN` / `MRI BRAIN + C` → `mri-brain-contrast`
  - `HRCT THORAX` → `ct-hrct-chest`
  - `CT CHEST WITH CONTRAST` → `ct-chest-cect`
  - `CT KUB` → `ct-kub-plain`
  - `MRCP` → `mrcp`

---

## 4. Verification & Integrity Auditing

- **Automated Test Suite**: `src/services/__tests__/unified-templates-catalog.test.ts`
  - Validates full 61-template count (21 CT + 40 MRI).
  - Confirms purge of patient-specific artifacts, placeholders (`[X]`), and typos.
  - Validates bidirectional alias mappings.
  - Validates plain vs. contrast study matching and clinical statement isolation.
  - Validates bold anatomical subheadings in all 61 templates rendered by `findingsListToHtml`.

---

## 5. Standard Anatomical Subheadings & Rich Text Rendering

To ensure diagnostic precision and readability:
1. **Bold Anatomical Subheadings**:
   - Every template's findings are tagged with standardized colon-terminated anatomical headings:
     - E.g. `Kidneys:`, `Ureters:`, `Urinary Bladder:`, `Brain Parenchyma:`, `Ventricular System:`, `Spinal Cord & Canal:`, `Vertebral Bodies & Marrow:`.
   - 100% of the authentic consultant sentences are retained after each anatomical colon prefix.
2. **Lossless Multi-Platform Parity**:
   - `findingsListToHtml` in `src/lib/clinical-format.ts` renders lines starting with `^([^:\n]{2,60}:)` into `<p><strong>Subheading:</strong> content...</p>`.
   - Renders cleanly in TipTap rich-text editor, Zen Workstation, Quick Report Modal, Official Printout Sheet (`lgh-report-sheet.tsx`), PDF, and DOCX exports.
   - Textareas and clipboard copiers receive clean plaintext without unsightly orphaned tags.
