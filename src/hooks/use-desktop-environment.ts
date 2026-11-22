'use client';

import { useState, useEffect } from 'react';

export interface DesktopSystemSpecs {
  isDesktop: boolean;
  cpuCores: number;
  osName: string;
  arch: string;
  gpuAccelerated: boolean;
}

export function useDesktopEnvironment(): DesktopSystemSpecs {
  const [specs, setSpecs] = useState<DesktopSystemSpecs>({
    isDesktop: false,
    cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
    osName: 'Web Browser',
    arch: 'x86_64',
    gpuAccelerated: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running inside Tauri native shell
    const isTauri = Boolean(
      (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__
    );

    if (isTauri) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke<{ cpu_cores: number; os_name: string; arch: string; gpu_accelerated: boolean }>('get_system_specs'))
        .then((res) => {
          setSpecs({
            isDesktop: true,
            cpuCores: res.cpu_cores,
            osName: res.os_name,
            arch: res.arch,
            gpuAccelerated: res.gpu_accelerated,
          });
        })
        .catch(() => {
          setSpecs((prev) => ({ ...prev, isDesktop: true }));
        });
    }
  }, []);

  return specs;
}
