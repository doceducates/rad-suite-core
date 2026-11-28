import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;
  private animationFrameId: number | null = null;
  private isDisposed = false;

  constructor(options: SceneOptions) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);

    const aspect = options.canvas.clientWidth / (options.canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 1, 5000);
    this.camera.position.set(0, 0, 1200);

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(options.canvas.clientWidth, options.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Subtle Studio IBL matching Official MatCap sheen without blowing out tissue colors
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.48;

    this.controls = new OrbitControls(this.camera, options.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.85;
    this.controls.maxDistance = 5000;
    this.controls.minDistance = 15;
    this.controls.target.set(0, 0, 0);
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.clippingManager = new ClippingManager();
    this.setupLighting();
    this.startRenderLoop();
  }

  private setupLighting(): void {
    // Calibrated from Official Human Atlas level1 lighting rig (prevents whiteout wash)
    const ambientLight = new THREE.AmbientLight(0x333333, 0.55);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xf1f5f9, 0x3b2f2f, 0.45);
    this.scene.add(hemiLight);

    // Subtle Camera Headlight (0.15 vs official 0.10)
    const headlight = new THREE.DirectionalLight(0xffffff, 0.15);
    headlight.position.set(0, 0, 1);
    this.camera.add(headlight);
    this.scene.add(this.camera);

    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5f5, 0.95);
    keyLight.position.set(-400, 600, 450);
    this.scene.add(keyLight);

    // Warm Peach Reflected Bounce Light (Official [1.0, 0.871, 0.741])
    const reflectedLight = new THREE.DirectionalLight(0xffdebd, 0.75);
    reflectedLight.position.set(800, -400, 200);
    this.scene.add(reflectedLight);

    // Crisp Back Rim Light
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(400, 300, -500);
    this.scene.add(backLight);
  }

  public handleResize(width: number, height: number): void {
    if (this.isDisposed || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public fitCameraToObject(object: THREE.Object3D, offset = 1.05): void {
    const box = new THREE.Box3().setFromObject(object);
    this.focusOnBox(box, offset);
  }

  public focusOnBox(box: THREE.Box3, offset = 1.15): void {
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDist = Math.max(Math.abs((maxDim / 2) / Math.tan(fov / 2)) * offset, 65);
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    this.camera.position.copy(center).addScaledVector(dir, cameraDist);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public setCameraOrientation(view: 'anterior' | 'posterior' | 'left' | 'right' | 'superior' | 'inferior'): void {
    const target = this.controls.target;
    const dist = Math.max(this.camera.position.distanceTo(target), 200);
    switch (view) {
      case 'anterior':
        this.camera.position.set(target.x, target.y, target.z + dist);
        break;
      case 'posterior':
        this.camera.position.set(target.x, target.y, target.z - dist);
        break;
      case 'left':
        this.camera.position.set(target.x + dist, target.y, target.z);
        break;
      case 'right':
        this.camera.position.set(target.x - dist, target.y, target.z);
        break;
      case 'superior':
        this.camera.position.set(target.x, target.y + dist, target.z + 0.001);
        break;
      case 'inferior':
        this.camera.position.set(target.x, target.y - dist, target.z + 0.001);
        break;
    }
    this.camera.lookAt(target);
    this.controls.update();
  }

  public zoom(factor: number): void {
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    dir.multiplyScalar(factor);
    this.camera.position.addVectors(this.controls.target, dir);
    this.controls.update();
  }

  public setShadingMode(mode: 'default' | 'xray' | 'dark' | 'light'): void {
    if (mode === 'dark') this.scene.background = new THREE.Color(0x06090e);
    else if (mode === 'xray') this.scene.background = new THREE.Color(0x040812);
    else if (mode === 'light') this.scene.background = new THREE.Color(0xe8edf3);
    else this.scene.background = new THREE.Color(0x0d1117);
  }

  private startRenderLoop = (): void => {
    if (this.isDisposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.startRenderLoop);
  };

  public dispose(): void {
    this.isDisposed = true;
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.clippingManager.dispose(this.scene);
    this.envRT.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}
