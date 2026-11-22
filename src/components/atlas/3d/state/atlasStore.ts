import { useSyncExternalStore } from 'react';
import type { AnatomicalSystemId } from '../data/schema';

export type ViewportMode = '3d' | 'split' | '2d';
export type ClippingAxis = 'axial' | 'sagittal' | 'coronal';

export interface ClippingPlaneConfig {
  enabled: boolean;
  axis: ClippingAxis;
  offsetMm: number;
  inverted: boolean;
  showPlaneHelper: boolean;
}

export interface AtlasState {
  visibleSystems: Set<AnatomicalSystemId>;
  systemOpacities: Record<AnatomicalSystemId, number>;
  selectedStructureId: string | null;
  hoveredStructureId: string | null;
  hiddenStructureIds: Set<string>;
  isolatedStructureId: string | null;
  explodeFactor: number;
  clippingPlane: ClippingPlaneConfig;
  viewportMode: ViewportMode;

  toggleSystem: (system: AnatomicalSystemId) => void;
  setSystemVisible: (system: AnatomicalSystemId, visible: boolean) => void;
  setVisibleSystems: (systems: Set<AnatomicalSystemId>) => void;
  setSystemOpacity: (system: AnatomicalSystemId, opacity: number) => void;
  selectStructure: (id: string | null) => void;
  hoverStructure: (id: string | null) => void;
  hideStructure: (id: string) => void;
  isolateStructure: (id: string | null) => void;
  restoreHiddenStructures: () => void;
  setExplodeFactor: (factor: number) => void;
  setClippingPlane: (config: Partial<ClippingPlaneConfig>) => void;
  setViewportMode: (mode: ViewportMode) => void;
  resetAll: () => void;
}

const DEFAULT_VISIBLE = new Set<AnatomicalSystemId>(['skeletal']);

const DEFAULT_OPACITIES: Record<AnatomicalSystemId, number> = {
  skeletal: 1.0,
  muscular: 1.0,
  circulatory: 1.0,
  nervous: 1.0,
  respiratory: 0.9,
  digestive: 0.9,
  urinary: 0.9,
  reproductive: 0.9,
  endocrine: 0.85,
  lymphatic: 0.85,
  integumentary: 0.35,
};

type Listener = () => void;

class AtlasStoreManager {
  private state: AtlasState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = {
      visibleSystems: new Set(DEFAULT_VISIBLE),
      systemOpacities: { ...DEFAULT_OPACITIES },
      selectedStructureId: null,
      hoveredStructureId: null,
      hiddenStructureIds: new Set(),
      isolatedStructureId: null,
      explodeFactor: 0.0,
      clippingPlane: {
        enabled: false,
        axis: 'axial',
        offsetMm: 0,
        inverted: false,
        showPlaneHelper: true,
      },
      viewportMode: '3d',

      toggleSystem: (system: AnatomicalSystemId) => {
        const next = new Set(this.state.visibleSystems);
        if (next.has(system)) next.delete(system);
        else next.add(system);
        this.setState({ visibleSystems: next });
      },

      setSystemVisible: (system: AnatomicalSystemId, visible: boolean) => {
        const next = new Set(this.state.visibleSystems);
        if (visible) next.add(system);
        else next.delete(system);
        this.setState({ visibleSystems: next });
      },

      setVisibleSystems: (systems: Set<AnatomicalSystemId>) => {
        this.setState({ visibleSystems: new Set(systems) });
      },

      setSystemOpacity: (system: AnatomicalSystemId, opacity: number) => {
        this.setState({
          systemOpacities: {
            ...this.state.systemOpacities,
            [system]: Math.max(0, Math.min(1, opacity)),
          },
        });
      },

      selectStructure: (id: string | null) => this.setState({ selectedStructureId: id }),
      hoverStructure: (id: string | null) => this.setState({ hoveredStructureId: id }),

      hideStructure: (id: string) => {
        const next = new Set(this.state.hiddenStructureIds);
        next.add(id);
        this.setState({ hiddenStructureIds: next, selectedStructureId: null });
      },

      isolateStructure: (id: string | null) => this.setState({ isolatedStructureId: id }),

      restoreHiddenStructures: () =>
        this.setState({ hiddenStructureIds: new Set(), isolatedStructureId: null }),

      setExplodeFactor: (factor: number) =>
        this.setState({ explodeFactor: Math.max(0, Math.min(1, factor)) }),

      setClippingPlane: (config: Partial<ClippingPlaneConfig>) =>
        this.setState({ clippingPlane: { ...this.state.clippingPlane, ...config } }),

      setViewportMode: (mode: ViewportMode) => this.setState({ viewportMode: mode }),

      resetAll: () =>
        this.setState({
          visibleSystems: new Set(DEFAULT_VISIBLE),
          systemOpacities: { ...DEFAULT_OPACITIES },
          selectedStructureId: null,
          hoveredStructureId: null,
          hiddenStructureIds: new Set(),
          isolatedStructureId: null,
          explodeFactor: 0.0,
          clippingPlane: {
            enabled: false,
            axis: 'axial',
            offsetMm: 0,
            inverted: false,
            showPlaneHelper: true,
          },
          viewportMode: '3d',
        }),
    };
  }

  public getState = (): AtlasState => this.state;

  public setState(partial: Partial<AtlasState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const atlasStoreInstance = new AtlasStoreManager();

export function useAtlasStore(): AtlasState;
export function useAtlasStore<T>(selector: (state: AtlasState) => T): T;
export function useAtlasStore<T>(selector?: (state: AtlasState) => T): T | AtlasState {
  const state = useSyncExternalStore(
    atlasStoreInstance.subscribe,
    atlasStoreInstance.getState,
    atlasStoreInstance.getState
  );
  return selector ? selector(state) : state;
}

useAtlasStore.getState = atlasStoreInstance.getState;
useAtlasStore.setState = (partial: Partial<AtlasState>) => atlasStoreInstance.setState(partial);
useAtlasStore.subscribe = atlasStoreInstance.subscribe;
