// Layer 2 (Domain/Services): In-Memory Client Manifest Cache
// Caches lightweight study manifests in the browser for 0ms instant patient transitions.

export interface ClientManifestSeries {
  seriesNumber: string;
  seriesDescription: string;
  modality?: string;
  instances?: any[];
  files?: string[];
  sliceCount?: number;
  orientation?: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  [key: string]: any;
}

export interface ClientStudyManifest {
  accessionNumber: string;
  series: ClientManifestSeries[];
  [key: string]: any;
}

class ClientManifestCache {
  private cache = new Map<string, { manifest: ClientStudyManifest; timestamp: number }>();
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes TTL

  public get(accession: string): ClientStudyManifest | null {
    if (!accession) return null;
    const entry = this.cache.get(accession.trim().toUpperCase());
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(accession.trim().toUpperCase());
      return null;
    }
    return entry.manifest;
  }

  public set(accession: string, manifest: ClientStudyManifest): void {
    if (!accession || !manifest) return;
    // Limit cache size to 50 active manifests to bound browser memory
    if (this.cache.size >= 50) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(accession.trim().toUpperCase(), {
      manifest,
      timestamp: Date.now(),
    });
  }

  public has(accession: string): boolean {
    return this.get(accession) !== null;
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const clientManifestCache = new ClientManifestCache();
