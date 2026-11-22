/**
 * OHIF & vtk.js Clinical Color Scale Engine (<250 lines).
 * Generates 256-sample RGBA lookup tables (1D textures) from standard vtk.js
 * color transfer function control points for WebGL2 GPU pseudo-coloring.
 */

export interface VtkColorPoint {
  x: number; // Normalized scalar value: 0.0 - 1.0
  r: number; // Red: 0.0 - 1.0
  g: number; // Green: 0.0 - 1.0
  b: number; // Blue: 0.0 - 1.0
}

export interface VtkColormapPreset {
  id: string;
  name: string;
  category: 'monochrome' | 'clinical' | 'perceptual' | 'fusion';
  description: string;
  points: VtkColorPoint[];
}

export const VTK_COLORMAPS: Record<string, VtkColormapPreset> = {
  grayscale: {
    id: 'grayscale',
    name: 'Grayscale',
    category: 'monochrome',
    description: 'Standard clinical monochrome display (MONOCHROME2)',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.0 },
      { x: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
  },
  inverted: {
    id: 'inverted',
    name: 'Inverted Grayscale',
    category: 'monochrome',
    description: 'High-contrast inverted black bone / lung display',
    points: [
      { x: 0.0, r: 1.0, g: 1.0, b: 1.0 },
      { x: 1.0, r: 0.0, g: 0.0, b: 0.0 },
    ],
  },
  hot_iron: {
    id: 'hot_iron',
    name: 'Hot Iron / Flame',
    category: 'clinical',
    description: 'Nuclear medicine, PET-CT metabolic hotspot visualization',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.0 },
      { x: 0.25, r: 0.5, g: 0.0, b: 0.0 },
      { x: 0.55, r: 1.0, g: 0.35, b: 0.0 },
      { x: 0.8, r: 1.0, g: 0.85, b: 0.1 },
      { x: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
  },
  pet_20step: {
    id: 'pet_20step',
    name: 'PET 20-Step',
    category: 'fusion',
    description: 'Standard Uptake Value (SUV) calibrated clinical oncology scale',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.0 },
      { x: 0.05, r: 0.0, g: 0.15, b: 0.5 },
      { x: 0.15, r: 0.0, g: 0.5, b: 0.8 },
      { x: 0.3, r: 0.0, g: 0.8, b: 0.2 },
      { x: 0.5, r: 0.8, g: 0.9, b: 0.0 },
      { x: 0.7, r: 1.0, g: 0.5, b: 0.0 },
      { x: 0.88, r: 0.9, g: 0.05, b: 0.05 },
      { x: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
  },
  hot_metal_blue: {
    id: 'hot_metal_blue',
    name: 'Hot Metal Blue',
    category: 'clinical',
    description: 'Deep navy to warm amber for high-dynamic neuro/angio imaging',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.15 },
      { x: 0.3, r: 0.15, g: 0.15, b: 0.6 },
      { x: 0.6, r: 0.75, g: 0.25, b: 0.5 },
      { x: 0.85, r: 1.0, g: 0.75, b: 0.2 },
      { x: 1.0, r: 1.0, g: 1.0, b: 0.95 },
    ],
  },
  viridis: {
    id: 'viridis',
    name: 'Viridis',
    category: 'perceptual',
    description: 'Perceptually uniform color scale for artifact-free perception',
    points: [
      { x: 0.0, r: 0.267, g: 0.004, b: 0.329 },
      { x: 0.25, r: 0.191, g: 0.407, b: 0.556 },
      { x: 0.5, r: 0.127, g: 0.566, b: 0.55 },
      { x: 0.75, r: 0.369, g: 0.788, b: 0.383 },
      { x: 1.0, r: 0.993, g: 0.906, b: 0.144 },
    ],
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    category: 'perceptual',
    description: 'Black to purple to bright yellow perceptually uniform gradient',
    points: [
      { x: 0.0, r: 0.001, g: 0.0, b: 0.015 },
      { x: 0.25, r: 0.32, g: 0.1, b: 0.43 },
      { x: 0.5, r: 0.71, g: 0.21, b: 0.47 },
      { x: 0.75, r: 0.98, g: 0.51, b: 0.38 },
      { x: 1.0, r: 0.99, g: 0.99, b: 0.75 },
    ],
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    category: 'perceptual',
    description: 'Blue to magenta to warm gold perceptually linear colormap',
    points: [
      { x: 0.0, r: 0.05, g: 0.03, b: 0.53 },
      { x: 0.25, r: 0.49, g: 0.01, b: 0.66 },
      { x: 0.5, r: 0.79, g: 0.28, b: 0.47 },
      { x: 0.75, r: 0.97, g: 0.58, b: 0.25 },
      { x: 1.0, r: 0.94, g: 0.97, b: 0.13 },
    ],
  },
  jet: {
    id: 'jet',
    name: 'Rainbow / Jet',
    category: 'clinical',
    description: 'Classic rainbow color map for ultrasound and thermal maps',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.5 },
      { x: 0.15, r: 0.0, g: 0.0, b: 1.0 },
      { x: 0.4, r: 0.0, g: 1.0, b: 1.0 },
      { x: 0.65, r: 1.0, g: 1.0, b: 0.0 },
      { x: 0.9, r: 1.0, g: 0.0, b: 0.0 },
      { x: 1.0, r: 0.5, g: 0.0, b: 0.0 },
    ],
  },
  bone: {
    id: 'bone',
    name: 'Bone Enhancement',
    category: 'clinical',
    description: 'Subtle cyan-tinged bone matrix and trabecular highlight',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.0 },
      { x: 0.375, r: 0.32, g: 0.32, b: 0.45 },
      { x: 0.75, r: 0.65, g: 0.78, b: 0.78 },
      { x: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
  },
  perfusion: {
    id: 'perfusion',
    name: 'Cerebral Perfusion (CBF)',
    category: 'fusion',
    description: 'Acute stroke ischemic core & penumbra contrast perfusion map',
    points: [
      { x: 0.0, r: 0.0, g: 0.0, b: 0.0 },
      { x: 0.15, r: 0.1, g: 0.0, b: 0.5 },
      { x: 0.35, r: 0.0, g: 0.4, b: 0.9 },
      { x: 0.55, r: 0.0, g: 0.8, b: 0.3 },
      { x: 0.75, r: 0.9, g: 0.8, b: 0.0 },
      { x: 0.9, r: 1.0, g: 0.2, b: 0.0 },
      { x: 1.0, r: 1.0, g: 1.0, b: 1.0 },
    ],
  },
};

