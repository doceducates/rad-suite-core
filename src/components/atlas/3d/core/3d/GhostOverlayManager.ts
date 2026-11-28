import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AnatomicalSex } from '../../data/schema';
import { resolveModelUrl, getStaticFallbackUrl } from './modelRegistry';

/**
 * Manages the non-interactive anatomical Ghost Silhouette shell (Male_Ghost / Female_Ghost)
 * loaded once from `ghost.glb` and toggled cleanly per active sex.
 */
export class GhostOverlayManager {
  private group = new THREE.Group();
  private loader = new GLTFLoader();
  private isLoaded = false;
  private isLoading = false;

  constructor(scene: THREE.Scene) {
    this.group.name = 'GhostBodySilhouette';
    this.group.visible = false;
    scene.add(this.group);
  }

  public sync(show: boolean, gender: AnatomicalSex): void {
    this.group.visible = show;
    if (!show) return;

    if (this.isLoaded) {
      this.group.children.forEach((child) => {
        const sex = child.userData?.sex as string | undefined;
        child.visible = !sex || sex === gender;
      });
      return;
    }
    if (this.isLoading) return;

    this.isLoading = true;
    const url = resolveModelUrl('ghost');
    this.loadFromUrl(url, gender, true);
  }

  private loadFromUrl(url: string, gender: AnatomicalSex, allowFallback: boolean): void {
    this.loader.load(
      url,
      (gltf) => {
        this.isLoading = false;
        this.isLoaded = true;
        const ghostMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x93c5fd),
          transparent: true,
          opacity: 0.13,
          roughness: 0.25,
          metalness: 0.05,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            const sex =
              (m.userData?.sex as string) ||
              (/female/i.test(m.name) ? 'female' : 'male');
            const ghostMesh = new THREE.Mesh(m.geometry, ghostMat.clone());
            ghostMesh.renderOrder = 2;
            ghostMesh.userData = { sex };
            ghostMesh.visible = sex === gender;
            ghostMesh.raycast = () => {};
            this.group.add(ghostMesh);
          }
        });
      },
      undefined,
      () => {
        if (allowFallback && url.startsWith('/api/anatomy/model/')) {
          this.loadFromUrl(getStaticFallbackUrl('ghost'), gender, false);
          return;
        }
        this.isLoading = false;
      }
    );
  }

  private clearMeshes(): void {
    this.group.children.forEach((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.group.clear();
  }

  public dispose(scene: THREE.Scene): void {
    this.clearMeshes();
    scene.remove(this.group);
  }
}
