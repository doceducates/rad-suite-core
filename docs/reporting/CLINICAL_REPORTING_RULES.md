# CLINICAL_REPORTING_RULES.md — Rad Suite Clinical Reporting Standard & Synthesis Contract

> **Authoritative Specification**: Governs all automated and manual clinical report generation in Rad Suite Core for Lahore General Hospital (LGH) and Punjab HMIS.
> Every developer, reporting radiologist, and AI agent MUST strictly follow these clinical invariants.

---

## 1. The Official Two-Heading Template Architecture

The official hospital reporting format is streamlined for rapid clinical review, clear communication, and ease of editing.

### Required Document Structure:
```html
<h3><strong>Technique</strong></h3>
<p>[Standard multisequence multiplanar imaging protocol]</p>

<h3><strong>Findings</strong></h3>
<ul>
  <li><p>[Narrative bullet 1]</p></li>
  <li><p>[Narrative bullet 2]</p></li>
  ...
</ul>
```

### Strict Formatting Invariants:
1. **Only Two Main Headings Allowed**:
   * `<h3><strong>Technique</strong></h3>`
   * `<h3><strong>Findings</strong></h3>`
2. **Absolute Ban on Internal Subheadings in Findings**:
   * Do NOT use category headers like `<h4>Alignment</h4>` or `<h3>Soft Tissues</h3>`.
   * Do NOT prefix bullets with category labels like `<li><p><strong>Spinal Curvature & Alignment:</strong> ...</p></li>` or `<li><p><strong>Paraspinal Soft Tissues:</strong> ...</p></li>`.
3. **Pure Bulleted Narrative**:
   * Every anatomical level or region is described directly as a flat bullet item (`<li><p>...</p></li>`).
   * **Inline Bolding**: Bold important clinical findings, abnormal discs, tears, nerve root compressions, or acute lesions directly within the sentence.
   * **Level Identifiers**: Disc levels are identified cleanly (e.g. `<strong>L4–L5:</strong> Demonstrates a diffuse disc bulge...`).

---

## 2. Impression Synthesis Contract (The Consultant Rule)

The **Impression** is an executive clinical synthesis for the treating surgeon or physician, **NOT a duplicate copy of the Findings**.

### Invariants for Impression Drafting:
1. **Length Limit**: Maximum **1 to 2 concise bullet points** (at most 3 for complex multi-compartment polytrauma or concurrent systemic pathologies).
2. **The Subsumption Rule**:
   * Disc desiccation, marginal osteophytes, minor facet arthrosis, and mild non-compressive bulges are standard components of degeneration.
   * **Never list them as separate bullet points.**
   * Subsume them completely under the primary umbrella diagnosis: `Lumbar spondylotic changes with disc bulges...` or `Cervical spondylosis...`.
3. **The Dominance Rule (Clinical Relevance Only)**:
   * Highlight **only the clinically significant, compressive, or surgical levels** (e.g., `more marked at L4–L5 with annular tear and traversing root compression`).
   * Do NOT list upper minor levels (e.g., L1–L2 or L2–L3 thecal indentations) in the impression when high-grade lower stenosis or root compression is present.
