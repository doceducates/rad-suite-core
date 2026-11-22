'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DicomVolumeData } from '@/services/dicom-volume-builder.service';
import {
  volumeRaymarchingVertexShader,
  volumeRaymarchingFragmentShader,
} from '@/services/dicom-raymarching-shaders';

export type VolumePreset = 'mip' | 'bone' | 'brain' | 'vascular' | 'abdominal' | 'lung';

const PRESET_MAP: Record<VolumePreset, number> = {
  mip: 0,
  bone: 1,
  brain: 2,
  vascular: 3,
  abdominal: 4,
  lung: 5,
};

interface UseThreeVolumeRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  volumeData: DicomVolumeData | null;
  preset?: VolumePreset;
  threshold?: number;
  windowWidth?: number;
  windowCenter?: number;
}

export function useThreeVolumeRenderer({
  canvasRef,
  containerRef,
  volumeData,
  preset = 'bone',
  threshold = 0.25,
  windowWidth = 0.5,
  windowCenter = 0.5,
}: UseThreeVolumeRendererOptions) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || typeof window === 'undefined') return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.2);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: volumeRaymarchingVertexShader,
      fragmentShader: volumeRaymarchingFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        u_volume: { value: volumeData?.texture || null },
        u_preset: { value: PRESET_MAP[preset] },
        u_threshold: { value: threshold },
        u_windowWidth: { value: windowWidth },
        u_windowCenter: { value: windowCenter },
        u_steps: { value: 128 },
      },
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    if (volumeData) {
      mesh.scale.set(volumeData.aspect[0], volumeData.aspect[1], volumeData.aspect[2]);
    }
    meshRef.current = mesh;
    scene.add(mesh);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [canvasRef, containerRef]);

  // Update uniforms when props change without recreating WebGL context
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.u_preset.value = PRESET_MAP[preset];
    materialRef.current.uniforms.u_threshold.value = threshold;
    materialRef.current.uniforms.u_windowWidth.value = windowWidth;
    materialRef.current.uniforms.u_windowCenter.value = windowCenter;
  }, [preset, threshold, windowWidth, windowCenter]);

  useEffect(() => {
    if (!materialRef.current || !volumeData) return;
    materialRef.current.uniforms.u_volume.value = volumeData.texture;
    if (meshRef.current) {
      meshRef.current.scale.set(volumeData.aspect[0], volumeData.aspect[1], volumeData.aspect[2]);
    }
  }, [volumeData]);

  return { materialRef, meshRef };
}
