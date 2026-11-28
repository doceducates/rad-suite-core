'use client';

/**
 * Bounded Browser In-Memory View Cache for Instant Dashboard Tab Transitions.
 * Automatically invalidated when `radsuite:sync-mutation` SSE events arrive.
 */

interface ClientCacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ClientViewCache {
  private store = new Map<string, ClientCacheEntry<unknown>>();
  private readonly maxEntries = 40;
  private listenerAttached = false;

  private ensureSyncListener(): void {
    if (this.listenerAttached || typeof window === 'undefined') return;
    this.listenerAttached = true;
    window.addEventListener('radsuite:sync-mutation', () => {
      this.clear();
    });
  }

  public get<T>(key: string): T | null {
    this.ensureSyncListener();
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs = 30_000): void {
    this.ensureSyncListener();
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

export const clientViewCache = new ClientViewCache();
