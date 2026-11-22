/**
 * Vitrea / Voxen 3D Patient Voxel Space Measurement Engine (<300 lines).
 * Strict 3D geometry storage in patient voxel coordinates (x, y, z) with
 * physical millimeter calculations and Undo/Redo command history stack.
 */

import type { VoxelPoint3D } from './dicom-voxel-coords.service';

export interface VoxelMeasurementItem {
  id: string;
  type: 'ruler' | 'angle' | 'ellipse' | 'freehand' | 'arrow' | 'annotation';
  plane: 'axial' | 'coronal' | 'sagittal' | 'stack';
  points: VoxelPoint3D[]; // strictly 3D Patient Voxel coordinates (x, y, z)
  label: string;
  value: number;
  unit: string;
  stats?: {
    meanHu?: number;
    minHu?: number;
    maxHu?: number;
    stdDev?: number;
    areaMm2?: number;
    perimeterMm?: number;
  };
  color?: string;
  created: string;
}

export function dist3(p1: VoxelPoint3D, p2: VoxelPoint3D, sp: [number, number, number] = [1, 1, 1]): number {
  const dx = (p2.x - p1.x) * sp[0];
  const dy = (p2.y - p1.y) * sp[1];
  const dz = (p2.z - p1.z) * sp[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function angle3(
  p1: VoxelPoint3D,
  vertex: VoxelPoint3D,
  p2: VoxelPoint3D,
  sp: [number, number, number] = [1, 1, 1]
): number {
  const v1 = { x: (p1.x - vertex.x) * sp[0], y: (p1.y - vertex.y) * sp[1], z: (p1.z - vertex.z) * sp[2] };
  const v2 = { x: (p2.x - vertex.x) * sp[0], y: (p2.y - vertex.y) * sp[1], z: (p2.z - vertex.z) * sp[2] };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 < 1e-6 || mag2 < 1e-6) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

export function polygonPerimeter(points: VoxelPoint3D[], sp: [number, number, number] = [1, 1, 1]): number {
  if (points.length < 2) return 0;
  let peri = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    peri += dist3(points[i], next, sp);
  }
  return peri;
}

export function polygonAreaMm2(points: VoxelPoint3D[], sp: [number, number, number] = [1, 1, 1]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    sum += (p1.x * sp[0]) * (p2.y * sp[1]) - (p2.x * sp[0]) * (p1.y * sp[1]);
  }
  return Math.abs(sum * 0.5);
}

export class DicomMeasurementEngine {
  private items: VoxelMeasurementItem[] = [];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private seq = 0;

  constructor(initialItems: VoxelMeasurementItem[] = []) {
    this.items = [...initialItems];
  }

  public getItems(): VoxelMeasurementItem[] {
    return [...this.items];
  }

  public getItemsForPlane(plane: string, sliceIndex: number): VoxelMeasurementItem[] {
    return this.items.filter((item) => {
      if (item.plane !== plane) return false;
      const refPoint = item.points[0];
      if (!refPoint) return false;
      if (plane === 'axial' || plane === 'stack') return Math.abs(refPoint.z - sliceIndex) < 0.5;
      if (plane === 'coronal') return Math.abs(refPoint.y - sliceIndex) < 0.5;
      if (plane === 'sagittal') return Math.abs(refPoint.x - sliceIndex) < 0.5;
      return true;
    });
  }

  private commit(mutate: () => void): void {
    const before = JSON.stringify(this.items);
    mutate();
    const after = JSON.stringify(this.items);
    if (before === after) return;

    this.undoStack.push(before);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }

  public addRuler(p1: VoxelPoint3D, p2: VoxelPoint3D, plane: VoxelMeasurementItem['plane'], sp: [number, number, number] = [1, 1, 1]): VoxelMeasurementItem {
    const val = Number(dist3(p1, p2, sp).toFixed(2));
    const item: VoxelMeasurementItem = {
      id: `m_ruler_${Date.now()}_${++this.seq}`,
      type: 'ruler',
      plane,
      points: [p1, p2],
      label: `Distance ${this.items.filter((i) => i.type === 'ruler').length + 1}`,
      value: val,
      unit: 'mm',
      created: new Date().toISOString(),
    };
    this.commit(() => this.items.push(item));
    return item;
  }

  public addAngle(p1: VoxelPoint3D, vertex: VoxelPoint3D, p2: VoxelPoint3D, plane: VoxelMeasurementItem['plane'], sp: [number, number, number] = [1, 1, 1]): VoxelMeasurementItem {
    const val = Number(angle3(p1, vertex, p2, sp).toFixed(1));
    const item: VoxelMeasurementItem = {
      id: `m_angle_${Date.now()}_${++this.seq}`,
      type: 'angle',
      plane,
      points: [p1, vertex, p2],
      label: `Angle ${this.items.filter((i) => i.type === 'angle').length + 1}`,
      value: val,
      unit: '°',
      created: new Date().toISOString(),
    };
    this.commit(() => this.items.push(item));
    return item;
  }

  public deleteItem(id: string): void {
    this.commit(() => {
      this.items = this.items.filter((i) => i.id !== id);
    });
  }

  public clear(): void {
    if (this.items.length === 0) return;
    this.commit(() => {
      this.items = [];
    });
  }

  public undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(JSON.stringify(this.items));
    this.items = JSON.parse(prev);
    return true;
  }

  public redo(): boolean {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(JSON.stringify(this.items));
    this.items = JSON.parse(next);
    return true;
  }

  public canUndo(): boolean { return this.undoStack.length > 0; }
  public canRedo(): boolean { return this.redoStack.length > 0; }
}
