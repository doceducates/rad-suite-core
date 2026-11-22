import { describe, it, expect } from 'vitest';
import {
  getUnifiedStorageSettings,
  saveUnifiedStorageSettings,
  getInternalStorageCredentials,
} from '../storage-config.service';

describe('Unified Storage Configuration Service', () => {
  it('returns default storage configuration when no overrides exist', () => {
    const settings = getUnifiedStorageSettings();
    expect(settings).toBeDefined();
    expect(typeof settings.localPath).toBe('string');
    expect(typeof settings.pacsEnabled).toBe('boolean');
    expect(typeof settings.gdriveEnabled).toBe('boolean');
    expect(typeof settings.s3Enabled).toBe('boolean');
  });

  it('saves and reads updated storage configuration', () => {
    const original = getUnifiedStorageSettings();
    const updated = saveUnifiedStorageSettings({
      localPath: 'E:\\Cases',
      pacsEnabled: true,
      gdriveFolderId: 'test-folder-123',
    });

    expect(updated.localPath).toBe('E:\\Cases');
    expect(updated.pacsEnabled).toBe(true);
    expect(updated.gdriveFolderId).toBe('test-folder-123');

    // Restore original
    saveUnifiedStorageSettings(original);
  });

  it('resolves internal credentials with sanitized paths', () => {
    const creds = getInternalStorageCredentials();
    expect(creds.localPath).toBeDefined();
    expect(creds.gdrive).toBeDefined();
    expect(creds.s3).toBeDefined();
    expect(creds.s3.region).toBeDefined();
  });
});
