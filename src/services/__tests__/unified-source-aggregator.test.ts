import { describe, it, expect } from 'vitest';
import {
  getActiveStorageSources,
  aggregateMultiSourceStudies,
} from '../unified-source-aggregator.service';

describe('Unified Source Aggregator Service', () => {
  it('returns all 5 storage tiers in active storage sources', () => {
    const sources = getActiveStorageSources();
    expect(sources).toHaveLength(5);
    const ids = sources.map((s) => s.source);
    expect(ids).toContain('local_archive');
    expect(ids).toContain('hospital_pacs');
    expect(ids).toContain('gdrive');
    expect(ids).toContain('s3');
    expect(ids).toContain('remote_node');
  });

  it('queries local studies and marks them as downloaded with local source', async () => {
    const results = await aggregateMultiSourceStudies({ source: 'local' });
    expect(results).toBeInstanceOf(Array);
    if (results.length > 0) {
      const first = results[0];
      expect(first.isDownloaded).toBe(true);
      expect(['local_archive', 'local']).toContain(first.source);
      expect(first.availableSources).toContain('local_archive');
    }
  });

  it('filters studies by modality across unified aggregator', async () => {
    const results = await aggregateMultiSourceStudies({ modality: 'MRI' });
    expect(results).toBeInstanceOf(Array);
    results.forEach((r) => {
      expect(['MR', 'MRI']).toContain(r.modality);
    });
  });

  it('filters studies by accession across unified aggregator', async () => {
    const results = await aggregateMultiSourceStudies({ accessionNumber: '7563' });
    expect(results).toBeInstanceOf(Array);
    if (results.length > 0) {
      expect(results[0].accessionNumber).toContain('7563');
    }
  });
});
