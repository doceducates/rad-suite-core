import * as THREE from 'three';
import type { AnatomicalStructure, AnatomicalSystemId } from '../../data/schema';
import type { ClippingManager } from './ClippingManager';

export interface NodeMeshMeta {
  structureId: string;
  system: AnatomicalSystemId;
  baseColor: THREE.Color;
  mesh: THREE.Mesh;
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
    material: THREE.MeshStandardMaterial,
    clippingManager: ClippingManager
  ): THREE.Mesh {
    clippingManager.applyToMaterial(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { structureId: structure.id, system: structure.system };

    this.rootGroup.add(mesh);
    this.nodeMap.set(mesh.uuid, {
      structureId: structure.id,
      system: structure.system,
      baseColor: material.color.clone(),
      mesh,
    });
    return mesh;
  }

  public updateVisibility(
    visibleSystems: Set<AnatomicalSystemId>,
    hiddenIds: Set<string>,
    isolatedId: string | null,
    systemOpacities: Record<AnatomicalSystemId, number>
  ): void {
    this.nodeMap.forEach((meta) => {
      const isSystemVisible = visibleSystems.has(meta.system);
      const isHidden = hiddenIds.has(meta.structureId);
      const isIsolatedMatch = isolatedId === null || isolatedId === meta.structureId;

      const shouldShow = isSystemVisible && !isHidden && isIsolatedMatch;
      meta.mesh.visible = shouldShow;

      if (shouldShow) {
        const targetOpacity = systemOpacities[meta.system] ?? 1.0;
        const mat = meta.mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = targetOpacity < 0.99;
        mat.opacity = targetOpacity;
      }
    });
  }

  public highlightStructure(selectedId: string | null, hoveredId: string | null): void {
    this.nodeMap.forEach((meta) => {
      const mat = meta.mesh.material as THREE.MeshStandardMaterial;
      if (meta.structureId === selectedId) {
        mat.emissive.setHex(0x00e5ff); // Cyan diagnostic highlight
        mat.emissiveIntensity = 0.45;
      } else if (meta.structureId === hoveredId) {
        mat.emissive.setHex(0x38bdf8); // Soft cyan hover
        mat.emissiveIntensity = 0.25;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
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
    this.nodeMap.forEach((meta) => {
      meta.mesh.geometry.dispose();
      (meta.mesh.material as THREE.Material).dispose();
    });
    this.nodeMap.clear();
    scene.remove(this.rootGroup);
  }
}
