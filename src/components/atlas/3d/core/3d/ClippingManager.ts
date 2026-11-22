import * as THREE from 'three';
import type { ClippingPlaneConfig, ClippingAxis } from '../../state/atlasStore';

export class ClippingManager {
  private plane: THREE.Plane;
  private planeHelper: THREE.PlaneHelper | null = null;
  private isEnabled = false;
  private registeredMaterials: Set<THREE.Material> = new Set();

  constructor() {
    this.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  }

  public getPlane(): THREE.Plane {
    return this.plane;
  }

  public updateFromConfig(config: ClippingPlaneConfig, scene: THREE.Scene): void {
    this.isEnabled = config.enabled;

    if (!config.enabled) {
      if (this.planeHelper) {
        scene.remove(this.planeHelper);
        this.planeHelper.dispose();
        this.planeHelper = null;
      }
      this.registeredMaterials.forEach((mat) => {
        mat.clippingPlanes = null;
        mat.needsUpdate = true;
      });
      return;
    }

    const normal = this.getNormalForAxis(config.axis, config.inverted);
    this.plane.normal.copy(normal);
    this.plane.constant = config.inverted ? -config.offsetMm : config.offsetMm;

    this.registeredMaterials.forEach((mat) => {
      mat.clippingPlanes = [this.plane];
      mat.needsUpdate = true;
    });

    if (config.showPlaneHelper) {
      if (!this.planeHelper) {
        this.planeHelper = new THREE.PlaneHelper(this.plane, 350, 0x00e5ff);
        this.planeHelper.renderOrder = 999;
        scene.add(this.planeHelper);
      } else {
        this.planeHelper.plane = this.plane;
        this.planeHelper.updateMatrixWorld(true);
      }
    } else if (this.planeHelper) {
      scene.remove(this.planeHelper);
      this.planeHelper.dispose();
      this.planeHelper = null;
    }
  }

  private getNormalForAxis(axis: ClippingAxis, inverted: boolean): THREE.Vector3 {
    const sign = inverted ? 1 : -1;
    switch (axis) {
      case 'axial':
        return new THREE.Vector3(0, sign, 0);
      case 'sagittal':
        return new THREE.Vector3(sign, 0, 0);
      case 'coronal':
        return new THREE.Vector3(0, 0, sign);
      default:
        return new THREE.Vector3(0, sign, 0);
    }
  }

  public applyToMaterial(material: THREE.Material): void {
    this.registeredMaterials.add(material);
    material.clippingPlanes = this.isEnabled ? [this.plane] : null;
    material.clipShadows = true;
    material.needsUpdate = true;
  }

  public dispose(scene: THREE.Scene): void {
    if (this.planeHelper) {
      scene.remove(this.planeHelper);
      this.planeHelper.dispose();
      this.planeHelper = null;
    }
    this.registeredMaterials.clear();
  }
}
