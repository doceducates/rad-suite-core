/**
 * Transfer Function & LUT Engine (<200 lines).
 * Generates 256-sample RGBA transfer function arrays from Vitrea LUT control points
 * for WebGL2 3D Gradient-Illuminated Rendering (GIR).
 */

export interface LutControlPoint {
  v: number;
  r?: number;
  g?: number;
  b?: number;
  a?: number;
}

export interface LutDataset {
  name: string;
  window: number;
  level: number;
  colors: { v: number; r: number; g: number; b: number }[];
  opacities: { v: number; a: number }[];
}

export const CLINICAL_FALLBACK_LUTS: Record<string, LutDataset> = {
  abdominal: {
    name: 'Abdominal Soft Tissue',
    window: 240,
    level: 200,
    colors: [
      { v: 0.0, r: 0.06, g: 0.0, b: 0.0 },
      { v: 0.09, r: 0.75, g: 0.0, b: 0.0 },
      { v: 0.17, r: 0.73, g: 0.29, b: 0.02 },
      { v: 0.39, r: 0.97, g: 0.57, b: 0.23 },
      { v: 0.52, r: 1.0, g: 0.84, b: 0.21 },
      { v: 1.0, r: 1.0, g: 0.97, b: 0.92 },
    ],
    opacities: [
      { v: 0.0, a: 0.0 },
      { v: 0.1, a: 0.02 },
      { v: 0.25, a: 0.15 },
      { v: 0.45, a: 0.4 },
      { v: 1.0, a: 0.85 },
    ],
  },
  bone: {
    name: 'Vitrea Bone White',
    window: 2000,
    level: 400,
    colors: [
      { v: 0.0, r: 0.2, g: 0.15, b: 0.1 },
      { v: 0.3, r: 0.85, g: 0.75, b: 0.65 },
      { v: 0.7, r: 0.95, g: 0.92, b: 0.88 },
      { v: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
    opacities: [
      { v: 0.0, a: 0.0 },
      { v: 0.25, a: 0.0 },
      { v: 0.35, a: 0.2 },
      { v: 0.6, a: 0.7 },
      { v: 1.0, a: 0.95 },
    ],
  },
  vessel: {
    name: 'Vessel Calcium Angio',
    window: 600,
    level: 150,
    colors: [
      { v: 0.0, r: 0.1, g: 0.0, b: 0.0 },
      { v: 0.2, r: 0.8, g: 0.05, b: 0.05 },
      { v: 0.45, r: 1.0, g: 0.35, b: 0.1 },
      { v: 0.7, r: 1.0, g: 0.9, b: 0.4 },
      { v: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
    opacities: [
      { v: 0.0, a: 0.0 },
      { v: 0.15, a: 0.0 },
      { v: 0.25, a: 0.35 },
      { v: 0.55, a: 0.75 },
      { v: 1.0, a: 0.9 },
    ],
  },
  lung: {
    name: 'Pulmonary Parenchyma',
    window: 1500,
    level: -600,
    colors: [
      { v: 0.0, r: 0.0, g: 0.15, b: 0.3 },
      { v: 0.3, r: 0.2, g: 0.45, b: 0.7 },
      { v: 0.6, r: 0.8, g: 0.7, b: 0.6 },
      { v: 1.0, r: 1.0, g: 0.95, b: 0.9 },
    ],
    opacities: [
      { v: 0.0, a: 0.0 },
      { v: 0.1, a: 0.15 },
      { v: 0.35, a: 0.4 },
      { v: 0.7, a: 0.05 },
      { v: 1.0, a: 0.8 },
    ],
  },
};

function interpolate(pts: any[], t: number, key: string): number {
  if (!pts || pts.length === 0) return 0;
  if (t <= pts[0].v) return pts[0][key];
  if (t >= pts[pts.length - 1].v) return pts[pts.length - 1][key];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    if (t >= p0.v && t <= p1.v) {
      const span = p1.v - p0.v;
      const f = span > 1e-6 ? (t - p0.v) / span : 0;
      return p0[key] + f * (p1[key] - p0[key]);
    }
  }
  return pts[pts.length - 1][key];
}

export function buildLutTable(lutData?: LutDataset, samples = 256): Uint8Array {
  const table = new Uint8Array(samples * 4);
  const colors = lutData?.colors || CLINICAL_FALLBACK_LUTS.abdominal.colors;
  const opacities = lutData?.opacities || CLINICAL_FALLBACK_LUTS.abdominal.opacities;

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const r = interpolate(colors, t, 'r');
    const g = interpolate(colors, t, 'g');
    const b = interpolate(colors, t, 'b');
    const a = interpolate(opacities, t, 'a');

    const offset = i * 4;
    table[offset] = Math.max(0, Math.min(255, Math.round(r * 255)));
    table[offset + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
    table[offset + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    table[offset + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
  return table;
}
