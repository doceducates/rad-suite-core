import * as THREE from 'three';

const VALID_MATCAPS = new Set([
  'Bone',
  'Muscle',
  'Artery_V2',
  'Organs',
  'Organs_Semi_Shiny',
  'Organs_Shiny',
  'Heart',
  'Valves',
  'Lung',
  'High-Shine',
  'High-Shine-Teeth',
  'External_Genitalia',
  'Metal_v1',
]);

/**
 * Loads and caches the 13 official Human Atlas MatCap spherical lighting maps
 * from `/matcaps/<name>.png`. Safe in headless/Node test environments.
 */
class MatCapTextureCache {
  private cache = new Map<string, THREE.Texture>();
  private loader: THREE.TextureLoader | null = null;

  public get(name: string): THREE.Texture | null {
    if (typeof window === 'undefined') return null;
    const key = VALID_MATCAPS.has(name) ? name : 'Organs';
    const existing = this.cache.get(key);
    if (existing) return existing;

    if (!this.loader) {
      this.loader = new THREE.TextureLoader();
    }
    const tex = this.loader.load(`/matcaps/${key}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.cache.set(key, tex);
    return tex;
  }

  public disposeAll(): void {
    this.cache.forEach((tex) => tex.dispose());
    this.cache.clear();
  }
}

export const MatCapCache = new MatCapTextureCache();

/**
 * Attaches an additive selection/hover highlight uniform (`uHighlight`) to MeshMatcapMaterial,
 * matching the official Unity Super MatCap `_Emission` shader behavior while preserving surface normals.
 */
export function attachMatCapHighlightHook(mat: THREE.MeshMatcapMaterial): void {
  const highlightUniform = { value: new THREE.Color(0x000000) };
  mat.userData.highlightUniform = highlightUniform;
  mat.customProgramCacheKey = () => 'body-atlas-matcap-highlight-v1';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHighlight = highlightUniform;
    shader.fragmentShader =
      'uniform vec3 uHighlight;\n' +
      shader.fragmentShader.replace(
        'vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;',
        'vec3 outgoingLight = diffuseColor.rgb * clamp(matcapColor.rgb * 1.18, 0.0, 1.35) + uHighlight;'
      );
  };
}
