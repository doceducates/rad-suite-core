import {
  SunMoon,
  Hand,
  ZoomIn,
  Crosshair,
  Ruler,
  Circle,
  PenTool,
  Type,
  ArrowUpRight,
  Contrast,
  RotateCcw,
  Camera,
  Play,
  Pause,
  Layers,
} from 'lucide-react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { ViewportLayoutMode } from '@/types/viewport';
import { AngleToolIcon, CobbAngleToolIcon } from './zen-dicom-tool-icons';

export interface DicomToolDefinition {
  id: DicomTool;
  label: string;
  shortLabel?: string;
  hotkey?: string;
  tooltip: string;
  icon: any;
  category: 'core' | 'measure' | 'image' | 'annotation';
}

export const DICOM_TOOLS: DicomToolDefinition[] = [
  {
    id: 'wl',
    label: 'Window / Level',
    shortLabel: 'W/L',
    hotkey: 'W',
    tooltip: 'Window / Level (W) — Adjust contrast and brightness',
    icon: SunMoon,
    category: 'core',
  },
  {
    id: 'pan',
    label: 'Pan',
    shortLabel: 'Pan',
    hotkey: 'P',
    tooltip: 'Pan (P) — Move image across canvas',
    icon: Hand,
    category: 'core',
  },
  {
    id: 'zoom',
    label: 'Zoom',
    shortLabel: 'Zoom',
    hotkey: 'Z',
    tooltip: 'Zoom (Z) — Magnify or demagnify viewport',
    icon: ZoomIn,
    category: 'core',
  },
  {
    id: 'crosshair',
    label: 'Crosshairs',
    shortLabel: 'Cross',
    hotkey: 'H',
    tooltip: 'Crosshairs / 3D Locator (H) — Probe HU and orthogonal slices',
    icon: Crosshair,
    category: 'core',
  },
  {
    id: 'length',
    label: 'Ruler Caliper',
    shortLabel: 'Ruler',
    hotkey: 'R',
    tooltip: 'Distance Ruler (R) — Linear measurement in mm',
    icon: Ruler,
    category: 'measure',
  },
  {
    id: 'angle',
    label: '3-Point Angle',
    shortLabel: 'Angle',
    hotkey: 'V',
    tooltip: '3-Point Angle (V) — Measure anatomical angles',
    icon: AngleToolIcon,
    category: 'measure',
  },
  {
    id: 'cobb',
    label: 'Cobb Angle',
    shortLabel: 'Cobb',
    hotkey: 'C',
    tooltip: 'Cobb Angle (C) — Dual-line spinal curvature analysis',
    icon: CobbAngleToolIcon,
    category: 'measure',
  },
  {
    id: 'roi',
    label: 'Ellipse ROI',
    shortLabel: 'Ellipse',
    hotkey: 'E',
    tooltip: 'Ellipse ROI (E) — Area and Mean HU calculation',
    icon: Circle,
    category: 'measure',
  },
  {
    id: 'freehand',
    label: 'Freehand Lasso',
    shortLabel: 'Lasso',
    hotkey: 'B',
    tooltip: 'Freehand ROI (B) — Freeform polygon contouring',
    icon: PenTool,
    category: 'measure',
  },
  {
    id: 'annotation',
    label: 'Text Label',
    shortLabel: 'Text',
    hotkey: 'L',
    tooltip: 'Text Annotation (L) — Pin descriptive callout labels',
    icon: Type,
    category: 'annotation',
  },
  {
    id: 'arrow',
    label: 'Arrow Pointer',
    shortLabel: 'Arrow',
    hotkey: 'A',
    tooltip: 'Arrow Pointer (A) — Directional indicator',
    icon: ArrowUpRight,
    category: 'annotation',
  },
];

export interface PlaneBadgeInfo {
  tag: 'AX' | 'COR' | 'SAG' | '3D' | 'PL';
  label: string;
  color: string;
}

/**
 * Derives orientation badge with color code matching Atlas & Vitrea standards.
 * Axial = Red, Coronal = Emerald, Sagittal = Sky, 3D = Purple.
 */
export function getPlaneBadge(description?: string, orientation?: string): PlaneBadgeInfo {
  const d = (description || '').toLowerCase();
  const o = (orientation || '').toLowerCase();

  if (d.includes('axial') || d.includes('ax ') || d.includes('ax_') || o === 'axial') {
    return { tag: 'AX', label: 'Axial', color: 'text-red-400 border-red-500/40 bg-red-500/10' };
  }
  if (d.includes('coronal') || d.includes('cor ') || d.includes('cor_') || o === 'coronal') {
    return { tag: 'COR', label: 'Coronal', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
  }
  if (d.includes('sagittal') || d.includes('sag ') || d.includes('sag_') || d.includes('sg ') || o === 'sagittal') {
    return { tag: 'SAG', label: 'Sagittal', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' };
  }
  if (d.includes('3d') || d.includes('vr') || d.includes('volume') || d.includes('recon')) {
    return { tag: '3D', label: '3D Volume', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' };
  }
  return { tag: 'PL', label: 'Planar', color: 'text-primary border-primary/40 bg-primary/10' };
}

export const LAYOUT_PRESETS: { mode: ViewportLayoutMode; label: string; desc: string; cols: number; rows: number }[] = [
  { mode: '1x1', label: '1×1 Single', desc: 'Full diagnostic viewport', cols: 1, rows: 1 },
  { mode: '1x2', label: '1×2 Dual', desc: 'Side-by-side comparison', cols: 2, rows: 1 },
  { mode: '2x2', label: '2×2 Quad', desc: 'Orthogonal 4-pane MPR', cols: 2, rows: 2 },
  { mode: '1x3', label: '1×3 Triple', desc: 'Tri-plane linear view', cols: 3, rows: 1 },
  { mode: '2x3', label: '2×3 6-View', desc: '2 rows × 3 columns overview', cols: 3, rows: 2 },
  { mode: '4x1', label: '4×1 Column', desc: '4 vertical stacked series', cols: 1, rows: 4 },
  { mode: '3x3', label: '3×3 Montage', desc: '9-pane screening overview', cols: 3, rows: 3 },
  { mode: '4x4', label: '4×4 Matrix', desc: '16-pane deep montage', cols: 4, rows: 4 },
];

export type ResponsiveHeaderTier = 'compact' | 'medium' | 'wide' | 'ultra';

export function getResponsiveTier(width: number): ResponsiveHeaderTier {
  if (width >= 920) return 'ultra';
  if (width >= 700) return 'wide';
  if (width >= 520) return 'medium';
  return 'compact';
}

export function getVisibleToolIds(tier: ResponsiveHeaderTier): DicomTool[] {
  switch (tier) {
    case 'ultra':
      return ['wl', 'pan', 'zoom', 'crosshair', 'length', 'angle', 'cobb', 'roi', 'freehand'];
    case 'wide':
      return ['wl', 'pan', 'zoom', 'crosshair', 'length', 'angle'];
    case 'medium':
      return ['wl', 'pan', 'zoom', 'crosshair', 'length'];
    case 'compact':
    default:
      return ['wl', 'pan', 'zoom'];
  }
}
