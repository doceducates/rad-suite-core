export type ViewportLayoutMode = '1x1' | '1x2' | '1x3' | '2x2' | '3x3' | '4x4';

export type MobileTouchMode = 'scrub' | 'wl';

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

