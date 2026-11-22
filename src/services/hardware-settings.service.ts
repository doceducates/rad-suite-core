/**
 * Workstation Hardware & GPU Acceleration Settings Service
 * Governs graphics rasterization, WebGL/Direct3D shader execution,
 * and native desktop NVMe memory-mapping parameters.
 */

export interface WorkstationHardwareSettings {
  gpuAcceleration: boolean;
  wlEngine: 'gpu_shader' | 'cpu_raster';
  refreshRate: '60' | '120' | '144' | 'uncapped';
  vramCacheGb: number;
  nvmeDirectIo: boolean;
  msaaSamples: 0 | 2 | 4;
}

export const DEFAULT_HARDWARE_SETTINGS: WorkstationHardwareSettings = {
  gpuAcceleration: true,
  wlEngine: 'gpu_shader',
  refreshRate: '120',
  vramCacheGb: 2,
  nvmeDirectIo: true,
  msaaSamples: 2,
};

const STORAGE_KEY = 'radsuite_hardware_gpu_settings_v1';

export function getHardwareSettings(): WorkstationHardwareSettings {
  if (typeof window === 'undefined') return DEFAULT_HARDWARE_SETTINGS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HARDWARE_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_HARDWARE_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_HARDWARE_SETTINGS;
  }
}

export function saveHardwareSettings(
  settings: Partial<WorkstationHardwareSettings>
): WorkstationHardwareSettings {
  const current = getHardwareSettings();
  const updated = { ...current, ...settings };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('radsuite-hardware-settings-changed', { detail: updated })
      );
    } catch {}
  }

  return updated;
}

export interface GpuDiagnostics {
  renderer: string;
  vendor: string;
  webgl2Supported: boolean;
  isDesktopApp: boolean;
}

export function detectGpuDiagnostics(): GpuDiagnostics {
  const isDesktop =
    typeof window !== 'undefined' &&
    Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      renderer: 'Direct3D 11 (Accelerated)',
      vendor: 'System Hardware',
      webgl2Supported: true,
      isDesktopApp: isDesktop,
    };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 || canvas.getContext('webgl');

    if (!gl) {
      return {
        renderer: 'Software Rasterizer',
        vendor: 'Generic Fallback',
        webgl2Supported: false,
        isDesktopApp: isDesktop,
      };
    }

    const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbgExt
      ? gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const vendor = dbgExt
      ? gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);

    return {
      renderer: String(renderer || 'Hardware Direct3D 11 Engine'),
      vendor: String(vendor || 'System GPU Device'),
      webgl2Supported: Boolean(gl2),
      isDesktopApp: isDesktop,
    };
  } catch {
    return {
      renderer: 'Hardware Direct3D 11 Engine',
      vendor: 'System GPU Device',
      webgl2Supported: true,
      isDesktopApp: isDesktop,
    };
  }
}
