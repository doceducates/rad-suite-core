import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectAvailableLocalFolders,
  scanAndIndexLocalDirectory,
} from '../local-folder-import.service';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Local Folder Import Service', () => {
  describe('detectAvailableLocalFolders', () => {
    it('returns an array of known workstation paths with existence checks', () => {
      const folders = detectAvailableLocalFolders();
      expect(Array.isArray(folders)).toBe(true);
      expect(folders.length).toBeGreaterThan(0);
      for (const f of folders) {
        expect(f).toHaveProperty('path');
        expect(f).toHaveProperty('label');
        expect(f).toHaveProperty('exists');
        expect(typeof f.exists).toBe('boolean');
        expect(f).toHaveProperty('studyCount');
        expect(typeof f.studyCount).toBe('number');
      }
    });
  });

  describe('scanAndIndexLocalDirectory', () => {
    it('gracefully handles non-existent paths', async () => {
      const result = await scanAndIndexLocalDirectory('Z:\\NonExistent\\Path\\12345');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Directory does not exist');
      expect(result.studyCount).toBe(0);
    });

    it('rejects files when path is not a directory', async () => {
      const tempFile = path.join(os.tmpdir(), `test_not_a_dir_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, 'hello');
      try {
        const result = await scanAndIndexLocalDirectory(tempFile);
        expect(result.success).toBe(false);
        expect(result.error).toContain('not a directory');
      } finally {
        try { fs.unlinkSync(tempFile); } catch {}
      }
    });

    it('returns error when directory has no DICOM files', async () => {
      const tempDir = path.join(os.tmpdir(), `empty_dicom_dir_${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      try {
        const result = await scanAndIndexLocalDirectory(tempDir);
        expect(result.success).toBe(false);
        expect(result.error).toContain('No DICOM files');
      } finally {
        try { fs.rmdirSync(tempDir); } catch {}
      }
    });

    it('discovers and indexes studies from a folder with .dcm files', async () => {
      const rootDir = path.join(os.tmpdir(), `test_pacs_import_${Date.now()}`);
      const caseDir = path.join(rootDir, '192610999999_TEST_IMPORT');
      fs.mkdirSync(caseDir, { recursive: true });
      const dummySlice = path.join(caseDir, 'slice_001.dcm');
      fs.writeFileSync(dummySlice, Buffer.alloc(200));

      try {
        const result = await scanAndIndexLocalDirectory(rootDir);
        expect(result.success).toBe(true);
        expect(result.studyCount).toBe(1);
        expect(result.totalFiles).toBe(1);
        expect(result.studies[0].patientName).toContain('TEST_IMPORT');
      } finally {
        try { fs.rmSync(rootDir, { recursive: true, force: true }); } catch {}
      }
    });
  });
});
