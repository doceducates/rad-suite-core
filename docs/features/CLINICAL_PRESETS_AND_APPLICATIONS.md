# Clinical Presets, Dynamic MR Auto-Windowing & Clinical Applications

## 1. Root Cause Analysis: The Ayesha Usman Case (MRI L/S Spine)

### The Diagnostic Problem
When opening case `AYESHA USMAN` (`312024-0115249`, Accession `192610003966`), images appeared severely distorted, washed out, or completely pitch black across all presets.

### Technical Investigation Findings
1. **14-Bit Sensor Dynamic Range**:
   - The scanner produced 14-bit integer MR data where voxel intensities ranged up to **16,383** (mean ~1,290, P99 ~10,800).
   - In the DICOM header tags `(0028,1050)` and `(0028,1051)`, the scanner wrote `WC = 8191.5, WW = 16383.0` (merely reporting the full unscaled sensor range).
2. **Fixed Preset Mismatch**:
   - Fixed CT presets like `Soft Tissue (40/400)` or hardcoded MRI numbers like `450/800` set the upper cutoff at 850.
   - Because MRI tissue in T2 and STIR sequences is predominantly > 1,000, 99% of the pixels saturated into **pure blinding white (255)**.
   - When falling back to the raw header range `(8192/16384)`, the tissue appeared as a faint dark gray silhouette because diagnostic tissue occupies only the bottom 15% of that span.

### The Vitrea Solution: Sub-Millisecond Adaptive Auto-Windowing
Ported from Vitrea's `window_presets.py`:
1. Sub-millisecond voxel sampling across the slice with coprime odd striding to prevent spatial aliasing.
2. Background air / scanner noise floor thresholding: `floor = minVal + 0.025 * (maxVal - minVal)`.
3. Sequence-adaptive tissue percentile bounds:
   - **STIR / T2_FS / PDFS**: Full Stored Range (`WC = max / 2, WW = max`) preserving marrow edema and CSF hyperintensity without white clipping.
   - **T2 Weighted**: `win_lo = max(minVal, P2)`, `win_hi = P92` -> provides crisp spinal cord, thecal sac, and vertebral disc contrast (`WC ~ 3921, WW ~ 7246`).
   - **T1 Weighted**: `win_lo = max(minVal, P2)`, `win_hi = P94` -> highlights vertebral marrow trabeculae and epidural fat (`WC ~ 2381, WW ~ 4386`).
   - **FLAIR / DWI / ADC / GRE**: Calibrated to respective neuro-pathological tissue contrast targets.

---

## 2. Clinical Applications Catalog & Dispatcher

Vitrea clinical applications are now integrated into `rad-suite-core` via [`clinical-applications.service.ts`](file:///D:/Projects/Rad-Reporting/rad-suite-core/src/services/clinical-applications.service.ts) and the [`VitreaApplicationSelector`](file:///D:/Projects/Rad-Reporting/rad-suite-core/src/components/workstation/vitrea-application-selector.tsx).

### A. MR Applications
| ID | Application | Protocol | Default Layout | Clinical Purpose |
| :--- | :--- | :--- | :---: | :--- |
| `mr_msk` | **MR Spine & Joints** | Musculoskeletal MR | 2×2 | Spine, knee, hip, shoulder; synchronized sequence comparing. |
| `mr_mmv` | **Multi-Sequence MR (MMV)** | Multi-Modality Review | 2×2 | Side-by-side 4-up comparison with crosshair link. |
| `mr_neuro` | **MR Neuro / Brain** | Brain MR | 2×2 | Multiparametric brain examination (FLAIR, DWI, T1). |
| `mr_vascular` | **MR Vascular (MRA/MRV)** | Vascular MR | 1×2 (3D) | Intracranial TOF MR angiography with 3D MIP. |
| `mr_prostate` | **MR Prostate (PI-RADS)** | Prostate MR | 2×2 | PI-RADS v2.1 multiparametric prostate review. |
| `mr_generic` | **General MR Review** | General MR | 1×1 | Standard 2D diagnostic review with cine scrubbing. |

### B. CT Applications
| ID | Application | Protocol | Default Layout | Clinical Purpose |
| :--- | :--- | :--- | :---: | :--- |
| `ct_lung` | **CT Lung & Thorax** | Thoracic CT | 1×2 | High-resolution pulmonary parenchyma, nodules, airway. |
| `ct_stroke` | **CT Brain & Stroke** | Neuro CT | 1×1 | Hyperacute ischemia, insular ribbon loss, dense MCA. |
| `ct_cardiac` | **Cardiac Calcium Score** | Cardiac CT | 1×2 | ECG-gated Agatston calcium scoring (LAD, LCx, RCA). |
| `ct_aorta` | **CT Aorta & EVSP** | Vascular CT | 2×2 (3D) | Aortic aneurysm, centerline lumen tracing, stent sizing. |
| `ct_colon` | **CT Virtual Colonoscopy** | Abdominal CT | 1×2 (3D) | 3D fly-through, polyp segmentation, mucosal unfolded map. |
| `ct_temporal` | **CT Temporal Bone** | ENT CT | 1×1 | Sub-millimeter ossicular chain and inner ear cochlea. |
| `ct_generic` | **General CT Review** | General CT | 1×1 | Standard CT review with instant soft/bone/lung switching. |

### C. Core & Multi-Modality Applications
| ID | Application | Protocol | Default Layout | Clinical Purpose |
| :--- | :--- | :--- | :---: | :--- |
| `vitrea_3d_mpr` | **Vitrea 3D MPR / VRT** | Volumetric Reconstruct | 2×2 | True physical orthogonal MPR and 3D Volume Rendering. |
| `vitrea_gallery` | **Montage / Lightbox** | Multi-Image Gallery | 3×3 | Overview montage of all slices across sequences. |
| `xa_dsa` | **Digital Subtraction (DSA)** | Fluoroscopy / Angio | 1×1 | Mask subtraction, roadmapping, vessel caliber. |
| `pet_ct_fusion` | **PET/CT Fusion** | Nuclear Fusion | 1×2 | Metabolic SUV heatmap fused over anatomic CT volume. |

---

## 3. Auto-Detection Dispatcher Rules

The workstation now automatically analyzes incoming studies upon opening:
1. **MR Spine / Joints**: Studies matching `/SPINE|LSS|LS|L\/S|LUMBAR|CERVICAL|KNEE|SHOULDER|HIP/i` automatically default to `MRMusculoskeletal` (2×2 multi-sequence layout) with auto-windowing applied to each pane.
2. **CT Thoracic / Chest**: Automatically defaults to `CTLungAnalysis` with `Lung (-600/1500)` preset.
3. **CT Brain / Emergency**: Automatically defaults to `CTBrainStroke` with `Brain (40/80)` and `Stroke (30/30)` presets.
4. **Cardiovascular / Calcium**: Automatically defaults to `CTCardiacVScore`.
