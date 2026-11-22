// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getHardwareSettings,
  saveHardwareSettings,
  detectGpuDiagnostics,
  DEFAULT_HARDWARE_SETTINGS,
} from '@/services/hardware-settings.service';
import { GpuAccelerationSettings } from '@/components/settings/gpu-acceleration-settings';

describe('Hardware & GPU Acceleration Settings Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should return default settings when storage is empty', () => {
    const settings = getHardwareSettings();
    expect(settings).toEqual(DEFAULT_HARDWARE_SETTINGS);
    expect(settings.gpuAcceleration).toBe(true);
    expect(settings.wlEngine).toBe('gpu_shader');
    expect(settings.refreshRate).toBe('120');
    expect(settings.vramCacheGb).toBe(2);
    expect(settings.nvmeDirectIo).toBe(true);
  });

  it('should save partial settings and persist them to localStorage', () => {
    const updated = saveHardwareSettings({
      refreshRate: '144',
      vramCacheGb: 4,
      wlEngine: 'gpu_shader',
    });

    expect(updated.refreshRate).toBe('144');
    expect(updated.vramCacheGb).toBe(4);
    expect(updated.gpuAcceleration).toBe(true); // preserved

    const retrieved = getHardwareSettings();
    expect(retrieved.refreshRate).toBe('144');
    expect(retrieved.vramCacheGb).toBe(4);
  });

  it('should dispatch custom event when hardware settings are saved', () => {
    const eventSpy = vi.fn();
    window.addEventListener('radsuite-hardware-settings-changed', eventSpy);

    saveHardwareSettings({ gpuAcceleration: false });

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.gpuAcceleration).toBe(false);

    window.removeEventListener('radsuite-hardware-settings-changed', eventSpy);
  });

  it('should handle corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem('radsuite_hardware_gpu_settings_v1', '{invalid-json');
    const settings = getHardwareSettings();
    expect(settings).toEqual(DEFAULT_HARDWARE_SETTINGS);
  });

  it('should detect GPU diagnostics in environment', () => {
    const diagnostics = detectGpuDiagnostics();
    expect(diagnostics).toHaveProperty('renderer');
    expect(diagnostics).toHaveProperty('vendor');
    expect(diagnostics).toHaveProperty('webgl2Supported');
    expect(diagnostics).toHaveProperty('isDesktopApp');
  });

  it('should detect desktop app environment when Tauri internals exist', () => {
    (window as any).__TAURI__ = { invoke: vi.fn() };
    const diagnostics = detectGpuDiagnostics();
    expect(diagnostics.isDesktopApp).toBe(true);
    delete (window as any).__TAURI__;
  });

  it('should export GpuAccelerationSettings component', () => {
    expect(typeof GpuAccelerationSettings).toBe('function');
  });
});
