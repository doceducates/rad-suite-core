import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { AnatomyNodeManager } from './AnatomyNodeManager';
import type { ClippingManager } from './ClippingManager';
import { ANATOMICAL_SYSTEMS } from '../../data/systems';
import { AnatomicalDictionary } from '../../data/dictionary';
import type { AnatomicalStructure, AnatomicalSystemId } from '../../data/schema';

export interface ModelManifestItem {
  id: string;
  name: string;
  category: string;
  system: AnatomicalSystemId;
  file: string;
  sizeBytes: number;
}

export function resolveModelUrl(name: string): string {
  // If running inside full-stack Next.js environment with secure API:
  const isNextApp = typeof window !== 'undefined' && !window.location.port.includes('5847');
  if (isNextApp) {
    return `/api/anatomy/model/${name}`;
  }
  return `/models/${name}.glb`;
}

export const SYSTEM_GLB_MAP: Record<AnatomicalSystemId, string> = {
  skeletal: resolveModelUrl('skeletal'),
  muscular: resolveModelUrl('muscular'),
  circulatory: resolveModelUrl('circulatory'),
  nervous: resolveModelUrl('nervous'),
  respiratory: resolveModelUrl('respiratory'),
  digestive: resolveModelUrl('digestive'),
  urinary: resolveModelUrl('urinary'),
  reproductive: resolveModelUrl('reproductive'),
  endocrine: resolveModelUrl('endocrine'),
  lymphatic: resolveModelUrl('lymphatic'),
  integumentary: resolveModelUrl('integumentary'),
};

const GLB_CATEGORY_MAP: Record<string, { file: string; system: AnatomicalSystemId }> = {
  skull_head: { file: resolveModelUrl('skull'), system: 'skeletal' },
  skeletal: { file: resolveModelUrl('skeletal'), system: 'skeletal' },
  muscles: { file: resolveModelUrl('muscular'), system: 'muscular' },
  circulatory: { file: resolveModelUrl('circulatory'), system: 'circulatory' },
  nervous: { file: resolveModelUrl('nervous'), system: 'nervous' },
  respiratory: { file: resolveModelUrl('respiratory'), system: 'respiratory' },
  digestive: { file: resolveModelUrl('digestive'), system: 'digestive' },
  urinary: { file: resolveModelUrl('urinary'), system: 'urinary' },
  reproductive: { file: resolveModelUrl('reproductive'), system: 'reproductive' },
  endocrine: { file: resolveModelUrl('endocrine'), system: 'endocrine' },
  lymphatic: { file: resolveModelUrl('lymphatic'), system: 'lymphatic' },
  integumentary: { file: resolveModelUrl('integumentary'), system: 'integumentary' },
  visceral: { file: resolveModelUrl('visceral'), system: 'respiratory' },
  all: { file: resolveModelUrl('skeletal'), system: 'skeletal' },
};

export class AnatomyModelLoader {
  private gltfLoader = new GLTFLoader();
  private objLoader = new OBJLoader();
  private manifest: ModelManifestItem[] = [];

  public async fetchManifest(): Promise<ModelManifestItem[]> {
    if (this.manifest.length > 0) return this.manifest;
    try {
      const res = await fetch('/models/manifest.json');
      if (res.ok) {
        this.manifest = await res.json();
      }
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
    const glbTarget = GLB_CATEGORY_MAP[category];
    if (glbTarget) {
      return this.loadGLBModel(glbTarget.file, glbTarget.system, nodeManager, clippingManager, onProgress);
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
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const nodeName = mesh.name || `struct_${count}`;
              const parts = nodeName.split('_');
              const structId = parts[0];
              const cleanName = parts.slice(1).join(' ') || nodeName;

              mesh.geometry.computeVertexNormals();
              mesh.geometry.computeBoundingBox();

              const hasColors = !!mesh.geometry.attributes.color;
              const defaultColor = new THREE.Color(sysMeta.colorHex);
              const material = new THREE.MeshStandardMaterial({
                color: hasColors ? new THREE.Color(0xffffff) : defaultColor,
                vertexColors: hasColors,
                roughness: 0.35,
                metalness: 0.1,
                side: THREE.DoubleSide,
                transparent: system === 'integumentary' || sysMeta.defaultOpacity < 0.99,
                opacity: sysMeta.defaultOpacity,
              });

              const dictMatch = AnatomicalDictionary.getById(structId);
              const struct: AnatomicalStructure = dictMatch || {
                id: structId,
                slug: structId,
                name: cleanName,
                latinName: `Terminologia: ${cleanName}`,
                system,
                region: 'thorax',
                description: `${cleanName} (${sysMeta.name})`,
                modelMeshId: structId,
              };

              nodeManager.registerStructureMesh(struct, mesh.geometry, material, clippingManager);
              count++;
            }
          });

          onProgress?.(count, count);
          resolve(count);
        },
        (xhr) => {
          if (xhr.total > 0) {
            onProgress?.(xhr.loaded, xhr.total);
          }
        },
        (err) => {
          // If secure route failed and url was /api/anatomy/model/X, try fallback to /models/X.glb
          if (url.startsWith('/api/anatomy/model/')) {
            const modelName = url.replace('/api/anatomy/model/', '');
            const fallbackUrl = `/models/${modelName}.glb`;
            console.warn(`[AnatomyModelLoader] Retrying with static fallback ${fallbackUrl}`);
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
        const obj = await this.loadObjPromise(item.file);
        const sysMeta = ANATOMICAL_SYSTEMS[item.system] || ANATOMICAL_SYSTEMS.skeletal;

        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.scale(1000, 1000, 1000);
            mesh.geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(sysMeta.colorHex),
              roughness: 0.35,
              metalness: 0.1,
              side: THREE.DoubleSide,
            });

            const struct: AnatomicalStructure = {
              id: item.id,
              slug: item.id,
              name: item.name,
              latinName: `Terminologia: ${item.name}`,
              system: item.system,
              region: 'thorax',
              description: item.name,
              modelMeshId: item.id,
            };

            nodeManager.registerStructureMesh(struct, mesh.geometry, material, clippingManager);
          }
        });

        loadedCount++;
        onProgress?.(loadedCount, filtered.length);
      } catch (err) {
        console.warn(`[AnatomyModelLoader] Skipping ${item.id}:`, err);
      }
    }

    return loadedCount;
  }

  private loadObjPromise(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(url, resolve, undefined, reject);
    });
  }
}
