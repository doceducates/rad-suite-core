import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ClippingManager } from './ClippingManager';

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
}

export class AtlasScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public clippingManager: ClippingManager;
  private animationFrameId: number | null = null;
  private isDisposed = false;

  constructor(options: SceneOptions) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117); // Professional dark workstation background

    const aspect = options.canvas.clientWidth / (options.canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 5000);
    this.camera.position.set(0, 0, 1200); // Standard full-body anatomical view distance

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    this.renderer.setSize(options.canvas.clientWidth, options.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, options.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 5000;
    this.controls.minDistance = 20;
    this.controls.target.set(0, 0, 0);

    this.clippingManager = new ClippingManager();
    this.setupLighting();
    this.startRenderLoop();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Medical Headlight attached to camera
    const headlight = new THREE.DirectionalLight(0xffffff, 1.0);
    headlight.position.set(0, 0, 1);
    this.camera.add(headlight);
    this.scene.add(this.camera);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    keyLight.position.set(500, 800, 600);
    this.scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xb0d4ff, 0.6);
    fillLight.position.set(-500, -200, -400);
    this.scene.add(fillLight);
  }

  public handleResize(width: number, height: number): void {
    if (this.isDisposed || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public fitCameraToObject(object: THREE.Object3D, offset = 1.05): void {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraZ = Math.max(Math.abs((maxDim / 2) / Math.tan(fov / 2)) * offset, 150);
    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  private startRenderLoop = (): void => {
    if (this.isDisposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.startRenderLoop);
  };

  public dispose(): void {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();
    this.clippingManager.dispose(this.scene);
    this.renderer.dispose();
    this.scene.clear();
  }
}
