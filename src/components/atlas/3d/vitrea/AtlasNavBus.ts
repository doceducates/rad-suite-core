/**
 * Bi-directional Navigation & Synchronization Bus
 * Bridges Rad Suite Core DICOM viewer and the 3D Anatomical Atlas
 */

import type { ClippingAxis } from '../state/atlasStore';

export interface SliceChangeEventPayload {
  axis: ClippingAxis;
  sliceIndex: number;
  totalSlices: number;
  millimeterPosition: number;
  source: 'dicom' | 'atlas_3d';
}

export interface StructureSelectPayload {
  structureId: string;
  fmaId?: string;
  name: string;
  source: 'report' | 'atlas_3d' | 'companion_pane';
}

export interface CameraCommandPayload {
  type: 'orientation' | 'zoom' | 'reset' | 'shading' | 'focus';
  view?: 'anterior' | 'posterior' | 'left' | 'right' | 'superior' | 'inferior';
  factor?: number;
  mode?: 'default' | 'xray' | 'dark' | 'light';
  structureId?: string;
}

export type AtlasBusListener<T> = (payload: T) => void;

class AtlasNavBusManager {
  private sliceListeners: Set<AtlasBusListener<SliceChangeEventPayload>> = new Set();
  private structureListeners: Set<AtlasBusListener<StructureSelectPayload>> = new Set();
  private cameraListeners: Set<AtlasBusListener<CameraCommandPayload>> = new Set();

  public onSliceChange(listener: AtlasBusListener<SliceChangeEventPayload>): () => void {
    this.sliceListeners.add(listener);
    return () => this.sliceListeners.delete(listener);
  }

  public emitSliceChange(payload: SliceChangeEventPayload): void {
    this.sliceListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[AtlasNavBus] Slice change error:', err);
      }
    });
  }

  public onStructureSelect(listener: AtlasBusListener<StructureSelectPayload>): () => void {
    this.structureListeners.add(listener);
    return () => this.structureListeners.delete(listener);
  }

  public emitStructureSelect(payload: StructureSelectPayload): void {
    this.structureListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[AtlasNavBus] Structure select error:', err);
      }
    });
  }

  public onCameraCommand(listener: AtlasBusListener<CameraCommandPayload>): () => void {
    this.cameraListeners.add(listener);
    return () => this.cameraListeners.delete(listener);
  }

  public emitCameraCommand(payload: CameraCommandPayload): void {
    this.cameraListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[AtlasNavBus] Camera command error:', err);
      }
    });
  }

  public clearAll(): void {
    this.sliceListeners.clear();
    this.structureListeners.clear();
    this.cameraListeners.clear();
  }
}

export const AtlasNavBus = new AtlasNavBusManager();
