import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import {
  recordClinicHeartbeat,
  getClinicNodeStatus,
  resetClinicNodeState,
} from '@/services/clinic-node.service';

const require = createRequire(import.meta.url);
const harvester = require('../../plugins/clinic-edge/host-scripts/pacs-harvester.js');
const inventory = require('../../plugins/clinic-edge/host-scripts/local-inventory.js');

describe('Clinic Node Two-Stage PACS Pipeline & Calendar Scopes', () => {
  beforeEach(() => {
    resetClinicNodeState();
  });

  it('resolves calendar date scopes (today, yesterday, last_2_days) into discrete YYYYMMDD dates', () => {
    const today = harvester.formatDicomToday();
    const yesterday = harvester.formatDicomYesterday();

    expect(harvester.resolveDatesForScope('today')).toEqual([today]);
    expect(harvester.resolveDatesForScope('yesterday')).toEqual([yesterday]);
    expect(harvester.resolveDatesForScope('last_2_days')).toEqual([yesterday, today]);
    expect(harvester.resolveDatesForScope('rolling_48h')).toEqual([yesterday, today]);
    expect(harvester.resolveDatesForScope('custom', '2026-10-10')).toEqual(['20261010']);
  });

  it('tracks study lifecycle across Stage 1 (PACS -> Sandbox) and Stage 2 (Sandbox -> Cloud S3)', () => {
    const testAcc = `ACC_${Date.now()}`;
    const reg = inventory.registerDiscovered([
      {
        accession: testAcc,
        modality: 'MR',
        patientName: 'TEST PATIENT',
        patientId: 'MRN-001',
        studyDescription: 'MRI Brain',
        studyDate: '20261012',
        numInstances: 120,
      },
    ]);

    expect(reg.added).toBe(1);
    expect(inventory.getStudyState(testAcc, 'MR')).toBe('on_pacs');
    expect(inventory.isAlreadyPresent(testAcc, 'MR')).toBe(false);

    // Stage 1: Start PACS -> Sandbox download
    inventory.startPacsDownload({
      accession: testAcc,
      modality: 'MR',
      patientName: 'TEST PATIENT',
      numInstances: 120,
    });
    expect(inventory.getStudyState(testAcc, 'MR')).toBe('downloading');
    expect(inventory.getActiveDownload()?.accession).toBe(testAcc);

    inventory.updatePacsDownloadProgress(testAcc, 60, 120, 'MR');
    expect(inventory.getActiveDownload()?.progressPercent).toBe(50);

    // Stage 1 Complete -> In Medical Sandbox
    inventory.markInSandbox(testAcc, { modality: 'MR', sliceCount: 120 });
    expect(inventory.getStudyState(testAcc, 'MR')).toBe('in_sandbox');
    expect(inventory.getActiveDownload()).toBeNull();
    expect(inventory.isAlreadyPresent(testAcc, 'MR')).toBe(true);

    // Stage 2: Start Sandbox -> Cloud S3 upload
    inventory.markUploading(testAcc, 75, { modality: 'MR', completedSlices: 90 });
    expect(inventory.getStudyState(testAcc, 'MR')).toBe('uploading');

    // Stage 2 Complete -> Synced to S3
    inventory.markSynced(testAcc, { modality: 'MR', sliceCount: 120 });
    expect(inventory.getStudyState(testAcc, 'MR')).toBe('synced');
  });

  it('records activeDownload, downloadQueue, and inventorySummary in ClinicNodeTelemetry', () => {
    recordClinicHeartbeat({
      nodeId: 'clinic-pc-primary',
      orthancStatus: 'running',
      activeDownload: {
        accession: '26101201',
        patientName: 'AHMED KHAN',
        modality: 'MR',
        studyDescription: 'MRI Brain',
        downloadedSlices: 45,
        totalSlices: 90,
        progressPercent: 50,
      },
      downloadQueue: [
        {
          accession: '26101202',
          patientName: 'FATIMA BIBI',
          modality: 'MR',
          totalSlices: 110,
          status: 'on_pacs',
        },
      ],
      inventorySummary: {
        total: 12,
        onPacs: 2,
        downloading: 1,
        inSandbox: 3,
        uploading: 1,
        synced: 5,
        failed: 0,
      },
    });

    const status = getClinicNodeStatus('clinic-pc-primary');
    expect(status.online).toBe(true);
    expect(status.activeDownload?.accession).toBe('26101201');
    expect(status.activeDownload?.progressPercent).toBe(50);
    expect(status.downloadQueue).toHaveLength(1);
    expect(status.inventorySummary?.total).toBe(12);
    expect(status.inventorySummary?.downloading).toBe(1);
  });
});
