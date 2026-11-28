/**
 * Bounded In-Memory Server TTL Cache with In-Flight Request Coalescing.
 * Designed for low-end VPS & Tauri standalone runtimes:
 * - Zero external dependencies (no Redis required)
 * - Caps memory footprint (default max 120 entries)
 * - Coalesces concurrent identical requests to protect SQLite CPU
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ServerTtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private readonly maxEntries = 120;

  public get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public async getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const active = this.inFlight.get(key);
    if (active) {
      return active as Promise<T>;
    }

    const promise = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  public invalidate(key: string): void {
    this.store.delete(key);
  }

  public invalidatePrefix(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }

  public clear(): void {
    this.store.clear();
  }
}

const globalForCache = globalThis as typeof globalThis & {
  __radSuiteServerTtlCache?: ServerTtlCache;
};

export const serverTtlCache =
  globalForCache.__radSuiteServerTtlCache ?? new ServerTtlCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.__radSuiteServerTtlCache = serverTtlCache;
}
