export type ViewportLayoutMode =
  | '1x1' | '1x2' | '1x3' | '1x4'
  | '2x1' | '2x2' | '2x3' | '2x4'
  | '3x1' | '3x2' | '3x3' | '3x4'
  | '4x1' | '4x2' | '4x3' | '4x4'
  | `${number}x${number}`;

export function parseLayoutDimensions(layout: ViewportLayoutMode | string = '1x1'): { rows: number; cols: number } {
  if (typeof layout === 'string' && layout.includes('x')) {
    const parts = layout.split('x').map((n) => parseInt(n, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] >= 1 && parts[1] >= 1) {
      return {
        rows: Math.min(6, Math.max(1, parts[0])),
        cols: Math.min(6, Math.max(1, parts[1])),
      };
    }
  }
  return { rows: 1, cols: 1 };
}

export function formatLayoutMode(rows: number, cols: number): ViewportLayoutMode {
  return `${rows}x${cols}` as ViewportLayoutMode;
}

export function getResponsiveLayoutForCount(targetCount: number, preferVertical = false): ViewportLayoutMode {
  if (targetCount <= 1) return '1x1';
  if (targetCount === 2) return preferVertical ? '2x1' : '1x2';
  if (targetCount === 3) return preferVertical ? '3x1' : '1x3';
  if (targetCount === 4) return '2x2';
  if (targetCount === 5) return preferVertical ? '5x1' : '1x5';
  if (targetCount === 6) return '2x3';
  if (targetCount <= 8) return '2x4';
  if (targetCount <= 9) return '3x3';
  return '4x4';
}

export type MobileTouchMode = 'scrub' | 'wl';

export type DicomTool =
  | 'wl'
  | 'pan'
  | 'zoom'
  | 'length'
  | 'angle'
  | 'cobb'
  | 'roi'
  | 'rect_roi'
  | 'crosshair'
  | 'freehand'
  | 'annotation'
  | 'arrow'
  | 'snap'
  | 'sculpt'
  | 'bone'
  | 'vessel'
  | 'organ'
  | 'cardiac'
  | 'visible';

export interface MobileGridMatrixState {
  totalPanes: number;
  activePaneIndex: number;
  rows: number;
  cols: number;
}

export interface ViewportCellState {
  id: string;
  seriesIndex: number;
  slice: number;
  zoom: number;
  pan: { x: number; y: number };
  preset: string;
  ww: number;
  wc: number;
  invert: boolean;
  rotate: number;
  flip: boolean;
  cine: boolean;
}

