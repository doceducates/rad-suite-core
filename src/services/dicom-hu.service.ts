/**
 * Clinical Hounsfield Unit (HU) Calculation & Tissue Density Analysis Service
 * Verified according to Radiopaedia Reference Standards
 */

export interface TissueClassification {
  label: string;
  category: 'air' | 'lung' | 'fat' | 'fluid' | 'soft' | 'blood' | 'contrast' | 'bone';
  color: string;
}

export function calculateHu(raw: number, slope: number = 1, intercept: number = 0): number {
  return Math.round(raw * slope + intercept);
}

export function classifyTissue(hu: number, modality: string = 'CT'): TissueClassification {
  if (modality.toUpperCase() === 'MR' || modality.toUpperCase() === 'MRI') {
    return { label: 'MRI Signal Intensity', category: 'soft', color: '#8ecf9e' };
  }

  if (hu <= -800) {
    return { label: 'Air / Gas', category: 'air', color: '#9ca3af' };
  }
  if (hu < -300) {
    return { label: 'Lung Parenchyma', category: 'lung', color: '#67e8f9' };
  }
  if (hu >= -140 && hu <= -30) {
    return { label: 'Fat / Adipose', category: 'fat', color: '#fde047' };
  }
  if (hu > -30 && hu <= 15) {
    return { label: 'Water / CSF / Simple Fluid', category: 'fluid', color: '#60a5fa' };
  }
  if (hu > 15 && hu <= 45) {
    return { label: 'Soft Tissue / Muscle', category: 'soft', color: '#4ade80' };
  }
  if (hu > 45 && hu <= 85) {
    return { label: 'Acute Blood / Hematoma', category: 'blood', color: '#f87171' };
  }
  if (hu > 85 && hu <= 350) {
    return { label: 'Contrast / Trabecular Bone', category: 'contrast', color: '#fb923c' };
  }
  return { label: 'Cortical Bone / Dense Calc', category: 'bone', color: '#ffffff' };
}

export function samplePixelValue(
  canvasX: number,
  canvasY: number,
  canvasW: number,
  canvasH: number,
  pixelData: Int16Array | Uint16Array | Uint8Array,
  columns: number,
  rows: number,
  slope: number = 1,
  intercept: number = 0,
  modality: string = 'CT'
): { hu: number; raw: number; tissue: TissueClassification; px: number; py: number } | null {
  if (!pixelData || canvasW <= 0 || canvasH <= 0 || columns <= 0 || rows <= 0) return null;

  const px = Math.floor((canvasX / canvasW) * columns);
  const py = Math.floor((canvasY / canvasH) * rows);

  if (px < 0 || px >= columns || py < 0 || py >= rows) return null;

  const idx = py * columns + px;
  const raw = pixelData[idx];
  if (raw === undefined) return null;

  const hu = calculateHu(raw, slope, intercept);
  const tissue = classifyTissue(hu, modality);

  return { hu, raw, tissue, px, py };
}

export function calculateLineHuStats(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pixelData: Int16Array | Uint16Array | Uint8Array,
  columns: number,
  rows: number,
  slope: number = 1,
  intercept: number = 0
): { min: number; max: number; mean: number } | null {
  if (!pixelData || columns <= 0 || rows <= 0) return null;

  const steps = Math.max(10, Math.round(Math.hypot(x2 - x1, y2 - y1)));
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let count = 0;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(x1 + t * (x2 - x1));
    const py = Math.round(y1 + t * (y2 - y1));

    if (px >= 0 && px < columns && py >= 0 && py < rows) {
      const raw = pixelData[py * columns + px];
      const hu = calculateHu(raw, slope, intercept);
      sum += hu;
      if (hu < min) min = hu;
      if (hu > max) max = hu;
      count++;
    }
  }

  if (count === 0) return null;
  return {
    min: Math.round(min),
    max: Math.round(max),
    mean: Math.round(sum / count),
  };
}
