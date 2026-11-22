import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createCaseZipBuffer, packageStudyToZip } from '../case-packaging.service';

describe('Case Packaging Service', () => {
  let tempCaseDir: string;

  beforeEach(() => {
    tempCaseDir = path.join(os.tmpdir(), `test_pkg_${Date.now()}`);
    fs.mkdirSync(tempCaseDir, { recursive: true });

    // Mock DICOM files in root and subfolder
    const sub = path.join(tempCaseDir, 'axial');
    fs.mkdirSync(sub, { recursive: true });

    fs.writeFileSync(path.join(tempCaseDir, 'slice-01.dcm'), Buffer.from('DICM_HEADER_MOCK_1'));
    fs.writeFileSync(path.join(sub, 'slice-02.dcm'), Buffer.from('DICM_HEADER_MOCK_2'));
  });

  afterEach(() => {
    if (fs.existsSync(tempCaseDir)) {
      fs.rmSync(tempCaseDir, { recursive: true, force: true });
    }
  });

  it('packages all .dcm files in case folder into a valid ZIP archive', async () => {
    const zipBuf = await createCaseZipBuffer(tempCaseDir);
    expect(zipBuf).toBeInstanceOf(Buffer);
    expect(zipBuf.length).toBeGreaterThan(50);

    // Verify ZIP magic signature: 0x50, 0x4b, 0x03, 0x04 (PK\x03\x04)
    expect(zipBuf[0]).toBe(0x50);
    expect(zipBuf[1]).toBe(0x4b);
    expect(zipBuf[2]).toBe(0x03);
    expect(zipBuf[3]).toBe(0x04);
  });

  it('rejects nonexistent directories safely', async () => {
    await expect(createCaseZipBuffer(path.join(os.tmpdir(), 'nonexistent_dir_12345'))).rejects.toThrow(
      'Directory does not exist'
    );
  });

  it('rejects directories containing no DICOM files safely', async () => {
    const emptyDir = path.join(os.tmpdir(), `empty_dir_${Date.now()}`);
    fs.mkdirSync(emptyDir, { recursive: true });
    try {
      await expect(createCaseZipBuffer(emptyDir)).rejects.toThrow('No DICOM files found');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('throws when accession cannot be resolved across any source', async () => {
    await expect(packageStudyToZip('NONEXISTENT_ACCESSION_99999')).rejects.toThrow(
      'Could not find study instances'
    );
  });
});
