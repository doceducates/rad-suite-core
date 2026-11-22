/**
 * Anatomy Atlas Callout Geometry & Collision Relaxation (<150 lines).
 * Implements 1D vertical collision avoidance, elbow leader lines,
 * brackets, and label line wrapping for medical cross-sectional viewports.
 */

export interface LayoutPoint {
  id: number;
  structure_id: number;
  filter_id?: number | null;
  name_en: string;
  name_la?: string | null;
  color?: string | null;
  priority?: number | null;
  px: number;
  py: number;
  isLeft: boolean;
  targetY?: number;
}

export interface CalloutPaths {
  leaderD: string;
  bracketD: string;
  textX: number;
  anchor: 'start' | 'end';
  lines: string[];
}

export function splitLabel(text: string, maxChars = 24): string[] {
  if (!text) return [''];
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  if (words.length === 1) return [text.slice(0, maxChars - 1) + '…'];

  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= 2) break;
    }
  }
  if (cur) {
    if (lines.length >= 2 && cur.length > maxChars) {
      lines.push(cur.slice(0, maxChars - 1) + '…');
    } else {
      lines.push(cur);
    }
  }
  return lines;
}

export function relaxVerticalPositions(
  items: LayoutPoint[],
  topMin: number,
  bottomMax: number,
  minGap = 28
): void {
  if (!items.length) return;
  items.sort((a, b) => a.py - b.py);
  for (const it of items) it.targetY = it.py;

  // Top-down collision resolution
  let curY = topMin;
  for (let i = 0; i < items.length; i++) {
    if (items[i].targetY! < curY) items[i].targetY = curY;
    curY = items[i].targetY! + minGap;
  }

  // Bottom-up pullback if bottom boundary exceeded
  if (items[items.length - 1].targetY! > bottomMax) {
    items[items.length - 1].targetY = bottomMax;
    for (let i = items.length - 2; i >= 0; i--) {
      if (items[i].targetY! > items[i + 1].targetY! - minGap) {
        items[i].targetY = items[i + 1].targetY! - minGap;
      }
    }
  }

  // Clamp within boundaries
  for (const it of items) {
    it.targetY = Math.max(topMin, Math.min(bottomMax, it.targetY!));
  }
}

export function pickTopPrioritized(
  list: LayoutPoint[],
  maxCount: number,
  selectedId?: number | null
): LayoutPoint[] {
  if (list.length <= maxCount) return list;
  const sorted = [...list].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const picked = sorted.slice(0, maxCount);
  if (
    selectedId &&
    list.some((p) => p.structure_id === selectedId || p.id === selectedId) &&
    !picked.some((p) => p.structure_id === selectedId || p.id === selectedId)
  ) {
    const target = list.find((p) => p.structure_id === selectedId || p.id === selectedId);
    if (target) picked[picked.length - 1] = target;
  }
  return picked;
}

export function computeCalloutPaths(
  item: LayoutPoint,
  bracketX: number,
  isLeft: boolean,
  language: 'en' | 'la' = 'en',
  maxChars = 24,
  bracketHalfHeight = 10
): CalloutPaths {
  const targetY = item.targetY ?? item.py;
  const elbowX = isLeft
    ? Math.max(bracketX + 16, Math.min(item.px - 20, bracketX + 48))
    : Math.min(bracketX - 16, Math.max(item.px + 20, bracketX - 48));

  const text = language === 'la' && item.name_la ? item.name_la : item.name_en;
  const lines = splitLabel(text || '', maxChars);
  const bHalf = bracketHalfHeight;
  const tickX = isLeft ? bracketX - 3 : bracketX + 3;
  const textX = isLeft ? bracketX - 6 : bracketX + 6;
  const anchor = isLeft ? 'end' : 'start';

  const leaderD = `M ${item.px} ${item.py} L ${elbowX} ${targetY} L ${bracketX} ${targetY}`;
  const bracketD = `M ${tickX} ${targetY - bHalf} L ${bracketX} ${targetY - bHalf} L ${bracketX} ${targetY + bHalf} L ${tickX} ${targetY + bHalf}`;

  return { leaderD, bracketD, textX, anchor, lines };
}

