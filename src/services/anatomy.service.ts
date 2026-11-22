/**
 * Anatomy Service (<220 lines).
 * Connects to IMAIOS eAnatomy SQLite database and streams normalized cross-sectional
 * atlas structures, slice annotations, scout lines, and color mask layers.
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type {
  AnatomyModuleSummary,
  AnatomyModuleDetails,
  AnatomySeries,
  AnatomySliceSummary,
  AnatomyAnnotationPoint,
  AnatomyScoutLine,
  AnatomySliceAnnotations,
  AnatomyStructureSearchResult,
  AnatomyLayerMask,
  AnatomyFilter,
} from '@/types';

export {
  resolveSliceImagePath,
  resolveMaskImagePath,
  resolveIconPath,
  getSliceBuffer,
  getMaskBuffer,
  getIconImageBuffer,
  resolveSliceCacheInfo,
} from './anatomy-assets.service';

function resolveDbPath(): string | null {
  const candidates: string[] = [
    ...(process.env.VOXEN_ANATOMY_DIR ? [path.join(process.env.VOXEN_ANATOMY_DIR, 'database', 'anatomy_clean.db')] : []),
    path.join(process.cwd(), 'anatomy', 'database', 'anatomy_clean.db'),
    path.join(process.cwd(), 'radatlas', 'radatlas_complete.radatlas'),
    ...(process.env.RADATLAS_DIR ? [path.join(process.env.RADATLAS_DIR, 'radatlas_complete.radatlas')] : []),
    'D:\\Projects\\Rad-Reporting\\IMAIOS\\eAnatomy_Resource\\database\\anatomy_clean.db',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

let dbInstance: DatabaseType | null = null;
let layersCache: Record<string, AnatomyLayerMask[]> | null = null;

function getDb(): DatabaseType | null {
  if (dbInstance) return dbInstance;
  const dbPath = resolveDbPath();
  if (!dbPath) return null;
  try {
    dbInstance = new Database(dbPath, { readonly: true, fileMustExist: true });
    return dbInstance;
  } catch (err) {
    console.error('[AnatomyService] Failed to open database:', err);
    return null;
  }
}

function getLayersCatalog(): Record<string, AnatomyLayerMask[]> {
  if (layersCache) return layersCache;
  const layersPath = path.join(process.cwd(), 'src', 'constants', 'anatomy-layers.json');
  if (fs.existsSync(layersPath)) {
    try {
      const raw = fs.readFileSync(layersPath, 'utf-8');
      layersCache = JSON.parse(raw);
      return layersCache || {};
    } catch {
      layersCache = {};
    }
  }
  return {};
}

export function isAnatomyAvailable(): boolean {
  return resolveDbPath() !== null;
}

export function getAnatomyStatus(): { available: boolean; modulesCount: number; dbPath: string } {
  const dbPath = resolveDbPath() || '';
  const db = getDb();
  if (!db) return { available: false, modulesCount: 0, dbPath };
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM module').get() as { count: number } | undefined;
    return { available: true, modulesCount: row?.count ?? 0, dbPath };
  } catch {
    return { available: false, modulesCount: 0, dbPath };
  }
}

export function getModules(): AnatomyModuleSummary[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT m.id, m.code, m.title, m.region, m.sort_order, m.icon, m.region_icon,
             COUNT(DISTINCT se.id) as series_count,
             COALESCE(SUM(se.slice_count), 0) as total_slices
      FROM module m
      LEFT JOIN series se ON (se.module_id = m.id)
      GROUP BY m.id
      ORDER BY m.region ASC, m.sort_order ASC
    `).all() as AnatomyModuleSummary[];
    return rows;
  } catch (err) {
    console.error('[AnatomyService] getModules error:', err);
    return [];
  }
}

export function getModuleDetails(codeOrId: string | number): AnatomyModuleDetails | null {
  const db = getDb();
  if (!db) return null;
  try {
    const isId = typeof codeOrId === 'number' || /^\d+$/.test(String(codeOrId));
    const modRow = isId
      ? (db.prepare('SELECT * FROM module WHERE id = ?').get(Number(codeOrId)) as any)
      : (db.prepare('SELECT * FROM module WHERE code = ?').get(String(codeOrId)) as any);

    if (!modRow) return null;

    const seriesRows = db.prepare(`
      SELECT id, sort_order, title, slice_count, canvas_width, canvas_height,
             img_width, img_height, modality_id, background_color
      FROM series
      WHERE module_id = ?
      ORDER BY sort_order ASC
    `).all(modRow.id) as any[];

    const sliceStmt = db.prepare(`
      SELECT id, sort_order, left_bound, right_bound, title1, title2, orientation
      FROM slice
      WHERE series_id = ?
      ORDER BY sort_order ASC
    `);

    const series: AnatomySeries[] = seriesRows.map((s) => ({
      ...s,
      slices: sliceStmt.all(s.id) as AnatomySliceSummary[],
    }));

    let filters: AnatomyFilter[] = [];
    try {
      filters = db.prepare(`
        SELECT id, name_en, name_la, layer, category, sort_order, icon, default_active
        FROM filter
        WHERE module_id = ?
        ORDER BY sort_order ASC
      `).all(modRow.id) as AnatomyFilter[];
    } catch {
      filters = [];
    }

    const allLayers = getLayersCatalog();
    const layers = allLayers[modRow.code] || [];
    const series_count = series.length;
    const total_slices = series.reduce((sum, s) => sum + (s.slice_count || s.slices?.length || 0), 0);

    return {
      ...modRow,
      series_count,
      total_slices,
      series,
      layers,
      filters,
    };
  } catch (err) {
    console.error('[AnatomyService] getModuleDetails error:', err);
    return null;
  }
}

export function getSliceAnnotations(sliceId: number): AnatomySliceAnnotations {
  const db = getDb();
  if (!db) return { points: [], scout_lines: [] };
  try {
    const points = db.prepare(`
      SELECT point_id, structure_id, filter_id, name_en, name_la, patronym,
             x_pixel, y_pixel, x_norm, y_norm, color, priority
      FROM v_slice_annotations
      WHERE slice_id = ?
      ORDER BY priority DESC, point_id ASC
    `).all(sliceId) as AnatomyAnnotationPoint[];

    const scout_lines = db.prepare(`
      SELECT sort_order, pt1x, pt1y, pt2x, pt2y,
             pt1x_norm, pt1y_norm, pt2x_norm, pt2y_norm
      FROM scout_line
      WHERE slice_id = ?
      ORDER BY sort_order ASC
    `).all(sliceId) as AnatomyScoutLine[];

    return { points, scout_lines };
  } catch (err) {
    console.error('[AnatomyService] getSliceAnnotations error:', err);
    return { points: [], scout_lines: [] };
  }
}

export function getSeriesAnnotations(seriesId: number): Record<number, AnatomySliceAnnotations> {
  const db = getDb();
  if (!db || !seriesId) return {};
  try {
    const points = db.prepare(`
      SELECT slice_id, point_id, structure_id, filter_id, name_en, name_la, patronym,
             x_pixel, y_pixel, x_norm, y_norm, color, priority
      FROM v_slice_annotations
      WHERE series_id = ?
      ORDER BY priority DESC, point_id ASC
    `).all(seriesId) as (AnatomyAnnotationPoint & { slice_id: number })[];

    const scouts = db.prepare(`
      SELECT sc.slice_id, sc.sort_order, sc.pt1x, sc.pt1y, sc.pt2x, sc.pt2y,
             sc.pt1x_norm, sc.pt1y_norm, sc.pt2x_norm, sc.pt2y_norm
      FROM scout_line sc
      INNER JOIN slice sl ON (sl.id = sc.slice_id)
      WHERE sl.series_id = ?
      ORDER BY sc.sort_order ASC
    `).all(seriesId) as (AnatomyScoutLine & { slice_id: number })[];

    const map: Record<number, AnatomySliceAnnotations> = {};
    for (const pt of points) {
      if (!map[pt.slice_id]) map[pt.slice_id] = { points: [], scout_lines: [] };
      map[pt.slice_id].points.push(pt);
    }
    for (const sc of scouts) {
      if (!map[sc.slice_id]) map[sc.slice_id] = { points: [], scout_lines: [] };
      map[sc.slice_id].scout_lines?.push(sc);
    }
    return map;
  } catch (err) {
    console.error('[AnatomyService] getSeriesAnnotations error:', err);
    return {};
  }
}

export function searchStructures(
  query: string,
  limit = 50,
  moduleCodeOrId?: string | number
): AnatomyStructureSearchResult[] {
  const db = getDb();
  const cleanQ = query.trim();
  if (!db || !cleanQ) return [];
  try {
    const param = `%${cleanQ}%`;
    if (moduleCodeOrId) {
      const isId = typeof moduleCodeOrId === 'number' || /^\d+$/.test(String(moduleCodeOrId));
      const modFilter = isId ? 'm.id = ?' : 'm.code = ?';
      const modVal = isId ? Number(moduleCodeOrId) : String(moduleCodeOrId);
      const rows = db.prepare(`
        SELECT st.id, st.parent_id, st.name_en, st.name_la, st.name_fr, st.patronym, st.icon,
               m.code as module_code, m.title as module_title, m.region as module_region,
               se.id as series_id, se.title as series_title,
               MIN(sl.id) as slice_id, MIN(sl.sort_order) as slice_sort,
               COUNT(DISTINCT sl.id) as slice_count,
               p.color, p.filter_id
        FROM structure st
        JOIN annotation_point p ON (p.structure_id = st.id)
        JOIN slice sl ON (sl.id = p.slice_id)
        JOIN series se ON (se.id = sl.series_id)
        JOIN module m ON (m.id = se.module_id)
        WHERE ${modFilter} AND (st.name_en LIKE ? OR st.name_la LIKE ? OR st.patronym LIKE ?)
        GROUP BY st.id, se.id
        ORDER BY slice_count DESC, st.name_en ASC
        LIMIT ?
      `).all(modVal, param, param, param, limit) as AnatomyStructureSearchResult[];
      return rows;
    }

    const rows = db.prepare(`
      SELECT st.id, st.parent_id, st.name_en, st.name_la, st.name_fr, st.patronym, st.icon,
             m.code as module_code, m.title as module_title, m.region as module_region,
             se.id as series_id, se.title as series_title,
             MIN(sl.id) as slice_id, MIN(sl.sort_order) as slice_sort,
             COUNT(DISTINCT sl.id) as slice_count,
             p.color, p.filter_id
      FROM structure st
      JOIN annotation_point p ON (p.structure_id = st.id)
      JOIN slice sl ON (sl.id = p.slice_id)
      JOIN series se ON (se.id = sl.series_id)
      JOIN module m ON (m.id = se.module_id)
      WHERE (st.name_en LIKE ? OR st.name_la LIKE ? OR st.patronym LIKE ?)
      GROUP BY st.id, m.id, se.id
      ORDER BY slice_count DESC, st.name_en ASC
      LIMIT ?
    `).all(param, param, param, limit) as AnatomyStructureSearchResult[];
    return rows;
  } catch (err) {
    console.error('[AnatomyService] searchStructures error:', err);
    return [];
  }
}
