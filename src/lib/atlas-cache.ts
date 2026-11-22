// Layer 2: Atlas Client-Side Cache Storage & Device Tiering (<110 lines)

const ATLAS_CACHE_NAME = 'radsuite-atlas-v1';

/**
 * Check if the browser or execution context supports persistent CacheStorage API.
 */
export function isCacheStorageAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'caches' in globalThis &&
    Boolean((globalThis as unknown as { caches?: unknown }).caches)
  );
}

/**
 * Check if user or browser has enabled Data Saver mode.
 */
export function isAtlasDataSaverEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}

/**
 * Determine client device memory capacity tier.
 * Returns low for <=3GB (mobile/tablets), normal for 4-8GB, high for >=8GB.
 */
export function getAtlasDeviceMemoryTier(): 'low' | 'normal' | 'high' {
  if (typeof navigator === 'undefined') return 'normal';
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number') {
    if (mem <= 3) return 'low';
    if (mem >= 8) return 'high';
  }
  return 'normal';
}

/**
 * Calculate recommended in-memory LRU ring buffer capacity based on device memory.
 */
export function getAtlasMaxCacheCapacity(): number {
  const tier = getAtlasDeviceMemoryTier();
  if (tier === 'low') return 24;
  if (tier === 'high') return 72;
  return 48;
}

/**
 * Persist an atlas slice or mask image in the browser's persistent CacheStorage.
 * Subsequent visits to this study/module load with 0 HTTP requests to the server.
 */
export async function cacheAtlasAsset(url: string): Promise<void> {
  if (!isCacheStorageAvailable() || isAtlasDataSaverEnabled()) return;
  try {
    const cache = await caches.open(ATLAS_CACHE_NAME);
    const existing = await cache.match(url);
    if (existing) return;

    // Use low fetch priority so active diagnostic requests always take precedence
    const fetchInit: RequestInit & { priority?: string } = {
      method: 'GET',
      mode: 'cors',
      credentials: 'same-origin',
      priority: 'low',
    };

    const res = await fetch(url, fetchInit);
    if (res.ok) {
      await cache.put(url, res.clone());
    }
  } catch {
    // Fail silently — standard browser HTTP disk cache serves as automatic fallback
  }
}

/**
 * Utility to clear the atlas persistent cache if needed.
 */
export async function clearAtlasPersistentCache(): Promise<boolean> {
  if (!isCacheStorageAvailable()) return false;
  try {
    return await caches.delete(ATLAS_CACHE_NAME);
  } catch {
    return false;
  }
}
