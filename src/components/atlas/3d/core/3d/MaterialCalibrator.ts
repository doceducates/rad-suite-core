import * as THREE from 'three';
import { ANATOMICAL_SYSTEMS } from '../../data/systems';
import type { AnatomicalSystemId } from '../../data/schema';
import { MatCapCache, attachMatCapHighlightHook } from './MatCapCache';

export type AnatomicalMaterial = THREE.MeshStandardMaterial | THREE.MeshMatcapMaterial;

export interface CalibratedMaterialResult {
  material: AnatomicalMaterial;
  defaultTransparent: boolean;
  defaultOpacity: number;
  renderOrder: number;
}

/**
 * Calibrates GLTF loaded materials using the official Human Atlas pipeline:
 * - Binds cached Tissue MatCap + Diffuse UV Texture + Normal Map via MeshMatcapMaterial
 * - Falls back cleanly to calibrated MeshStandardMaterial if MatCap textures are unavailable
 * - Enforces strict opaque depth writing vs explicit translucent queue sorting (`renderOrder`)
 */
export function calibrateAnatomicalMaterial(
  mesh: THREE.Mesh,
  system: AnatomicalSystemId,
  extras?: Record<string, unknown>
): CalibratedMaterialResult {
  const sysMeta = ANATOMICAL_SYSTEMS[system] || ANATOMICAL_SYSTEMS.skeletal;
  const srcMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const stdSrc = srcMat instanceof THREE.MeshStandardMaterial ? srcMat : null;

  const matExtras = (stdSrc?.userData || extras || {}) as Record<string, unknown>;
  const matcapName = typeof matExtras.matcap === 'string' ? matExtras.matcap : null;
  const rawQueue =
    typeof matExtras.renderOrder === 'number'
      ? matExtras.renderOrder
      : typeof matExtras.queue === 'number'
      ? matExtras.queue
      : 2000;

  const hasMap = Boolean(stdSrc?.map);
  const hasVertexColors = !hasMap && Boolean(mesh.geometry.attributes.color);
  const isHair = /hair|lash/i.test(stdSrc?.name || '');

  const srcTransparent = Boolean(stdSrc?.transparent && stdSrc.opacity < 0.99);
  const isIntegumentary = system === 'integumentary' && !isHair;
  const defaultTransparent = srcTransparent || isIntegumentary;
  const defaultOpacity = srcTransparent
    ? stdSrc!.opacity
    : isIntegumentary
    ? sysMeta.defaultOpacity
    : 1.0;

  if (stdSrc?.map) {
    stdSrc.map.colorSpace = THREE.SRGBColorSpace;
  }
  if (stdSrc?.normalMap) {
    stdSrc.normalMap.colorSpace = THREE.NoColorSpace;
  }

  const baseColor = hasMap
    ? (stdSrc?.color?.clone() ?? new THREE.Color(0xffffff))
    : hasVertexColors
    ? new THREE.Color(0xffffff)
    : (stdSrc?.color?.clone() ?? new THREE.Color(sysMeta.colorHex));

  const alphaTest = stdSrc?.alphaTest && stdSrc.alphaTest > 0 ? stdSrc.alphaTest : isHair ? 0.35 : 0;
  const side = stdSrc?.side ?? (isHair ? THREE.DoubleSide : THREE.FrontSide);
  const depthWrite = !defaultTransparent || defaultOpacity > 0.95;
  const renderOrder = defaultTransparent ? Math.max(1, rawQueue - 2990) : 0;

  // Use official MatCap + Albedo + NormalMap pipeline whenever MatCap texture resolves in browser
  const matcapTex = matcapName ? MatCapCache.get(matcapName) : null;
  if (matcapTex) {
    const mat = new THREE.MeshMatcapMaterial({
      name: stdSrc?.name || `${system}_matcap`,
      color: baseColor,
      matcap: matcapTex,
      map: stdSrc?.map ?? null,
      normalMap: stdSrc?.normalMap ?? null,
      normalScale: new THREE.Vector2(1.0, 1.0),
      vertexColors: hasVertexColors,
      side,
      alphaTest,
      transparent: defaultTransparent,
      opacity: defaultOpacity,
      depthWrite,
    });
    attachMatCapHighlightHook(mat);
    return { material: mat, defaultTransparent, defaultOpacity, renderOrder };
  }

  // Fallback PBR calibration (headless / Vitest / untextured legacy meshes)
  const fallback = new THREE.MeshStandardMaterial({
    name: stdSrc?.name || `${system}_std`,
    color: baseColor,
    map: stdSrc?.map ?? null,
    normalMap: stdSrc?.normalMap ?? null,
    normalScale: new THREE.Vector2(1.0, 1.0),
    vertexColors: hasVertexColors,
    roughness: stdSrc?.roughness ?? 0.45,
    metalness: stdSrc?.metalness ?? 0.04,
    envMapIntensity: 0.6,
    side,
    alphaTest,
    transparent: defaultTransparent,
    opacity: defaultOpacity,
    depthWrite,
  });

  return { material: fallback, defaultTransparent, defaultOpacity, renderOrder };
}
