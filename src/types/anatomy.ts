/**
 * Anatomy Atlas Domain Models and View Types (<300 lines).
 * Represents IMAIOS eAnatomy cross-sectional anatomy modules, series, slices,
 * structures, normalized annotation pins, scout lines, and interactive quiz modes.
 */

export interface AnatomyModuleSummary {
  id: number;
  code: string;
  title: string;
  region: string;
  sort_order: number;
  series_count: number;
  total_slices: number;
  icon?: string | null;
  region_icon?: string | null;
}

export interface AnatomySliceSummary {
  id: number;
  sort_order: number;
  left_bound?: number | null;
  right_bound?: number | null;
  title1?: string | null;
  title2?: string | null;
  orientation?: string | null;
}

export interface AnatomySeries {
  id: number;
  sort_order: number;
  title: string;
  slice_count: number;
  canvas_width: number;
  canvas_height: number;
  img_width: number;
  img_height: number;
  modality_id: number;
  background_color?: string | null;
  slices: AnatomySliceSummary[];
}

export interface AnatomyLayerMask {
  layer: string;
  title: string;
  sort_order: number;
}

export interface AnatomyFilter {
  id: number;
  name_en: string;
  name_la?: string | null;
  layer?: string | null;
  category?: string | null;
  sort_order: number;
  icon?: string | null;
  default_active?: number | null;
}

export interface AnatomyModuleDetails extends AnatomyModuleSummary {
  series: AnatomySeries[];
  layers: AnatomyLayerMask[];
  filters: AnatomyFilter[];
}

export interface AnatomyAnnotationPoint {
  point_id: number;
  structure_id: number;
  filter_id?: number | null;
  name_en: string;
  name_la?: string | null;
  patronym?: string | null;
  x_pixel: number;
  y_pixel: number;
  x_norm: number;
  y_norm: number;
  color?: string | null;
  priority?: number | null;
}

export interface AnatomyScoutLine {
  sort_order: number;
  pt1x: number;
  pt1y: number;
  pt2x: number;
  pt2y: number;
  pt1x_norm: number;
  pt1y_norm: number;
  pt2x_norm: number;
  pt2y_norm: number;
}

export interface AnatomySliceAnnotations {
  points: AnatomyAnnotationPoint[];
  scout_lines: AnatomyScoutLine[];
}

export interface AnatomyStructureSearchResult {
  id: number;
  parent_id?: number | null;
  name_en: string;
  name_la?: string | null;
  name_fr?: string | null;
  patronym?: string | null;
  icon?: string | null;
  slice_count: number;
  // Navigation & location metadata
  module_code?: string;
  module_title?: string;
  module_region?: string;
  series_id?: number;
  series_title?: string;
  slice_id?: number;
  slice_sort?: number;
  color?: string | null;
  filter_id?: number | null;
}
