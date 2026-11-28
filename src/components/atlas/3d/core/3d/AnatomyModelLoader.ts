import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { AnatomyNodeManager } from './AnatomyNodeManager';
import type { ClippingManager } from './ClippingManager';
import { calibrateAnatomicalMaterial } from './MaterialCalibrator';
import {
  SYSTEM_GLB_MAP,
  isStandaloneModelCategory,
  resolveCategoryUrl,
  getStaticFallbackUrl,
} from './modelRegistry';
import { ANATOMICAL_SYSTEMS } from '../../data/systems';
import { AnatomicalDictionary } from '../../data/dictionary';
import type { AnatomicalStructure, AnatomicalSystemId, NodeSexTag } from '../../data/schema';

export { SYSTEM_GLB_MAP, isStandaloneModelCategory, resolveModelUrl, resolveCategoryUrl } from './modelRegistry';

const VALID_SYSTEMS = new Set<string>(Object.keys(ANATOMICAL_SYSTEMS));

export interface ModelManifestItem {
  id: string;
  name: string;
  category: string;
  system: AnatomicalSystemId;
  file: string;
  sizeBytes: number;
}

export class AnatomyModelLoader {
  private gltfLoader = new GLTFLoader();
  private objLoader = new OBJLoader();
  private manifest: ModelManifestItem[] = [];

  public async fetchManifest(): Promise<ModelManifestItem[]> {
    if (this.manifest.length > 0) return this.manifest;
    try {
      const res = await fetch('/models/manifest.json');
      if (res.ok) this.manifest = await res.json();
    } catch (err) {
      console.error('[AnatomyModelLoader] Failed to fetch manifest:', err);
    }
    return this.manifest;
  }

  public async loadCategoryModels(
    category: string,
    nodeManager: AnatomyNodeManager,
    clippingManager: ClippingManager,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<number> {
    const resolved = resolveCategoryUrl(category);
    if (resolved) {
      return this.loadGLBModel(resolved.url, resolved.system, nodeManager, clippingManager, onProgress);
    }
    return this.loadLegacyObjCategory(category, nodeManager, clippingManager, onProgress);
  }

  public async loadGLBModel(
    url: string,
    system: AnatomicalSystemId,
    nodeManager: AnatomyNodeManager,
    clippingManager: ClippingManager,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          let count = 0;
          const sysMeta = ANATOMICAL_SYSTEMS[system] || ANATOMICAL_SYSTEMS.skeletal;

          gltf.scene.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            const nodeExtras = (mesh.userData || {}) as Record<string, unknown>;
            const nodeName = mesh.name || `struct_${count}`;
            const parts = nodeName.split('_');
            const structId = typeof nodeExtras.sid === 'string' ? nodeExtras.sid : parts[0];
            const cleanName = parts.slice(1).join(' ') || nodeName;
            const rawSys = typeof nodeExtras.system === 'string' ? nodeExtras.system : '';
            const nodeSystem: AnatomicalSystemId = VALID_SYSTEMS.has(rawSys)
              ? (rawSys as AnatomicalSystemId)
              : system;
            const sex = (nodeExtras.sex as NodeSexTag) || 'shared';

            if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
            mesh.geometry.computeBoundingBox();

            const calibrated = calibrateAnatomicalMaterial(mesh, nodeSystem, nodeExtras);
            const dictMatch = AnatomicalDictionary.getById(structId);
            const struct: AnatomicalStructure = dictMatch
              ? { ...dictMatch, system: nodeSystem }
              : {
                  id: structId,
                  slug: structId,
                  name: cleanName,
                  latinName: `Terminologia: ${cleanName}`,
                  system: nodeSystem,
                  region: nodeSystem === 'nervous' ? 'head_neck' : 'thorax',
                  description: `${cleanName} (${sysMeta.name})`,
                  modelMeshId: structId,
                };

            nodeManager.registerStructureMesh(struct, mesh.geometry, calibrated.material, clippingManager, {
              sex,
              defaultTransparent: calibrated.defaultTransparent,
              defaultOpacity: calibrated.defaultOpacity,
              renderOrder: calibrated.renderOrder,
            });
            count++;
          });

          onProgress?.(count, count);
          resolve(count);
        },
        (xhr) => {
          if (xhr.total > 0) onProgress?.(xhr.loaded, xhr.total);
        },
        (err) => {
          if (url.startsWith('/api/anatomy/model/')) {
            const fallbackUrl = getStaticFallbackUrl(url.replace('/api/anatomy/model/', ''));
            this.loadGLBModel(fallbackUrl, system, nodeManager, clippingManager, onProgress)
              .then(resolve)
              .catch(reject);
            return;
          }
          reject(err);
        }
      );
    });
  }

  private async loadLegacyObjCategory(
    category: string,
    nodeManager: AnatomyNodeManager,
    clippingManager: ClippingManager,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<number> {
    const items = await this.fetchManifest();
    const filtered = items.filter((i) => i.category === category);
    let loadedCount = 0;

    for (const item of filtered) {
      try {
        const obj = await new Promise<THREE.Group>((res, rej) =>
          this.objLoader.load(item.file, res, undefined, rej)
        );
        const sysMeta = ANATOMICAL_SYSTEMS[item.system] || ANATOMICAL_SYSTEMS.skeletal;

        obj.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          mesh.geometry.scale(1000, 1000, 1000);
          mesh.geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(sysMeta.colorHex),
            roughness: 0.45,
            metalness: 0.04,
            side: THREE.FrontSide,
          });
          nodeManager.registerStructureMesh(
            {
              id: item.id,
              slug: item.id,
              name: item.name,
              latinName: `Terminologia: ${item.name}`,
              system: item.system,
              region: 'thorax',
              description: item.name,
              modelMeshId: item.id,
            },
            mesh.geometry,
            material,
            clippingManager
          );
        });
        loadedCount++;
        onProgress?.(loadedCount, filtered.length);
      } catch (err) {
        console.warn(`[AnatomyModelLoader] Skipping ${item.id}:`, err);
      }
    }
    return loadedCount;
  }
}