/**
 * Linearly interpolates color across sorted vtk.js control points.
 */
function interpolateVtkColor(points: VtkColorPoint[], t: number): [number, number, number] {
  if (points.length === 0) return [0, 0, 0];
  if (t <= points[0].x) return [points[0].r, points[0].g, points[0].b];
  const last = points[points.length - 1];
  if (t >= last.x) return [last.r, last.g, last.b];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (t >= p0.x && t <= p1.x) {
      const span = p1.x - p0.x;
      const f = span > 1e-6 ? (t - p0.x) / span : 0;
      return [
        p0.r + f * (p1.r - p0.r),
        p0.g + f * (p1.g - p0.g),
        p0.b + f * (p1.b - p0.b),
      ];
    }
  }
  return [last.r, last.g, last.b];
}

/**
 * Builds a 256x1 RGBA Uint8Array lookup texture ready for WebGL2 binding.
 */
export function buildVtkColorLut(colormapId: string = 'grayscale', samples = 256): Uint8Array {
  const table = new Uint8Array(samples * 4);
  const preset = VTK_COLORMAPS[colormapId] || VTK_COLORMAPS.grayscale;

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const [r, g, b] = interpolateVtkColor(preset.points, t);
    const offset = i * 4;
    table[offset] = Math.max(0, Math.min(255, Math.round(r * 255)));
    table[offset + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
    table[offset + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    table[offset + 3] = 255; // Fully opaque
  }
  return table;
}

/**
 * Generates CSS linear-gradient string for visual dropdown swatch preview.
 */
export function getColormapCssGradient(colormapId: string): string {
  const preset = VTK_COLORMAPS[colormapId] || VTK_COLORMAPS.grayscale;
  const stops = preset.points.map((p) => {
    const r = Math.round(p.r * 255);
    const g = Math.round(p.g * 255);
    const b = Math.round(p.b * 255);
    const pct = Math.round(p.x * 100);
    return `rgb(${r},${g},${b}) ${pct}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
