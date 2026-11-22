/**
 * Layer 2 (Domain/Services): Clinic Gateway In-Memory Client Cache & Request Coalescer
 *
 * Provides:
 * 1. Bounded TTL in-memory caching for node telemetry and study queries.
 * 2. Request coalescing (deduplication of simultaneous identical in-flight network requests).
 * 3. ETag tracking for HTTP 304 conditional revalidation.
 */

interface CacheEntry<T> {
  data: T;
  etag?: string;
  expires: number;
}

const clientCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export function clearGatewayClientCache(keyPattern?: string): void {
  if (!keyPattern) {
    clientCache.clear();
    return;
  }
  for (const k of clientCache.keys()) {
    if (k.includes(keyPattern)) {
      clientCache.delete(k);
    }
  }
}

export interface FetchResult<T> {
  data: T;
  etag?: string;
  notModified?: boolean;
}

/**
 * Coalesces concurrent in-flight requests and serves cached data within TTL.
 */
export async function fetchWithCoalescing<T>(
  key: string,
  ttlMs: number,
  fetchFn: (cachedEtag?: string) => Promise<FetchResult<T> | null>
): Promise<T | null> {
  const now = Date.now();
  const cached = clientCache.get(key);

  // 1. Return fresh cache if within TTL
  if (cached && cached.expires > now) {
    return cached.data as T;
  }

  // 2. Coalesce duplicate in-flight network requests
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T | null>;
  }

  const execution = (async (): Promise<T | null> => {
    try {
      const result = await fetchFn(cached?.etag);
      if (!result) {
        // On network error or failure, return stale cached value if available
        return cached ? (cached.data as T) : null;
      }

      // If server returned 304 Not Modified, refresh TTL on existing cached data
      if (result.notModified && cached) {
        cached.expires = Date.now() + ttlMs;
        return cached.data as T;
      }

      // Store fresh result
      clientCache.set(key, {
        data: result.data,
        etag: result.etag,
        expires: Date.now() + ttlMs,
      });

      return result.data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, execution);
  return execution;
}
