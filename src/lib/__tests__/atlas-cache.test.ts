import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isCacheStorageAvailable,
  isAtlasDataSaverEnabled,
  getAtlasDeviceMemoryTier,
  getAtlasMaxCacheCapacity,
  cacheAtlasAsset,
  clearAtlasPersistentCache,
} from '../atlas-cache';

describe('atlas-cache utility', () => {
  const originalCaches = (globalThis as unknown as { caches?: unknown }).caches;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as unknown as { caches?: unknown }).caches = originalCaches;
  });

  it('detects CacheStorage availability correctly', () => {
    (globalThis as unknown as { caches?: unknown }).caches = {
      open: vi.fn(),
      delete: vi.fn(),
    };
    expect(isCacheStorageAvailable()).toBe(true);

    (globalThis as unknown as { caches?: unknown }).caches = undefined;
    expect(isCacheStorageAvailable()).toBe(false);
  });

  it('detects Data Saver mode correctly', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
      writable: true,
    });
    expect(isAtlasDataSaverEnabled()).toBe(true);

    Object.defineProperty(navigator, 'connection', {
      value: { saveData: false },
      configurable: true,
      writable: true,
    });
    expect(isAtlasDataSaverEnabled()).toBe(false);
  });

  it('calculates memory tiers and cache capacity based on deviceMemory', () => {
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 2,
      configurable: true,
      writable: true,
    });
    expect(getAtlasDeviceMemoryTier()).toBe('low');
    expect(getAtlasMaxCacheCapacity()).toBe(24);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 4,
      configurable: true,
      writable: true,
    });
    expect(getAtlasDeviceMemoryTier()).toBe('normal');
    expect(getAtlasMaxCacheCapacity()).toBe(48);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 16,
      configurable: true,
      writable: true,
    });
    expect(getAtlasDeviceMemoryTier()).toBe('high');
    expect(getAtlasMaxCacheCapacity()).toBe(72);
  });

  it('gracefully handles cache write operations', async () => {
    const mockCache = {
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };
    (globalThis as unknown as { caches?: unknown }).caches = {
      open: vi.fn().mockResolvedValue(mockCache),
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      clone: () => ({ mock: true }),
    } as unknown as Response);

    await cacheAtlasAsset('/api/anatomy/image?module=brain&slice=1');
    expect(mockCache.match).toHaveBeenCalled();
  });

  it('clears persistent cache when requested', async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    (globalThis as unknown as { caches?: unknown }).caches = {
      delete: deleteMock,
    };

    const result = await clearAtlasPersistentCache();
    expect(result).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith('radsuite-atlas-v1');
  });
});
