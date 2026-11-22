# Vitrea 3D Volume Rendering & Gradient-Illuminated Rendering (GIR)

## 1. Overview & Physics Foundation
The 3D volume rendering pipeline in **Rad Suite Core** implements clinical-grade **Gradient-Illuminated Rendering (GIR)** with Blinn-Phong specular highlights, 6-tap central difference gradient normals, stochastic ray jittering, and early ray termination.

- **Vertex Shader**: Local cube space unprojection `(inverse(modelMatrix) * cameraPosition)`.
- **Fragment Shader**: 256-step front-to-back alpha compositing with optical opacity correction.
- **Physical Surface Normals**: 6-tap central difference on density gradient:
  $$\mathbf{N} = \text{normalize}\left(-\nabla f(\mathbf{x})\right) = -\text{normalize}\left(\begin{bmatrix} f(x+\Delta x) - f(x-\Delta x) \\ f(y+\Delta y) - f(y-\Delta y) \\ f(z+\Delta z) - f(z-\Delta z) \end{bmatrix}\right)$$
- **Specular Shading**: Blinn-Phong half-angle formula $\mathbf{H} = \text{normalize}(\mathbf{L} + \mathbf{V})$ yielding realistic specular highlights on dense bone and iodinated vascular contrast.

---

## 2. Vitrea Clinical 3D Presets

| Preset | Mode | Window/Level | Visual Characteristics |
| :--- | :--- | :--- | :--- |
| **Bone White** | 1 (VRT GIR) | 2000 / 400 | Cortical bone with high specular highlights and amber trabecular transitions |
| **Vascular Angio** | 3 (VRT GIR) | 600 / 150 | Iodinated contrast enhancement for aneurysm, aorta, and carotid TOF |
| **Abdominal** | 4 (VRT GIR) | 240 / 200 | Soft tissue parenchymal differentiation (liver, spleen, kidneys) |
| **Pulmonary Lung** | 5 (VRT GIR) | 1500 / -600 | High-contrast bronchial tree and pulmonary parenchymal detail |
| **Neuro / Brain** | 2 (VRT GIR) | 80 / 40 | Cerebral parenchyma, gray/white matter boundaries, and ventricles |
| **MIP** | 0 (Projection) | Dynamic W/L | Maximum Intensity Projection for vessel tracking and dense nodules |

---

## 3. Performance & Quality Guarantees
1. **Stochastic Ray Jittering**:
   - Randomizes ray entry points per pixel via pseudo-random hash, eliminating woodgrain slicing artifacts at zero performance cost.
2. **Early Ray Termination**:
   - Marches until `accumColor.a >= 0.98`, skipping occluded voxels and delivering 60–120 FPS during interactive 3D rotation.
3. **Physical Aspect Ratio Preservation**:
   - Real DICOM `PixelSpacing` and `SliceThickness` dictate bounding box dimensions so patient anatomy is never squashed or distorted.
