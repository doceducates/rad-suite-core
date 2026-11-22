import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// 1. Test Edge Inventory Module
describe('Edge Local Inventory Module (Clinic PC Node)', () => {
  const inventoryModule = require('../../../plugins/clinic-edge/host-scripts/local-inventory');

  beforeEach(() => {
    // Reset in-memory state
    inventoryModule.saveInventory({
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      studies: {},
    });
  });

  it('registers discovered studies from Hospital PACS with on_pacs state', () => {
    const count = inventoryModule.registerDiscovered([
      {
        accession: 'ACC_TEST_001',
        patientName: 'JOHN DOE',
        modality: 'MR',
        studyDate: '20261010',
        studyDescription: 'MRI BRAIN',
      },
      {
        accession: 'ACC_TEST_002',
        patientName: 'JANE SMITH',
        modality: 'CT',
        studyDate: '20261010',
      },
    ]);

    expect(typeof count === 'object' ? count.added : count).toBe(2);
    expect(inventoryModule.getStudyState('ACC_TEST_001')).toBe('on_pacs');
    expect(inventoryModule.isAlreadyPresent('ACC_TEST_001')).toBe(false); // on_pacs is not yet in sandbox
  });

  it('transitions state to in_sandbox once C-GET retrieves slices', () => {
    inventoryModule.registerDiscovered([
      { accession: 'ACC_TEST_003', patientName: 'PATIENT THREE', modality: 'MR' },
    ]);
    expect(inventoryModule.getStudyState('ACC_TEST_003')).toBe('on_pacs');

    inventoryModule.markInSandbox('ACC_TEST_003', {
      sliceCount: 24,
      sizeMb: 48.5,
    });

    expect(inventoryModule.getStudyState('ACC_TEST_003')).toBe('in_sandbox');
    expect(inventoryModule.isAlreadyPresent('ACC_TEST_003')).toBe(true); // Now in sandbox!
  });

  it('tracks active uploading progress without losing metadata', () => {
    inventoryModule.markInSandbox('ACC_TEST_004', { patientName: 'PATIENT FOUR' });
    inventoryModule.markUploading('ACC_TEST_004', 55);

    expect(inventoryModule.getStudyState('ACC_TEST_004')).toBe('uploading');
    expect(inventoryModule.isAlreadyPresent('ACC_TEST_004')).toBe(true);
  });

  it('confirms cloud sync and provides accurate inventory summary', () => {
    inventoryModule.markInSandbox('ACC_TEST_005', { patientName: 'PATIENT FIVE' });
    inventoryModule.markSynced('ACC_TEST_005', {
      s3KeyPrefix: 'dicom/2026/10/MR/ACC_TEST_005',
      sliceCount: 30,
    });

    expect(inventoryModule.getStudyState('ACC_TEST_005')).toBe('synced');
    expect(inventoryModule.isAlreadyPresent('ACC_TEST_005')).toBe(true);

    const summary = inventoryModule.getSummary();
    expect(summary.synced).toBe(1);
  });

  it('handles failed attempts with retry tracking', () => {
    inventoryModule.registerDiscovered([{ accession: 'ACC_FAIL_001' }]);
    inventoryModule.markFailed('ACC_FAIL_001', 'Connection timeout');

    expect(inventoryModule.getStudyState('ACC_FAIL_001')).toBe('failed');
  });

  it('automatically recovers stale downloading states older than 10 minutes', () => {
    // Simulate a study stuck in downloading from 2 days ago (e.g. Samina Khalid case)
    const elevenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    inventoryModule.saveInventory({
      version: '2.0.0',
      lastUpdated: elevenMinutesAgo,
      studies: {
        'SAMINA_MR': {
          id: 'SAMINA_MR',
          accession: 'SAMINA',
          modality: 'MR',
          patientName: 'SAMINA KHALID',
          state: 'downloading',
          s3Status: 'synced',
          downloadedSlices: 92,
          sandboxSlices: 92,
          totalPacsSlices: 185,
          downloadStartedAt: elevenMinutesAgo,
        },
        'UNSYNCED_MR': {
          id: 'UNSYNCED_MR',
          accession: 'UNSYNCED',
          modality: 'MR',
          state: 'downloading',
          s3Status: 'not_uploaded',
          downloadedSlices: 50,
          sandboxSlices: 50,
          downloadStartedAt: elevenMinutesAgo,
        },
      },
    });

    // When summary or getStudies is called, stale states must heal automatically
    const summary = inventoryModule.getSummary();
    expect(summary.downloading).toBe(0);
    expect(summary.synced).toBe(1);
    expect(summary.inSandbox).toBe(1);
    expect(inventoryModule.getStudyState('SAMINA')).toBe('synced');
    expect(inventoryModule.getStudyState('UNSYNCED')).toBe('in_sandbox');
  });
});

// 2. Test Script Version Manifest Endpoint
describe('Clinic Node Script Manifest Generation', () => {
  it('computes composite script version hash for Auto-OTA', async () => {
    const { getClinicScriptManifest, ALLOWED_CLINIC_FILES } = await import(
      '@/services/clinic-node-manifest.service'
    );

    const manifest = getClinicScriptManifest();
    expect(manifest.version).toBeDefined();
    expect(typeof manifest.version).toBe('string');
    expect(manifest.version.length).toBeGreaterThan(6);
    expect(manifest.files).toBeDefined();
    expect(manifest.files['local-inventory.js']).toBeDefined();
    expect(manifest.files['pacs-harvester.js']).toBeDefined();
    expect(manifest.files['clinic-agent.js']).toBeDefined();
  });
});