export interface ResponsiveLayoutConfig {
  fontSizePx: number;
  fontClass: string;
  charWidth: number;
  lineHeight: number;
  h1: number;
  h2: number;
  h3: number;
  y1: number;
  y2: number;
  y3: number;
  maxCharsPerLine: number;
  strokeLeaderNormal: number;
  strokeLeaderActive: number;
  strokeHaloNormal: number;
  strokeHaloActive: number;
  pinRadiusNormal: number;
  pinRadiusActive: number;
  minGap: number;
  bracketHalfHeight: (linesCount: number) => number;
}

export function getResponsiveLayoutConfig(
  containerWidth = 1000,
  userSize: 'sm' | 'md' | 'lg' = 'md'
): ResponsiveLayoutConfig {
  let baseScale = 1.0;
  if (containerWidth >= 1600) baseScale = 1.35;
  else if (containerWidth >= 1280) baseScale = 1.20;
  else if (containerWidth >= 1024) baseScale = 1.08;
  else if (containerWidth >= 640) baseScale = 1.0;
  else baseScale = 0.88;

  const userMult = userSize === 'sm' ? 0.88 : userSize === 'lg' ? 1.18 : 1.0;
  const scale = +(baseScale * userMult).toFixed(2);

  const fontSizePx = Math.round(11 * scale * 10) / 10;
  const charWidth = +(fontSizePx * 0.58).toFixed(2);
  const lineHeight = Math.round(fontSizePx * 1.25);
  const h1 = Math.round(16 * scale);
  const h2 = Math.round(27 * scale);
  const h3 = Math.round(38 * scale);

  const y1 = +(fontSizePx * 0.35).toFixed(1);
  const y2 = +(-fontSizePx * 0.25).toFixed(1);
  const y3 = +(-fontSizePx * 0.70).toFixed(1);

  const maxCharsPerLine = containerWidth < 640 ? 20 : containerWidth < 1024 ? 26 : containerWidth < 1440 ? 30 : 36;
  const minGap = Math.max(24, Math.round(h1 * 1.35));

  let fontClass = 'text-[11px]';
  if (fontSizePx >= 15) fontClass = 'text-[15px]';
  else if (fontSizePx >= 13.5) fontClass = 'text-[13.5px]';
  else if (fontSizePx >= 12) fontClass = 'text-[12px]';
  else if (fontSizePx >= 10.5) fontClass = 'text-[10.5px]';
  else fontClass = 'text-[9.5px]';

  return {
    fontSizePx,
    fontClass,
    charWidth,
    lineHeight,
    h1,
    h2,
    h3,
    y1,
    y2,
    y3,
    maxCharsPerLine,
    strokeLeaderNormal: +(1.4 * scale).toFixed(1),
    strokeLeaderActive: +(2.4 * scale).toFixed(1),
    strokeHaloNormal: +(2.6 * scale).toFixed(1),
    strokeHaloActive: +(4.2 * scale).toFixed(1),
    pinRadiusNormal: Math.max(3.5, Math.round(4.0 * scale)),
    pinRadiusActive: Math.max(5.0, Math.round(6.0 * scale)),
    minGap,
    bracketHalfHeight: (lines: number) =>
      lines > 2 ? Math.round(14 * scale) : lines > 1 ? Math.round(10 * scale) : Math.round(7 * scale),
  };
}

/**
 * Normalizes dark print/database hex colors for clinical dark mode viewports.
 * If luminance is low (e.g. dark navy, deep purple, dark brown), boosts
 * lightness and saturation so it pops vibrantly against black canvases.
 */
export function brightenAnatomyColor(hex?: string | null): string {
  if (!hex) return '#38bdf8';
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return '#38bdf8';

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  // Perceived relative luminance (bright colors like cyan #00e5ff have lum >= 0.55)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum >= 0.55) return `#${clean}`;

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }

  // Boost lightness to >= 0.68 and saturation to >= 0.70 for dark-mode visibility
  l = Math.max(0.68, l * 1.5);
  s = Math.max(0.70, s);

  const hslToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const rOut = Math.round(hslToRgb(p, q, h + 1 / 3) * 255);
  const gOut = Math.round(hslToRgb(p, q, h) * 255);
  const bOut = Math.round(hslToRgb(p, q, h - 1 / 3) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`;
}
