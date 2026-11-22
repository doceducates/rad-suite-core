'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AtlasScene } from '../core/3d/AtlasScene';
import { AnatomyNodeManager } from '../core/3d/AnatomyNodeManager';
import { AnatomyModelLoader, SYSTEM_GLB_MAP } from '../core/3d/AnatomyModelLoader';
import { useAtlasStore } from '../state/atlasStore';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';
import type { AnatomicalSystemId } from '../data/schema';
import { Loader2 } from 'lucide-react';

interface Atlas3DViewportProps {
  className?: string;
  activeCategory?: string;
  onStructureClick?: (id: string) => void;
}

export const Atlas3DViewport: React.FC<Atlas3DViewportProps> = ({
  className = 'w-full h-full',
  activeCategory = 'skeletal',
  onStructureClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<AtlasScene | null>(null);
  const nodeMgrRef = useRef<AnatomyNodeManager | null>(null);
  const loadingGlbsRef = useRef<Set<string>>(new Set());
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [loadStatus, setLoadStatus] = useState<{ loaded: number; total: number } | null>(null);

  const {
    visibleSystems,
    systemOpacities,
    hiddenStructureIds,
    isolatedStructureId,
    selectedStructureId,
    hoveredStructureId,
    clippingPlane,
    selectStructure,
    hoverStructure,
  } = useAtlasStore();

  // 1. Initialize Three.js Scene once on canvas mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const atlasScene = new AtlasScene({ canvas });
    const nodeManager = new AnatomyNodeManager(atlasScene.scene);

    sceneRef.current = atlasScene;
    nodeMgrRef.current = nodeManager;
    (window as any).__ATLAS_DEBUG__ = { atlasScene, nodeManager };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        atlasScene.handleResize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      nodeManager.dispose(atlasScene.scene);
      atlasScene.dispose();
      sceneRef.current = null;
      nodeMgrRef.current = null;
    };
  }, []);

  // 2. Load 3D Meshes when activeCategory changes
  useEffect(() => {
    const atlasScene = sceneRef.current;
    const nodeManager = nodeMgrRef.current;
    if (!atlasScene || !nodeManager) return;

    nodeManager.clear();
    loadingGlbsRef.current.clear();
    const modelLoader = new AnatomyModelLoader();

    setLoadStatus({ loaded: 0, total: 1 });
    modelLoader
      .loadCategoryModels(
        activeCategory,
        nodeManager,
        atlasScene.clippingManager,
        (loaded, total) => setLoadStatus({ loaded, total })
      )
      .then((count) => {
        setLoadStatus(null);
        if (count > 0) {
          atlasScene.fitCameraToObject(nodeManager.getRootGroup());
          nodeManager.updateVisibility(
            visibleSystems,
            hiddenStructureIds,
            isolatedStructureId,
            systemOpacities
          );
        }
      })
      .catch((err) => {
        console.error('[Atlas3DViewport] Failed to load 3D models:', err);
        setLoadStatus(null);
      });
  }, [activeCategory]);

  // 3. Dynamic On-Demand System Loading & Visibility / Opacity Updates
  useEffect(() => {
    const atlasScene = sceneRef.current;
    const nodeManager = nodeMgrRef.current;
    if (!atlasScene || !nodeManager) return;

    visibleSystems.forEach((sys) => {
      const glbUrl = SYSTEM_GLB_MAP[sys];
      if (glbUrl && !nodeManager.hasSystem(sys) && !loadingGlbsRef.current.has(glbUrl)) {
        loadingGlbsRef.current.add(glbUrl);
        setLoadStatus({ loaded: 0, total: 1 });
        const loader = new AnatomyModelLoader();
        loader
          .loadGLBModel(glbUrl, sys, nodeManager, atlasScene.clippingManager)
          .then(() => {
            loadingGlbsRef.current.delete(glbUrl);
            setLoadStatus(null);
            nodeManager.updateVisibility(
              useAtlasStore.getState().visibleSystems,
              useAtlasStore.getState().hiddenStructureIds,
              useAtlasStore.getState().isolatedStructureId,
              useAtlasStore.getState().systemOpacities
            );
          })
          .catch((err) => {
            loadingGlbsRef.current.delete(glbUrl);
            setLoadStatus(null);
            console.warn(`[Atlas3DViewport] Failed to stream system ${sys}:`, err);
          });
      }
    });

    nodeManager.updateVisibility(
      visibleSystems,
      hiddenStructureIds,
      isolatedStructureId,
      systemOpacities
    );
  }, [visibleSystems, hiddenStructureIds, isolatedStructureId, systemOpacities]);

  // 4. Update highlights & clipping
  useEffect(() => {
    nodeMgrRef.current?.highlightStructure(selectedStructureId, hoveredStructureId);
  }, [selectedStructureId, hoveredStructureId]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.clippingManager.updateFromConfig(clippingPlane, sceneRef.current.scene);
    }
  }, [clippingPlane]);

  // 5. Precise Pointer & Selection Interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !sceneRef.current || !nodeMgrRef.current) return;
    const dist = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
    if (dist < 6) {
      const hitId = nodeMgrRef.current.raycast(e.nativeEvent, sceneRef.current.camera, canvasRef.current);
      selectStructure(hitId);
      if (hitId) {
        onStructureClick?.(hitId);
        AtlasNavBus.emitStructureSelect({
          structureId: hitId,
          name: hitId.replace(/_/g, ' '),
          source: 'atlas_3d',
        });
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !sceneRef.current || !nodeMgrRef.current) return;
    const hitId = nodeMgrRef.current.raycast(e.nativeEvent, sceneRef.current.camera, canvasRef.current);
    hoverStructure(hitId);
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
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
