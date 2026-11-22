export { AtlasContainer } from './components/AtlasContainer';
export { Atlas3DViewport } from './components/Atlas3DViewport';
export { SystemsTray } from './components/SystemsTray';
export { VitreaClippingPanel } from './components/VitreaClippingPanel';
export { AnatomicalInfoBox } from './components/AnatomicalInfoBox';

export { useAtlasStore } from './state/atlasStore';
export type { AtlasState, ClippingPlaneConfig, ClippingAxis, ViewportMode } from './state/atlasStore';

export { AtlasNavBus } from './vitrea/AtlasNavBus';
export type { SliceChangeEventPayload, StructureSelectPayload } from './vitrea/AtlasNavBus';
export { SliceCoordinateBridge } from './vitrea/SliceCoordinateBridge';

export { AnatomicalDictionary } from './data/dictionary';
export { ANATOMICAL_SYSTEMS } from './data/systems';
export type { AnatomicalStructure, AnatomicalSystemId, AnatomicalRegionId } from './data/schema';
