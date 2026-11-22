/**
 * GLSL Raymarching Shaders for 3D Volume Rendering & Maximum Intensity Projection (<250 lines).
 * Implements Vitrea Gradient-Illuminated Rendering (GIR), Blinn-Phong specular shading,
 * 6-tap central difference gradient normals, stochastic ray jittering, and early ray termination.
 */

export const volumeRaymarchingVertexShader = /* glsl */ `
  varying vec3 vOrigin;
  varying vec3 vDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Transform camera to model unit cube space [0, 1]
    vec4 localCam = inverse(modelMatrix) * vec4(cameraPosition, 1.0);
    vOrigin = localCam.xyz / localCam.w + 0.5;
    vDirection = (position + 0.5) - vOrigin;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const volumeRaymarchingFragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;

  uniform sampler3D u_volume;
  uniform int u_preset; // 0 = MIP, 1 = BONE, 2 = BRAIN, 3 = VASCULAR, 4 = ABDOMINAL, 5 = LUNG
  uniform float u_threshold; // Cutoff threshold [0.0, 1.0]
  uniform float u_windowWidth;
  uniform float u_windowCenter;
  uniform int u_steps;

  varying vec3 vOrigin;
  varying vec3 vDirection;
  varying vec2 vUv;

  // Slab ray-box intersection against [0, 1]^3 volume box
  vec2 hitBox(vec3 orig, vec3 dir) {
    vec3 boxMin = vec3(0.0);
    vec3 boxMax = vec3(1.0);
    vec3 invDir = 1.0 / max(abs(dir), vec3(1e-6)) * sign(dir);
    vec3 t0 = (boxMin - orig) * invDir;
    vec3 t1 = (boxMax - orig) * invDir;
    vec3 tMin = min(t0, t1);
    vec3 tMax = max(t0, t1);
    float tNear = max(max(tMin.x, tMin.y), tMin.z);
    float tFar = min(min(tMax.x, tMax.y), tMax.z);
    return vec2(tNear, tFar);
  }

  // 6-tap central difference gradient for physical surface normals
  vec3 computeGradient(vec3 pos, vec3 step) {
    float dx = texture(u_volume, pos + vec3(step.x, 0.0, 0.0)).r - texture(u_volume, pos - vec3(step.x, 0.0, 0.0)).r;
    float dy = texture(u_volume, pos + vec3(0.0, step.y, 0.0)).r - texture(u_volume, pos - vec3(0.0, step.y, 0.0)).r;
    float dz = texture(u_volume, pos + vec3(0.0, 0.0, step.z)).r - texture(u_volume, pos - vec3(0.0, 0.0, step.z)).r;
    return vec3(dx, dy, dz);
  }

  // PRNG hash for stochastic jittering (eliminates woodgrain slicing artifacts)
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 rayDir = normalize(vDirection);
    vec2 bounds = hitBox(vOrigin, rayDir);

    if (bounds.x > bounds.y) discard;

    bounds.x = max(bounds.x, 0.0);
    float tNear = bounds.x;
    float tFar = bounds.y;

    float dt = (tFar - tNear) / float(u_steps);
    vec3 gradStep = vec3(1.0 / 256.0);

    // Stochastic jittering to eliminate step Moire banding
    float jitter = hash(vUv * 512.0) * dt;
    vec3 p = vOrigin + (tNear + jitter) * rayDir;
    vec3 stepVec = rayDir * dt;

    float maxDensity = 0.0;
    vec4 accumColor = vec4(0.0);

    vec3 L = normalize(vec3(0.6, 0.8, 1.0)); // Camera-relative directional key light
    vec3 V = -rayDir;

    for (int i = 0; i < 256; i++) {
      if (i >= u_steps) break;

      float val = texture(u_volume, p).r;

      // Mode 0: Maximum Intensity Projection (MIP)
      if (u_preset == 0) {
        if (val > maxDensity && val >= u_threshold) {
          maxDensity = val;
        }
      }
      // Mode 1: Vitrea Bone 3D GIR (Gradient-Illuminated Rendering)
      else if (u_preset == 1) {
        if (val >= u_threshold) {
          vec3 grad = computeGradient(p, gradStep);
          float gradMag = length(grad);
          vec3 N = gradMag > 0.001 ? normalize(-grad) : vec3(0.0);

          vec3 H = normalize(L + V);
          float NdotL = max(0.0, dot(N, L));
          float NdotH = max(0.0, dot(N, H));
          float spec = (gradMag > 0.01) ? pow(NdotH, 32.0) * 0.45 : 0.0;

          vec3 baseColor = mix(vec3(0.85, 0.76, 0.65), vec3(0.98, 0.96, 0.92), val);
          vec3 shaded = baseColor * (0.35 + 0.65 * NdotL) + vec3(spec);
          float alpha = (val - u_threshold) / max(0.01, 1.0 - u_threshold) * 0.16;

          accumColor.rgb += (1.0 - accumColor.a) * alpha * shaded;
          accumColor.a += (1.0 - accumColor.a) * alpha;
          if (accumColor.a >= 0.98) break;
        }
      }
      // Mode 2: Vitrea Neuro / Brain & Soft Tissue
      else if (u_preset == 2) {
        if (val >= u_threshold) {
          vec3 grad = computeGradient(p, gradStep);
          float gradMag = length(grad);
          vec3 N = gradMag > 0.001 ? normalize(-grad) : vec3(0.0);

          float NdotL = max(0.0, dot(N, L));
          vec3 baseColor = mix(vec3(0.35, 0.48, 0.65), vec3(0.92, 0.70, 0.60), val);
          vec3 shaded = baseColor * (0.45 + 0.55 * NdotL);
          float alpha = smoothstep(u_threshold, 1.0, val) * 0.09;

          accumColor.rgb += (1.0 - accumColor.a) * alpha * shaded;
          accumColor.a += (1.0 - accumColor.a) * alpha;
          if (accumColor.a >= 0.98) break;
        }
      }
      // Mode 3: Vitrea Vascular Angiography CTA / MRA
      else if (u_preset == 3) {
        if (val >= u_threshold) {
          vec3 grad = computeGradient(p, gradStep);
          float gradMag = length(grad);
          vec3 N = gradMag > 0.001 ? normalize(-grad) : vec3(0.0);

          vec3 H = normalize(L + V);
          float NdotL = max(0.0, dot(N, L));
          float NdotH = max(0.0, dot(N, H));
          float spec = (gradMag > 0.01) ? pow(NdotH, 24.0) * 0.5 : 0.0;

          vec3 vascColor = mix(vec3(0.85, 0.12, 0.15), vec3(1.0, 0.75, 0.35), val);
          vec3 shaded = vascColor * (0.35 + 0.65 * NdotL) + vec3(spec);
          float alpha = smoothstep(u_threshold, 0.95, val) * 0.20;

          accumColor.rgb += (1.0 - accumColor.a) * alpha * shaded;
          accumColor.a += (1.0 - accumColor.a) * alpha;
          if (accumColor.a >= 0.98) break;
        }
      }
      // Mode 4: Vitrea Abdominal Soft Tissue
      else if (u_preset == 4) {
        if (val >= u_threshold) {
          vec3 grad = computeGradient(p, gradStep);
          vec3 N = length(grad) > 0.001 ? normalize(-grad) : vec3(0.0);
          float NdotL = max(0.0, dot(N, L));

          vec3 baseColor = mix(vec3(0.75, 0.35, 0.2), vec3(0.95, 0.85, 0.5), val);
          vec3 shaded = baseColor * (0.4 + 0.6 * NdotL);
          float alpha = smoothstep(u_threshold, 0.9, val) * 0.12;

          accumColor.rgb += (1.0 - accumColor.a) * alpha * shaded;
          accumColor.a += (1.0 - accumColor.a) * alpha;
          if (accumColor.a >= 0.98) break;
        }
      }
      // Mode 5: Vitrea Pulmonary Airway / Lung
      else {
        if (val >= u_threshold) {
          vec3 baseColor = mix(vec3(0.1, 0.35, 0.6), vec3(0.8, 0.7, 0.6), val);
          float alpha = smoothstep(u_threshold, 0.8, val) * 0.15;
          accumColor.rgb += (1.0 - accumColor.a) * alpha * baseColor;
          accumColor.a += (1.0 - accumColor.a) * alpha;
          if (accumColor.a >= 0.98) break;
        }
      }

      p += stepVec;
    }

    if (u_preset == 0) {
      if (maxDensity <= 0.001) discard;
      float windowed = clamp((maxDensity - u_windowCenter) / max(0.001, u_windowWidth) + 0.5, 0.0, 1.0);
      gl_FragColor = vec4(vec3(windowed), windowed);
    } else {
      if (accumColor.a <= 0.001) discard;
      gl_FragColor = accumColor;
    }
  }
`;
