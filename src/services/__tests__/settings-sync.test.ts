import { describe, it, expect, beforeEach } from 'vitest';
import { exportSettingsBundle, applySettingsBundle } from '../sync/settings-sync.service';
import { verifyAndHealStudyS3Integrity } from '../hospital-pacs-index.service';

describe('Settings Synchronization & Self-Healing S3 Integrity', () => {
  it('exports settings bundle with templates, pacsServers, and clinicSettings', async () => {
    const bundle = await exportSettingsBundle();
    expect(bundle).toBeDefined();
    expect(Array.isArray(bundle.templates)).toBe(true);
    expect(Array.isArray(bundle.pacsServers)).toBe(true);
    expect(bundle.clinicSettings).toBeDefined();
    expect(typeof bundle.exportedAt).toBe('string');
  });

  it('safely applies settings bundle with empty or partial data', async () => {
    const res = await applySettingsBundle({
      templates: [
        {
          title: 'Test Spine MRI Template',
          modality: 'MR',
          study: 'Spine MRI',
          findings: 'Normal alignment and curvature.',
          impression: 'Unremarkable study.',
        },
      ],
      pacsServers: [],
      exportedAt: new Date().toISOString(),
    });

    expect(res.success).toBe(true);
    expect(res.appliedCounts.templates).toBeGreaterThanOrEqual(1);
    expect(res.appliedCounts.pacsServers).toBe(0);
  });

  it('heals non-existent S3 studies gracefully without throwing', async () => {
    const res = await verifyAndHealStudyS3Integrity('NON_EXISTENT_ACCESSION_999999');
    expect(res.verified).toBe(false);
    expect(res.keyCount).toBe(0);
    expect(typeof res.status).toBe('string');
  });
});
