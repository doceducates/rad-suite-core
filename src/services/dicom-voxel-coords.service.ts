/**
 * Vitrea / Voxen Coordinate Transformations (<300 lines).
 * Handles conversions between screen canvas pixels, image pixel space,
 * and 3D Patient Voxel coordinates (x, y, z).
 */

export interface VoxelPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface ImagePoint2D {
  x: number;
  y: number;
}

export interface ScreenPoint2D {
  x: number;
  y: number;
}

export interface ViewportRect {
  scale: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VolumePlaneGeometry {
  width: number;
  height: number;
  sliceCount: number;
  pixelSpacing: [number, number];
  sliceThickness: number;
}

export type DicomPlane = 'axial' | 'coronal' | 'sagittal' | '3d' | 'stack';

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Computes aspect-ratio-fitted image bounding box within container,
 * incorporating zoom and pan offsets.
 */
export function computeViewportImageRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
  zoom = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 }
): ViewportRect {
  if (containerW <= 0 || containerH <= 0 || imageW <= 0 || imageH <= 0) {
    return { scale: 1, x: 0, y: 0, w: imageW, h: imageH };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH) * zoom;
  const dw = imageW * scale;
  const dh = imageH * scale;
  return {
    scale,
    x: (containerW - dw) / 2 + pan.x,
    y: (containerH - dh) / 2 + pan.y,
    w: dw,
    h: dh,
  };
}

/**
 * Transforms an image coordinate (ix, iy) to canvas screen coordinate.
 */
export function toScreen(rect: ViewportRect, ix: number, iy: number): ScreenPoint2D {
  return {
    x: rect.x + ix * rect.scale,
    y: rect.y + iy * rect.scale,
  };
}

/**
 * Transforms a canvas screen coordinate (cx, cy) to image coordinate (ix, iy).
 */
export function toImage(rect: ViewportRect, cx: number, cy: number): ImagePoint2D {
  if (rect.scale <= 0) return { x: cx, y: cy };
  return {
    x: (cx - rect.x) / rect.scale,
    y: (cy - rect.y) / rect.scale,
  };
}

/**
 * Transforms 3D Patient Voxel coordinates (x, y, z) into 2D plane image coordinates.
 */
export function voxelToImage(
  p: VoxelPoint3D,
  geo: VolumePlaneGeometry,
  dims: { width: number; height: number; depth: number },
  plane: DicomPlane = 'axial',
  flipH = false,
  flipV = false
): ImagePoint2D {
  let x = p.x;
  let y = p.y;

  if (plane === 'axial' || plane === 'stack') {
    x = p.x;
    y = p.y;
  } else if (plane === 'coronal') {
    x = p.x;
    y = dims.depth > 1 ? ((dims.depth - 1 - p.z) * (geo.height - 1)) / (dims.depth - 1) : 0;
  } else if (plane === 'sagittal') {
    x = p.y;
    y = dims.depth > 1 ? ((dims.depth - 1 - p.z) * (geo.height - 1)) / (dims.depth - 1) : 0;
  }

  if (flipH) x = geo.width - 1 - x;
  if (flipV) y = geo.height - 1 - y;

  return { x, y };
}

/**
 * Transforms 2D plane image coordinates back into 3D Patient Voxel coordinates (x, y, z).
 */
export function imageToVoxel(
  ix: number,
  iy: number,
  sliceIndex: number,
  geo: VolumePlaneGeometry,
  dims: { width: number; height: number; depth: number },
  plane: DicomPlane = 'axial',
  flipH = false,
  flipV = false
): VoxelPoint3D {
  let x = ix;
  let y = iy;

  if (flipH) x = geo.width - 1 - x;
  if (flipV) y = geo.height - 1 - y;

  if (plane === 'axial' || plane === 'stack') {
    return {
      x: clamp(Math.round(x), 0, dims.width - 1),
      y: clamp(Math.round(y), 0, dims.height - 1),
      z: clamp(sliceIndex, 0, dims.depth - 1),
    };
  }

  if (plane === 'coronal') {
    const z = dims.depth > 1 ? (dims.depth - 1) - (y * (dims.depth - 1)) / Math.max(1, geo.height - 1) : 0;
    return {
      x: clamp(Math.round(x), 0, dims.width - 1),
      y: clamp(sliceIndex, 0, dims.height - 1),
      z: clamp(Math.round(z), 0, dims.depth - 1),
    };
  }

  // sagittal
  const z = dims.depth > 1 ? (dims.depth - 1) - (y * (dims.depth - 1)) / Math.max(1, geo.height - 1) : 0;
  return {
    x: clamp(sliceIndex, 0, dims.width - 1),
    y: clamp(Math.round(x), 0, dims.height - 1),
    z: clamp(Math.round(z), 0, dims.depth - 1),
  };
}

/**
 * Converts mouse/touch client coordinates (e.g. from event) directly into 3D Patient Voxel.
 */
export function eventToVoxel(
  clientX: number,
  clientY: number,
  containerRect: { left: number; top: number; width: number; height: number },
  sliceIndex: number,
  geo: VolumePlaneGeometry,
  dims: { width: number; height: number; depth: number },
  zoom = 1,
  pan = { x: 0, y: 0 },
  plane: DicomPlane = 'axial',
  flipH = false,
  flipV = false
): VoxelPoint3D {
  const vpRect = computeViewportImageRect(containerRect.width, containerRect.height, geo.width, geo.height, zoom, pan);
  const cx = clientX - containerRect.left;
  const cy = clientY - containerRect.top;
  const imgPt = toImage(vpRect, cx, cy);
  return imageToVoxel(imgPt.x, imgPt.y, sliceIndex, geo, dims, plane, flipH, flipV);
}