4. **Zero Measurements**:
   * Do NOT include millimeter measurements, canal AP dimensions, or clock positions (e.g., 6 o'clock) in the impression. Those belong strictly in the Findings.
5. **No Separate Normal Bullet**:
   * Do not write "Remaining levels are normal" in the impression.

---

## 3. Age-Gated Diagnostic Rules & Age Verification Invariant

To avoid inaccurate medical records, diagnostic terminology must be strictly age-appropriate:

| Patient Age | Terminology Invariant | Allowed Diagnoses | Forbidden Diagnoses |
|:---|:---|:---|:---|
| **Age < 30 Years** | **Zero "Spondylosis" Wording** | • *Mild non-compressive disc bulges*<br>• *Multilevel Schmorl's nodes*<br>• *Straightening secondary to muscular spasm* | ❌ *Spondylosis*<br>❌ *Spondylotic changes*<br>❌ *Degenerative disc disease* |
| **Age 30–39 Years** | **Conservative Framing** | • *Disc bulges with annular tear*<br>• *Early degenerative disc changes* | ❌ Generalized advanced spondylosis (unless marked osteophytes present) |
| **Age ≥ 40 Years** | **Standard Degenerative Framing** | • *Lumbar / Cervical spondylotic changes*<br>• *Lumbar canal stenosis* | — |

### DICOM Header Age Fallibility & Verification Invariant:
* **Console Mistype Fallibility**: Hospital registration and MRI/CT scanner consoles often contain mistyped ages (e.g., typing `011Y` instead of `027Y`, or defaulting to `030Y`).
* **Never Blindly Trust DICOM Age**: The AI must **never rely solely on the DICOM series tag (`0010,1010`)**.
* **Clinical Discordance Checking**: If pathology or skeletal anatomy is discordant with the stated age (e.g., severe degenerative disc disease, annular fissures, or mature adult epiphyseal fusion in a patient registered as pediatric/child), the AI MUST cross-verify against the radiologist's dictation and clinical history rather than blindly propagating the scanner tag.
* **Radiologist Dictation Takes Precedence**: Whenever the radiologist dictates or corrects a patient's age (e.g. Tanveer is 27, not 11), the radiologist's stated age immediately overrides the DICOM tag and updates the database record.

---

## 4. Voice Transcription Discrepancy Gate & Clinical Safety Protocols

Because clinical reports are dictated via voice transcription, acoustical distortions, homophones, or accidental repetitions can occur. The AI agent MUST act as a rigorous safety firewall:

### A. The Repetition & Conflict Gate:
1. **Repeated Anatomical Levels**:
   * If a level or structure is dictated more than once in the same turn (e.g., L4–L5 dictated as a mild bulge, and then later as bilateral recess obliteration with root compression):
   * **Rule 1 (Sequential Upgrade)**: If the radiologist was clearly refining or upgrading their observation (e.g. reviewing axial slices after sagitals), the AI applies the higher-grade finding AND explicitly logs:
     `⚠️ Clarification Applied: Level L4–L5 was upgraded to recess obliteration and root compression per your second dictation.`
   * **Rule 2 (Ambiguous or Contradictory Dictation)**: If two mutually exclusive findings are stated without clear progression, or if anatomical sides/structures are confused (e.g. dictating "posterior cruciate" twice when meaning anterior and posterior):
     * The AI **MUST NOT guess or silently invert findings**.
     * The AI **MUST stop and ask the radiologist** to clarify the discrepancy before saving to the database.

### B. Prominent Logging of Auto-Fixed Transcription Typos:
Whenever the AI repairs common speech-to-text slips (e.g., "undentation" -> "indentation", "wihtout" -> "without", "edema signals at D10" -> "D10 bone marrow edema"), the AI MUST explicitly display a small note at the bottom of the response:
`📝 Transcription Polish: Fixed [typo] -> [corrected medical term].`

### C. Automated Critical Findings Protocol (AI-Flagged Siren & Tooltip):
* **Automated AI Detection**: Critical findings are **automatically detected and flagged by the AI** (never requiring manual tagging by the radiologist during busy reporting shifts).
* **Qualifying Acute / Surgical Findings**:
  * Acute spinal cord compression, myelopathy, or low-lying conus compression
  * Cauda equina syndrome
  * Acute unstable fracture, dislocation, or vertebral burst
  * Complete tendon or ligament disruption (e.g. complete PCL/ACL tear, patellar tendon rupture)
  * Intracranial hemorrhage, acute territorial stroke, midline shift, or herniation
  * Active epidural abscess, collection, or hematoma
* **Display Format**: Instead of a disruptive multi-line banner, display a clean siren emoji with hover tooltip details:
  * In HTML/Markdown: `<span title="🚨 Critical Finding: [Details of lesion and urgent consideration]">🚨</span>`
  * Inline next to the Impression title or relevant finding. Hovering over the siren emoji reveals the exact critical pathology identified by the AI.
* **Database Invariant**: When saving to `radsuite.db`, the AI automatically sets `critical_finding = 1` and `priority = 'stat'` so the workstation UI displays the pulsing alert indicator and urgency filters.

---

## 5. The 3 Supported Template & Reporting Styles in Rad Suite

Rad Suite Core supports 3 distinct reporting paradigms managed by `@/services/template-style-engine.service.ts`:

### Style 1: `pure_bullets` (Official LGH / Hospital Standard)
* **What it is**: Flat, level-by-level bullet list under Technique and Findings.
* **Best for**: Routine clinical workstation reporting, Punjab HMIS copy-paste, and consultant sign-out.
* **Characteristics**: Zero category subheadings, bolded abnormalities, ultra-fast scanning.

### Style 2: `categorized_headings` (Academic / RSNA Standard)
* **What it is**: Narrative prose paragraphs with titled section leads (`<p><strong>Brain Parenchyma:</strong> ...</p>`).
* **Best for**: Comprehensive cross-sectional oncologic staging, complex Abdominal/Pelvic CT, and academic teaching files.

### Style 3: `slot_template` (Intelligent Slot-Merge Engine)
* **What it is**: Organ-specific slots (`OrganSlot`) managed by `slot-template.service.ts`.
* **Best for**: Structured dictation where abnormal organ descriptions automatically replace normal defaults while suppressing redundant normal text.

---

## 5. Golden Master Baseline Templates

### A. MRI Lumbosacral Spine (Official Style: `pure_bullets`)

#### Technique:
```html
<p>Multiplanar multisequence MRI of the lumbosacral spine was performed without intravenous contrast administration including Sagittal T1, Sagittal T2, Sagittal STIR, Axial T1, and Axial T2 sequences.</p>
```

#### Normal Findings:
```html
<ul>
  <li><p>Spinal alignment and lumbar lordosis are maintained. Vertebral body heights and marrow signals are preserved throughout without fracture, collapse, or listhesis.</p></li>
  <li><p>Conus medullaris terminates normally at the L1 level with normal signal intensity. Cauda equina nerve roots are unremarkable.</p></li>
  <li><p>Intervertebral disc heights, hydration, and contours from L1 through S1 are preserved without focal disc herniation, spinal canal stenosis, or neural exit foraminal compromise.</p></li>
  <li><p>Visualized pre- and paravertebral soft tissues, psoas muscles, and sacroiliac joints are unremarkable.</p></li>
</ul>
```

#### Normal Impression:
```html
<ul>
  <li><p>Normal MRI lumbosacral spine examination.</p></li>
  <li><p>No disc herniation, spinal canal stenosis, or nerve root compression.</p></li>
</ul>
```

---

### B. MRI Brain Non-Contrast (Official Style: `pure_bullets`)

#### Technique:
```html
<p>Multiplanar multisequence MRI of the brain was performed without intravenous contrast administration including Axial T1, T2, FLAIR, DWI/ADC, T2* GRE, Coronal T2, and Sagittal T1 sequences.</p>
```

#### Normal Findings:
```html
<ul>
  <li><p>Normal cerebral parenchymal signal intensity is noted on all sequences with preserved grey–white matter differentiation. No focal intra- or extra-axial mass lesion is identified.</p></li>
  <li><p>No abnormal area of restricted diffusion is seen to suggest acute ischemic infarction.</p></li>
  <li><p>No evidence of intracranial hemorrhage, microbleeds, or superficial siderosis is seen on T2* gradient-echo sequences.</p></li>
  <li><p>The ventricular system and extra-ventricular CSF spaces are normal in size and configuration for age, with no evidence of hydrocephalus. Midline structures are central with no shift or mass effect.</p></li>
  <li><p>The posterior cranial fossa, cerebellum, brainstem, and fourth ventricle appear unremarkable. Basal cisterns are clear.</p></li>
  <li><p>Sellar, parasellar, and suprasellar regions appear unremarkable. The pituitary gland and infundibular stalk are normal.</p></li>
  <li><p>Visualized major intracranial arterial flow voids are preserved.</p></li>
  <li><p>Bilateral orbits, paranasal sinuses, and mastoid air cells appear clear.</p></li>
  <li><p>The calvarium and visualized skull base demonstrate normal bone marrow signals.</p></li>
</ul>
```

#### Normal Impression:
```html
<ul>
  <li><p>Normal MRI brain examination.</p></li>
  <li><p>No acute intracranial hemorrhage, territorial acute infarction, or space-occupying lesion.</p></li>
</ul>
```

---

### C. MRI Knee Joint (Official Style: `pure_bullets`)

#### Technique:
```html
<p>Multiplanar multisequence MRI of the knee joint was performed without intravenous contrast administration including Coronal T1, Coronal PD Fat Suppressed, Sagittal PD Fat Suppressed, Sagittal T2, and Axial PD Fat Suppressed sequences.</p>
```

#### Normal Findings:
```html
<ul>
  <li><p>The anterior cruciate ligament (ACL) and posterior cruciate ligament (PCL) are intact with normal course, caliber, and low signal intensity.</p></li>
  <li><p>The medial and lateral menisci demonstrate normal triangular morphology and low signal intensity without evidence of tear or extrusion.</p></li>
  <li><p>The medial collateral ligament (MCL) and lateral collateral ligament (LCL) complexes are intact without sprain or disruption.</p></li>
  <li><p>The extensor mechanism, including the quadriceps tendon, patellar tendon, and patellar retinacula, is intact.</p></li>
  <li><p>Articular cartilage of the femorotibial and patellofemoral compartments is preserved with no focal defect.</p></li>
  <li><p>No significant joint effusion, popliteal Baker cyst, or loose body is identified.</p></li>
  <li><p>Visualized osseous structures demonstrate preserved alignment and normal bone marrow signals without fracture or contusion.</p></li>
</ul>
```

#### Normal Impression:
```html
<ul>
  <li><p>Normal MRI knee examination.</p></li>
  <li><p>Intact cruciate ligaments, collateral ligaments, and menisci without tear or joint effusion.</p></li>
</ul>
```
