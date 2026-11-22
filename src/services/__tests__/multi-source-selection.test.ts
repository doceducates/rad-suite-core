import { describe, it, expect, vi } from 'vitest';
import { getActiveStorageSources, aggregateMultiSourceStudies } from '../unified-source-aggregator.service';
import { getPacsStudyByAccession } from '../pacs.service';
import { retrieveStudyFromSource } from '../pacs-retrieval.service';
import { recordClinicHeartbeat, resetClinicNodeState } from '../clinic-node.service';

describe('Multi-Source Selection & Cross-Tier Ingestion', () => {
  it('returns all 5 clinical tiers in active storage sources', () => {
    const sources = getActiveStorageSources();
    expect(sources.length).toBeGreaterThanOrEqual(5);

    const ids = sources.map((s) => s.source);
    expect(ids).toContain('local_archive');
    expect(ids).toContain('hospital_pacs');
    expect(ids).toContain('s3');
    expect(ids).toContain('gdrive');
    expect(ids).toContain('remote_node');
  });

  it('aggregates remote node studies when queried', async () => {
    // Seed telemetry with a test synced study
    recordClinicHeartbeat({
      nodeId: 'test-node-1',
      syncedStudies: [
        {
          id: 'test-study-uid-1',
          patientName: 'KHALID MAHMOOD',
          patientId: 'MRN-78901',
          accession: 'ACC-78901',
          modality: 'MR',
          studyDate: '20261005',
          time: '12:00:00',
          status: 'synced',
        },
      ],
    });

    const results = await aggregateMultiSourceStudies({ source: 'remote_node' });
    expect(results).toBeInstanceOf(Array);
    const found = results.find((r) => r.accessionNumber === 'ACC-78901');
    expect(found).toBeDefined();
    expect(found?.patientName).toBe('KHALID MAHMOOD');
    expect(found?.source).toBe('remote_node');
    expect(found?.availableSources).toContain('remote_node');

    resetClinicNodeState();
  });

  it('resolves accession from clinic node fallback in getPacsStudyByAccession', async () => {
    recordClinicHeartbeat({
      nodeId: 'test-node-2',
      syncedStudies: [
        {
          id: 'test-study-uid-2',
          patientName: 'ZAINAB BIBI',
          patientId: 'MRN-99881',
          accession: 'ACC-99881',
          modality: 'CT',
          studyDate: '20261005',
          time: '13:00:00',
          status: 'synced',
        },
      ],
    });

    const study = await getPacsStudyByAccession('ACC-99881');
    expect(study).toBeDefined();
    expect(study?.accessionNumber).toBe('ACC-99881');
    expect(study?.patientName).toBe('ZAINAB BIBI');
    expect(study?.source).toBe('remote_node');

    resetClinicNodeState();
  });

  it('dispatches remote accession pull when retrieveStudyFromSource called with remote_node', async () => {
    const result = await retrieveStudyFromSource('ACC-FETCH-TEST', undefined, undefined, 'remote_node');
    expect(result.success).toBe(true);
    expect(result.serverName).toBe('Clinic Edge Node');
  });
});
