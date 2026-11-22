import { describe, it, expect } from 'vitest';
import { releaseService } from '../release.service';

describe('Desktop Release Service & Auto-Updater Suite', () => {
  it('loads valid latest release metadata', () => {
    const release = releaseService.getLatestRelease();

    expect(release).toBeDefined();
    expect(release.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(release.installerFileName).toContain('.exe');
    expect(release.fileSizeBytes).toBeGreaterThan(50 * 1024 * 1024); // > 50MB
    expect(release.fileSizeFormatted).toContain('MB');
    expect(release.sha256).toHaveLength(64);
    expect(Array.isArray(release.releaseNotes)).toBe(true);
    expect(release.releaseNotes.length).toBeGreaterThan(0);
    expect(release.installerUrl).toBe('/api/download/desktop');
  });

  it('generates a valid Tauri v2 auto-updater manifest', () => {
    const payload = releaseService.getTauriUpdaterPayload('https://radiology.sehatai.org');

    expect(payload.version).toBeDefined();
    expect(payload.notes).toBeDefined();
    expect(payload.pub_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.platforms).toBeDefined();
    expect(payload.platforms['windows-x86_64']).toBeDefined();
    expect(payload.platforms['windows-x86_64'].url).toContain('desktop');
  });

  describe('Semver Version Comparison', () => {
    it('correctly compares version numbers', () => {
      expect(releaseService.compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(releaseService.compareVersions('2.0.0', '1.9.9')).toBe(1);
      expect(releaseService.compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(releaseService.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(releaseService.compareVersions('v1.2.3', '1.2.3')).toBe(0);
      expect(releaseService.compareVersions('v1.2.4', 'v1.2.3')).toBe(1);
    });

    it('identifies when an update is available or up to date', () => {
      const latest = releaseService.getLatestRelease();
      const olderClient = releaseService.isUpdateAvailable('0.9.0');
      expect(olderClient.available).toBe(true);
      expect(olderClient.latest.version).toBe(latest.version);

      const currentClient = releaseService.isUpdateAvailable(latest.version);
      expect(currentClient.available).toBe(false);

      const futureClient = releaseService.isUpdateAvailable('9.9.9');
      expect(futureClient.available).toBe(false);
    });
  });
});
