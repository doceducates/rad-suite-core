'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AtlasScene } from '../core/3d/AtlasScene';
import { AnatomyNodeManager } from '../core/3d/AnatomyNodeManager';
import { GhostOverlayManager } from '../core/3d/GhostOverlayManager';
import { AnatomyModelLoader, SYSTEM_GLB_MAP, isStandaloneModelCategory, resolveCategoryUrl } from '../core/3d/AnatomyModelLoader';
import { useAtlasStore } from '../state/atlasStore';
import { useViewportTouchSelection } from '../hooks/useViewportTouchSelection';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';
import { Loader2 } from 'lucide-react';

interface Atlas3DViewportProps {
  className?: string;
  activeCategory?: string;
  onStructureClick?: (id: string) => void;
}

function syncVisibility(nodeManager: AnatomyNodeManager, category: string): void {
  const st = useAtlasStore.getState();
  nodeManager.updateVisibility(
    st.visibleSystems,
    st.hiddenStructureIds,
    st.isolatedStructureId,
    st.systemOpacities,
    st.activeGender,
    st.fadedStructureIds,
    st.fadeOthersExceptId,
    isStandaloneModelCategory(category)
  );
}

export const Atlas3DViewport: React.FC<Atlas3DViewportProps> = ({
  className = 'w-full h-full',
  activeCategory = 'skeletal',
  onStructureClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<AtlasScene | null>(null);
  const nodeMgrRef = useRef<AnatomyNodeManager | null>(null);
  const ghostMgrRef = useRef<GhostOverlayManager | null>(null);
  const loadingGlbsRef = useRef<Set<string>>(new Set());
  const [loadStatus, setLoadStatus] = useState<{ loaded: number; total: number } | null>(null);

  const {
    activeGender, showGhostBody, visibleSystems, systemOpacities,
    hiddenStructureIds, fadedStructureIds, fadeOthersExceptId, isolatedStructureId,
    selectedStructureId, hoveredStructureId, clippingPlane, selectStructure, hoverStructure,
  } = useAtlasStore();

  const touch = useViewportTouchSelection({
    canvasRef, sceneRef, nodeMgrRef, selectStructure, hoverStructure, onStructureClick,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const atlasScene = new AtlasScene({ canvas });
    const nodeManager = new AnatomyNodeManager(atlasScene.scene);
    const ghostManager = new GhostOverlayManager(atlasScene.scene);
    sceneRef.current = atlasScene;
    nodeMgrRef.current = nodeManager;
    ghostMgrRef.current = ghostManager;
    (window as unknown as Record<string, unknown>).__ATLAS_DEBUG__ = { atlasScene, nodeManager };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) atlasScene.handleResize(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(canvas);

    const unsub = AtlasNavBus.onCameraCommand((cmd) => {
      const sc = sceneRef.current;
      const mgr = nodeMgrRef.current;
      if (!sc) return;
      if (cmd.type === 'orientation' && cmd.view) sc.setCameraOrientation(cmd.view);
      else if (cmd.type === 'zoom' && cmd.factor) sc.zoom(cmd.factor);
      else if (cmd.type === 'reset' && mgr) sc.fitCameraToObject(mgr.getRootGroup());
      else if (cmd.type === 'focus' && cmd.structureId && mgr) {
        const bounds = mgr.getStructureBounds(cmd.structureId);
        if (bounds) sc.focusOnBox(bounds, 1.35);
      } else if (cmd.type === 'shading' && cmd.mode) sc.setShadingMode(cmd.mode);
    });

    return () => {
      unsub();
      ro.disconnect();
      ghostManager.dispose(atlasScene.scene);
      nodeManager.dispose(atlasScene.scene);
      atlasScene.dispose();
      sceneRef.current = null;
      nodeMgrRef.current = null;
      ghostMgrRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sc = sceneRef.current;
    const mgr = nodeMgrRef.current;
    if (!sc || !mgr) return;

    mgr.clear();
    loadingGlbsRef.current.clear();
    const resolved = resolveCategoryUrl(activeCategory);
    if (resolved) loadingGlbsRef.current.add(resolved.url);
    setLoadStatus({ loaded: 0, total: 1 });
    new AnatomyModelLoader()
      .loadCategoryModels(activeCategory, mgr, sc.clippingManager, (loaded, total) => setLoadStatus({ loaded, total }))
      .then((count) => {
        if (resolved) loadingGlbsRef.current.delete(resolved.url);
        setLoadStatus(null);
        if (count > 0) {
          if (activeCategory === 'brain') {
            sc.camera.position.set(0, 255, 230);
            sc.controls.target.set(0, 250, 15);
            sc.controls.update();
          } else {
            sc.fitCameraToObject(mgr.getRootGroup());
          }
          syncVisibility(mgr, activeCategory);
        }
      })
      .catch((err) => {
        console.error('[Atlas3DViewport] Failed to load 3D models:', err);
        setLoadStatus(null);
      });
  }, [activeCategory]);

  useEffect(() => {
    const sc = sceneRef.current;
    const mgr = nodeMgrRef.current;
    if (!sc || !mgr) return;

    if (!isStandaloneModelCategory(activeCategory)) {
      visibleSystems.forEach((sys) => {
        const glbUrl = SYSTEM_GLB_MAP[sys];
        if (glbUrl && !mgr.hasSystem(sys) && !loadingGlbsRef.current.has(glbUrl)) {
          loadingGlbsRef.current.add(glbUrl);
          setLoadStatus({ loaded: 0, total: 1 });
          new AnatomyModelLoader()
            .loadGLBModel(glbUrl, sys, mgr, sc.clippingManager)
            .then(() => {
              loadingGlbsRef.current.delete(glbUrl);
              setLoadStatus(null);
              syncVisibility(mgr, activeCategory);
            })
            .catch((err) => {
              loadingGlbsRef.current.delete(glbUrl);
              setLoadStatus(null);
              console.warn(`[Atlas3DViewport] Failed to stream system ${sys}:`, err);
            });
        }
      });
    }
    syncVisibility(mgr, activeCategory);
  }, [activeCategory, activeGender, visibleSystems, hiddenStructureIds, fadedStructureIds, fadeOthersExceptId, isolatedStructureId, systemOpacities]);

  useEffect(() => {
    ghostMgrRef.current?.sync(showGhostBody && !isStandaloneModelCategory(activeCategory), activeGender);
  }, [showGhostBody, activeGender, activeCategory]);

  useEffect(() => {
    nodeMgrRef.current?.highlightStructure(selectedStructureId, hoveredStructureId);
  }, [selectedStructureId, hoveredStructureId]);

  useEffect(() => {
    sceneRef.current?.clippingManager.updateFromConfig(clippingPlane, sceneRef.current.scene);
  }, [clippingPlane]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ touchAction: 'none' }}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none touch-none select-none"
        onPointerDown={touch.handlePointerDown}
        onPointerUp={touch.handlePointerUp}
        onPointerCancel={touch.handlePointerCancel}
        onPointerMove={touch.handlePointerMove}
      />
      {loadStatus && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-cyan-500/40 text-cyan-300 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur-md text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Streaming 3D Anatomy Meshes ({loadStatus.loaded} / {loadStatus.total})...</span>
        </div>
      )}
    </div>
  );
};
