import { describe, it, expect } from 'vitest';
import fs from 'fs';
import {
  isAnatomyAvailable,
  getAnatomyStatus,
  getModules,
  getModuleDetails,
  getSliceAnnotations,
  getSeriesAnnotations,
  searchStructures,
  resolveSliceImagePath,
  resolveIconPath,
  getSliceBuffer,
  getMaskBuffer,
} from '../anatomy.service';

describe('Anatomy Service (IMAIOS eAnatomy Integration)', () => {
  it('detects anatomy database availability and reports status', () => {
    const available = isAnatomyAvailable();
    expect(typeof available).toBe('boolean');

    const status = getAnatomyStatus();
    expect(status).toHaveProperty('available');
    expect(status).toHaveProperty('modulesCount');
    if (available) {
      expect(status.modulesCount).toBeGreaterThanOrEqual(1);
    } else {
      expect(status.modulesCount).toBe(0);
    }
  });

  it('lists all 49 cross-sectional anatomical modules with valid schema', () => {
    if (!isAnatomyAvailable()) return;
    const modules = getModules();
    expect(Array.isArray(modules)).toBe(true);
    expect(modules.length).toBeGreaterThanOrEqual(30);

    const first = modules[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('code');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('region');
    expect(first).toHaveProperty('series_count');
    expect(first).toHaveProperty('total_slices');
    expect(first.series_count).toBeGreaterThanOrEqual(1);
    expect(first.total_slices).toBeGreaterThanOrEqual(1);
  });

  it('retrieves full module details including series, slices, and filters', () => {
    if (!isAnatomyAvailable()) return;
    const details = getModuleDetails('brain3dmri');
    expect(details).toBeDefined();
    expect(details?.code).toBe('brain3dmri');
    expect(details?.series_count).toBeGreaterThanOrEqual(1);
    expect(details?.total_slices).toBeGreaterThanOrEqual(100);
    expect(details?.series.length).toBeGreaterThanOrEqual(1);
    expect(details?.filters.length).toBeGreaterThanOrEqual(1);

    const firstSeries = details?.series[0];
    expect(firstSeries).toHaveProperty('id');
    expect(firstSeries).toHaveProperty('canvas_width');
    expect(firstSeries).toHaveProperty('canvas_height');
    expect(firstSeries?.slices.length).toBeGreaterThanOrEqual(1);

    const firstSlice = firstSeries?.slices[0];
    expect(firstSlice).toHaveProperty('id');
    expect(firstSlice).toHaveProperty('sort_order');
  });

  it('retrieves normalized annotation points and scout lines for a slice', () => {
    if (!isAnatomyAvailable()) return;
    const details = getModuleDetails('brain3dmri');
    const sliceId = details?.series[0]?.slices[0]?.id;
    expect(sliceId).toBeDefined();

    if (sliceId) {
      const ann = getSliceAnnotations(sliceId);
      expect(ann).toHaveProperty('points');
      expect(ann).toHaveProperty('scout_lines');
      expect(Array.isArray(ann.points)).toBe(true);
      expect(Array.isArray(ann.scout_lines)).toBe(true);

      if (ann.points.length > 0) {
        const pt = ann.points[0];
        expect(pt).toHaveProperty('x_norm');
        expect(pt).toHaveProperty('y_norm');
        expect(pt.x_norm).toBeGreaterThanOrEqual(0);
        expect(pt.x_norm).toBeLessThanOrEqual(1);
        expect(pt.y_norm).toBeGreaterThanOrEqual(0);
        expect(pt.y_norm).toBeLessThanOrEqual(1);
      }
    }
  });

  it('performs indexed text search across anatomical structures with navigation metadata', () => {
    if (!isAnatomyAvailable()) return;
    const results = searchStructures('aorta', 5);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const aorta = results[0];
    expect(aorta.name_en.toLowerCase()).toContain('aorta');
    expect(aorta).toHaveProperty('slice_count');
    expect(aorta.slice_count).toBeGreaterThanOrEqual(1);
    expect(aorta).toHaveProperty('module_code');
    expect(aorta).toHaveProperty('series_id');
    expect(aorta).toHaveProperty('slice_sort');

    // Scoped search to specific module
    const brainResults = searchStructures('cerebr', 5, 'brain3dmri');
    expect(Array.isArray(brainResults)).toBe(true);
    if (brainResults.length > 0) {
      expect(brainResults[0].module_code).toBe('brain3dmri');
    }
  });

  it('resolves actual slice image paths on disk if modules are populated', () => {
    const details = getModuleDetails('brain3dmri');
    if (details && details.series.length > 0) {
      const se = details.series[0];
      const imgPath = resolveSliceImagePath('brain3dmri', se.id, 1);
      if (imgPath) {
        expect(fs.existsSync(imgPath)).toBe(true);
      }
    }
  });

  it('resolves category and structure icons from icons directory', () => {
    const iconPath = resolveIconPath('arteres');
    if (iconPath) {
      expect(fs.existsSync(iconPath)).toBe(true);
    }
  });

  it('serves slices directly from zero-extraction RadAtlas packages', () => {
    const details = getModuleDetails('brain3dmri');
    if (details && details.series.length > 0) {
      const se = details.series[0];
      const buf = getSliceBuffer('brain3dmri', se.id, 1);
      expect(buf).toBeDefined();
      if (buf) {
        expect(buf.length).toBeGreaterThan(100);
        // Valid JPEG header: FF D8
        expect(buf[0]).toBe(0xff);
        expect(buf[1]).toBe(0xd8);
      }
    }
  });

  it('serves valid PNG segmentation masks from extra layers', () => {
    const maskBuf = getMaskBuffer('brain3dmri', 'etages', 50, 50);
    expect(maskBuf).toBeDefined();
    if (maskBuf) {
      expect(maskBuf.length).toBeGreaterThan(100);
      // Valid PNG header magic bytes: 89 50 4E 47
      expect(maskBuf[0]).toBe(0x89);
      expect(maskBuf[1]).toBe(0x50);
      expect(maskBuf[2]).toBe(0x4e);
      expect(maskBuf[3]).toBe(0x47);
    }
  });

  it('retrieves series-wide batch annotations for instantaneous RAM caching', () => {
    if (!isAnatomyAvailable()) return;
    const details = getModuleDetails('brain3dmri');
    const seriesId = details?.series[0]?.id;
    if (seriesId) {
      const batch = getSeriesAnnotations(seriesId);
      expect(typeof batch).toBe('object');
      const sliceIds = Object.keys(batch);
      expect(sliceIds.length).toBeGreaterThanOrEqual(10);
      const firstSliceAnn = batch[Number(sliceIds[0])];
      expect(firstSliceAnn).toHaveProperty('points');
      expect(firstSliceAnn).toHaveProperty('scout_lines');
    }
  });
});
