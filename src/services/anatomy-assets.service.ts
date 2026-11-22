/**
 * Anatomy Assets Service (<140 lines).
 * Resolves filesystem paths and image buffers for cross-sectional slices,
 * segmentation layer masks (PNG), and anatomical icons.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  isRadAtlasAvailable,
  getSliceImageBuffer,
  getMaskImageBuffer,
  getIconBuffer,
} from './radatlas-reader.service';

const RESOURCE_DIR = process.env.VOXEN_ANATOMY_DIR || 'D:\\Projects\\Rad-Reporting\\IMAIOS\\eAnatomy_Resource';
const MODULES_DIR = path.join(RESOURCE_DIR, 'modules');
const ICONS_DIR = path.join(RESOURCE_DIR, 'icons');
const ATLAS_CACHE_ROOT =
  process.env.VOXEN_ATLAS_CACHE_DIR ||
  (fs.existsSync(path.join(process.cwd(), 'radatlas'))
    ? path.join(process.cwd(), 'radatlas', 'cache')
    : path.join(process.cwd(), 'radatlas_cache'));

export function getSliceCachePath(
  moduleCode: string,
  seriesId: number,
  sliceSort: number,
  contrast = ''
): string {
  const safeMod = moduleCode.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSeries = String(seriesId);
  const safeSlice = String(sliceSort).padStart(4, '0');
  const modDir = path.join(ATLAS_CACHE_ROOT, safeMod);

  // If contrast is empty or default, prefer canonical, then legacy _contraste_
  if (!contrast || contrast === 'contraste_' || contrast === 'standard') {
    const canonical = path.join(modDir, `${safeSeries}_${safeSlice}.jpg`);
    if (fs.existsSync(canonical)) return canonical;
    const fallbackContraste = path.join(modDir, `${safeSeries}_${safeSlice}_contraste_.jpg`);
    if (fs.existsSync(fallbackContraste)) return fallbackContraste;
    return canonical;
  }

  // If contrast variant specified (e.g. 'os', 'sansinj', 'contraste_os')
  const cleanContrast = contrast.replace(/[^a-zA-Z0-9_-]/g, '');
  const directPath = path.join(modDir, `${safeSeries}_${safeSlice}_${cleanContrast}.jpg`);
  if (fs.existsSync(directPath)) return directPath;
  const withPrefix = path.join(
    modDir,
    `${safeSeries}_${safeSlice}_contraste_${cleanContrast.replace(/^contraste_/, '')}.jpg`
  );
  if (fs.existsSync(withPrefix)) return withPrefix;

  return directPath;
}

export function resolveSliceCacheInfo(
  moduleCode: string,
  seriesId: number,
  sliceSort: number,
  contrast = ''
): { cachePath: string; exists: boolean; internalUri: string } {
  const cachePath = getSliceCachePath(moduleCode, seriesId, sliceSort, contrast);
  const safeMod = moduleCode.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = path.basename(cachePath);
  return {
    cachePath,
    exists: fs.existsSync(cachePath),
    internalUri: `/_atlas_internal/${safeMod}/${filename}`,
  };
}

export function resolveSliceImagePath(
  moduleCode: string,
  seriesId: number,
  sliceSort: number,
  contrast = ''
): string | null {
  if (!moduleCode || !/^[a-zA-Z0-9_-]+$/.test(moduleCode)) return null;
  const modDir = path.join(MODULES_DIR, moduleCode, 'slices');
  if (!fs.existsSync(modDir)) return null;

  try {
    const items = fs.readdirSync(modDir);
    const p1 = `${seriesId}_`;
    const p2 = `${String(seriesId).padStart(3, '0')}_`;
    const seriesDirName = items.find(
      (item) => (item.startsWith(p1) || item.startsWith(p2)) && fs.statSync(path.join(modDir, item)).isDirectory()
    );
    if (!seriesDirName) return null;

    const targetSeriesDir = path.join(modDir, seriesDirName);
    const subdirs = fs
      .readdirSync(targetSeriesDir)
      .map((d) => path.join(targetSeriesDir, d))
      .filter((d) => fs.statSync(d).isDirectory());

    if (!subdirs.length) return null;
    let chosenDir = subdirs[0];
    if (contrast) {
      const match = subdirs.find((d) => path.basename(d).includes(contrast));
      if (match) chosenDir = match;
    }

    const files = fs.readdirSync(chosenDir).filter((f) => f.startsWith('slice_'));
    const cand = `slice_${String(sliceSort).padStart(4, '0')}.jpg`;
    if (files.includes(cand)) {
      return path.join(chosenDir, cand);
    }
    if (sliceSort >= 1 && sliceSort <= files.length) {
      files.sort();
      return path.join(chosenDir, files[sliceSort - 1]);
    }
    return null;
  } catch {
    return null;
  }
}

export function resolveMaskImagePath(
  moduleCode: string,
  layerName: string,
  sliceSort: number,
  globalSlice = 0
): string | null {
  if (!moduleCode || !/^[a-zA-Z0-9_-]+$/.test(moduleCode)) return null;
  if (!layerName || layerName.includes('..') || layerName.includes('/') || layerName.includes('\\')) return null;
  const extraDir = path.join(MODULES_DIR, moduleCode, 'extra');
  if (!fs.existsSync(extraDir)) return null;

  const candidates = globalSlice > 0 ? [globalSlice, sliceSort] : [sliceSort];
  for (const sl of candidates) {
    if (sl <= 0) continue;
    const pat = `${moduleCode}#${layerName}#images-${String(sl).padStart(4, '0')}.png`;
    const hash = crypto.createHash('sha256').update(pat, 'utf-8').digest('hex') + '.jpg';
    const filePath = path.join(extraDir, hash);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

export function resolveIconPath(iconName: string): string | null {
  if (!fs.existsSync(ICONS_DIR)) return null;
  const decoded = path.basename(decodeURIComponent(iconName));
  const candidates = decoded.endsWith('.png') ? [decoded] : [decoded, `${decoded}.png`];
  for (const sub of ['categories', 'structures', 'regions', 'tools']) {
    for (const cand of candidates) {
      const p = path.join(ICONS_DIR, sub, cand);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

export function getSliceBuffer(
  moduleCode: string,
  seriesId: number,
  sliceSort: number,
  contrast = ''
): Buffer | null {
  const cachePath = getSliceCachePath(moduleCode, seriesId, sliceSort, contrast);
  if (fs.existsSync(cachePath)) {
    try {
      return fs.readFileSync(cachePath);
    } catch {
      // Fall through to live decrypt on read error
    }
  }

  let buf: Buffer | null = null;
  if (isRadAtlasAvailable()) {
    buf = getSliceImageBuffer(moduleCode, seriesId, sliceSort, contrast);
  }
  if (!buf) {
    const filePath = resolveSliceImagePath(moduleCode, seriesId, sliceSort, contrast);
    if (filePath && fs.existsSync(filePath)) {
      buf = fs.readFileSync(filePath);
    }
  }

  // Persist to private server-side cache for future 0.1ms hits
  if (buf) {
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, buf);
    } catch {
      // Fail gracefully if directory is non-writable
    }
  }

  return buf;
}

export function getMaskBuffer(
  moduleCode: string,
  layerName: string,
  sliceSort: number,
  globalSlice = 0
): Buffer | null {
  if (isRadAtlasAvailable()) {
    const targetSlice = globalSlice > 0 ? globalSlice : sliceSort;
    const pat = `${moduleCode}#${layerName}#images-${String(targetSlice).padStart(4, '0')}.png`;
    const hash = crypto.createHash('sha256').update(pat, 'utf-8').digest('hex') + '.jpg';
    const buf = getMaskImageBuffer(moduleCode, hash);
    if (buf) return buf;
  }
  const filePath = resolveMaskImagePath(moduleCode, layerName, sliceSort, globalSlice);
  return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

export function getIconImageBuffer(iconName: string): Buffer | null {
  if (isRadAtlasAvailable()) {
    const buf = getIconBuffer(iconName);
    if (buf) return buf;
  }
  const filePath = resolveIconPath(iconName);
  return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}
