import * as THREE from 'three';
import type { AnatomicalSex, AnatomicalStructure, AnatomicalSystemId, NodeSexTag } from '../../data/schema';
import type { ClippingManager } from './ClippingManager';
import type { AnatomicalMaterial } from './MaterialCalibrator';

export interface NodeMeshMeta {
  structureId: string;
  system: AnatomicalSystemId;
  sex: NodeSexTag;
  baseColor: THREE.Color;
  defaultTransparent: boolean;
  defaultOpacity: number;
  defaultDepthWrite: boolean;
  mesh: THREE.Mesh;
}

export interface RegisterMeshOptions {
  sex?: NodeSexTag;
  defaultTransparent?: boolean;
  defaultOpacity?: number;
  renderOrder?: number;
}

export class AnatomyNodeManager {
  private rootGroup: THREE.Group;
  private nodeMap: Map<string, NodeMeshMeta> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'AnatomicalStructuresRoot';
    scene.add(this.rootGroup);
  }

  public registerStructureMesh(
    structure: AnatomicalStructure,
    geometry: THREE.BufferGeometry,
    material: AnatomicalMaterial,
    clippingManager: ClippingManager,
    options?: RegisterMeshOptions
  ): THREE.Mesh {
    clippingManager.applyToMaterial(material);
    const mesh = new THREE.Mesh(geometry, material);
    const defaultTransparent = options?.defaultTransparent ?? material.transparent;
    const defaultOpacity = options?.defaultOpacity ?? material.opacity;
    const defaultDepthWrite = !defaultTransparent || defaultOpacity > 0.95;

    mesh.castShadow = !defaultTransparent;
    mesh.receiveShadow = true;
    if (options?.renderOrder !== undefined) {
      mesh.renderOrder = options.renderOrder;
    }
    mesh.userData = {
      structureId: structure.id,
      system: structure.system,
      sex: options?.sex ?? 'shared',
    };

    this.rootGroup.add(mesh);
    this.nodeMap.set(mesh.uuid, {
      structureId: structure.id,
      system: structure.system,
      sex: options?.sex ?? 'shared',
      baseColor: material.color.clone(),
      defaultTransparent,
      defaultOpacity,
      defaultDepthWrite,
      mesh,
    });
    return mesh;
  }

  public updateVisibility(
    visibleSystems: Set<AnatomicalSystemId>,
    hiddenIds: Set<string>,
    isolatedId: string | null,
    systemOpacities: Record<AnatomicalSystemId, number>,
    activeGender: AnatomicalSex = 'male',
    fadedIds: Set<string> = new Set(),
    fadeOthersExceptId: string | null = null,
    isStandaloneScene = false
  ): void {
    this.nodeMap.forEach((meta) => {
      const isSexMatch = isStandaloneScene || meta.sex === 'shared' || meta.sex === activeGender;
      const isSystemVisible = isStandaloneScene || visibleSystems.has(meta.system);
      const isHidden = hiddenIds.has(meta.structureId);
      const isIsolatedMatch = isolatedId === null || isolatedId === meta.structureId;

      const shouldShow = isSexMatch && isSystemVisible && !isHidden && isIsolatedMatch;
      meta.mesh.visible = shouldShow;

      if (shouldShow) {
        const sysOpacity = systemOpacities[meta.system] ?? 1.0;
        const isFadedByToggle =
          fadedIds.has(meta.structureId) ||
          (fadeOthersExceptId !== null && meta.structureId !== fadeOthersExceptId);
        const baseTarget = meta.defaultOpacity < 0.99 ? Math.min(sysOpacity, meta.defaultOpacity) : sysOpacity;
        const targetOpacity = isFadedByToggle ? Math.min(baseTarget, 0.22) : baseTarget;

        const mat = meta.mesh.material as AnatomicalMaterial;
        const nextTransparent = targetOpacity < 0.99 || meta.defaultTransparent;
        if (mat.transparent !== nextTransparent) {
          mat.transparent = nextTransparent;
          mat.needsUpdate = true;
        }
        mat.opacity = targetOpacity;
        mat.depthWrite = !nextTransparent || targetOpacity > 0.95;
      }
    });
  }

  public highlightStructure(selectedId: string | null, hoveredId: string | null): void {
    this.nodeMap.forEach((meta) => {
      const mat = meta.mesh.material as AnatomicalMaterial;
      const isSelected = meta.structureId === selectedId;
      const isHovered = !isSelected && meta.structureId === hoveredId;

      const highlightUniform = mat.userData?.highlightUniform as { value: THREE.Color } | undefined;
      if (highlightUniform?.value) {
        if (isSelected) highlightUniform.value.setHex(0x006b80);
        else if (isHovered) highlightUniform.value.setHex(0x1a5670);
        else highlightUniform.value.setHex(0x000000);
        return;
      }

      if (mat instanceof THREE.MeshStandardMaterial) {
        if (isSelected) {
          mat.emissive.setHex(0x00e0ff);
          mat.emissiveIntensity = 0.25;
        } else if (isHovered) {
          mat.emissive.setHex(0x38bdf8);
          mat.emissiveIntensity = 0.14;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    });
  }

  public getStructureBounds(structureId: string): THREE.Box3 | null {
    const box = new THREE.Box3();
    let found = false;
    this.nodeMap.forEach((meta) => {
      if (meta.structureId === structureId && meta.mesh.visible) {
        box.expandByObject(meta.mesh);
        found = true;
      }
    });
    return found ? box : null;
  }

  public raycast(
    event: MouseEvent | Touch,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement
  ): string | null {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const visibleMeshes: THREE.Mesh[] = [];
    this.nodeMap.forEach((n) => {
      if (n.mesh.visible) visibleMeshes.push(n.mesh);
    });

    const intersects = this.raycaster.intersectObjects(visibleMeshes, false);
    if (intersects.length > 0) {
      return (intersects[0].object.userData.structureId as string) || null;
    }
    return null;
  }

  public getRootGroup(): THREE.Group {
    return this.rootGroup;
  }

  public hasSystem(system: AnatomicalSystemId): boolean {
    for (const meta of this.nodeMap.values()) {
      if (meta.system === system) return true;
    }
    return false;
  }

  public clear(): void {
    this.nodeMap.forEach((meta) => {
      this.rootGroup.remove(meta.mesh);
      meta.mesh.geometry.dispose();
      (meta.mesh.material as THREE.Material).dispose();
    });
    this.nodeMap.clear();
  }

  public dispose(scene: THREE.Scene): void {
    this.clear();
    scene.remove(this.rootGroup);
  }
}
