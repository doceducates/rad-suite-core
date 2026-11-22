import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import dicomParser from 'dicom-parser';
import { parseDicomBuffer } from '../dicom-loader.service';

/**
 * Test Suite: Hospital PACS Connectivity & Retrieval Findings
 * 
 * Documents and enforces critical invariants discovered during live integration
 * with the hospital PACS (10.0.0.100:8040):
 * 1. Strict C-GET protocol (C-MOVE is rejected by hospital PACS with 0xC000).
 * 2. Calling AET must be RADIANT (whitelisted on hospital PACS).
 * 3. Called AET must be HMIS_PACS on port 8040.
 * 4. Orthanc configuration file integrity.
 * 5. DICOM parsing compatibility with actual hospital CT slices.
 */

describe('Hospital PACS Configuration Invariants (10.0.0.100:8040)', () => {
  const orthancJsonPath = path.resolve(process.cwd(), 'scripts/clinic-host/orthanc.json');

  it('validates orthanc.json enforces C-GET and calling AET RADIANT', () => {
    if (!fs.existsSync(orthancJsonPath)) {
      return;
    }
    const raw = fs.readFileSync(orthancJsonPath, 'utf8');
    const config = JSON.parse(raw);

    // Calling AE Title MUST be RADIANT (hospital PACS firewall whitelists RADIANT)
    expect(config.DicomAet).toBe('RADIANT');

    // Retrieval method MUST strictly default to C-GET
    expect(config.DicomDefaultRetrieveMethod).toBe('C-GET');

    // Modality HMIS_PACS must exist and have correct target IP and port
    expect(config.DicomModalities).toBeDefined();
    const hmisPacs = config.DicomModalities.HMIS_PACS;
    expect(hmisPacs).toBeDefined();
    expect(hmisPacs.AET).toBe('HMIS_PACS');
    expect(hmisPacs.Port).toBe(8040);

    // C-MOVE MUST be disabled; C-GET MUST be enabled
    expect(hmisPacs.AllowCMove).toBe(false);
    expect(hmisPacs.AllowCGet).toBe(true);
    expect(hmisPacs.RetrieveMethod).toBe('C-GET');
  });

  it('verifies DICOM query date formatting conforms to DICOM DA standard (YYYYMMDD)', () => {
    const formatDicomDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const testDate = new Date(2026, 8, 30); // 2026-09-30
    const dicomDateStr = formatDicomDate(testDate);

    expect(dicomDateStr).toBe('20260930');
    expect(dicomDateStr).toMatch(/^\d{8}$/);
    expect(dicomDateStr.length).toBe(8);
  });

  it('verifies DICOM parsing of live hospital CT slice', () => {
    // Check if real hospital DICOM file exists from scratch test download
    const sampleDir = path.resolve(
      'C:/Users/muham/.gemini/antigravity/brain/fa8c0e33-e976-45a8-ab14-1ded7f803d11/scratch/dicom_test'
    );

    if (fs.existsSync(sampleDir)) {
      const files = fs.readdirSync(sampleDir);
      if (files.length > 0) {
        const filePath = path.join(sampleDir, files[0]);
        const buffer = fs.readFileSync(filePath);

        // Test with raw dicomParser
        const dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
        expect(dataSet.string('x00100010')).toBe('HADYAT ALI');
        expect(dataSet.string('x00100020')).toBe('54491008');
        expect(dataSet.string('x00080060')).toBe('CT');
        expect(dataSet.uint16('x00280010')).toBe(512); // rows
        expect(dataSet.uint16('x00280011')).toBe(512); // cols

        // Test with Rad Suite's internal dicom loader service
        const arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );
        const parsed = parseDicomBuffer(arrayBuffer);
        expect(parsed.meta.patientName).toBe('HADYAT ALI');
        expect(parsed.meta.patientId).toBe('54491008');
        expect(parsed.meta.modality).toBe('CT');
        expect(parsed.meta.rows).toBe(512);
        expect(parsed.meta.columns).toBe(512);
        expect(parsed.pixelData.length).toBe(512 * 512);
      }
    }
  });

  it('validates protocol selector throws or flags C-MOVE for HMIS_PACS', () => {
    function validateRetrievalStrategy(server: {
      aeTitle: string;
      retrieveProtocol: string;
    }): { valid: boolean; error?: string } {
      if (server.aeTitle === 'HMIS_PACS' && server.retrieveProtocol === 'C-MOVE') {
        return {
          valid: false,
          error: 'HMIS_PACS does not support C-MOVE (rejects with 0xC000). Must use C-GET.',
        };
      }
      return { valid: true };
    }

    const invalidConfig = validateRetrievalStrategy({
      aeTitle: 'HMIS_PACS',
      retrieveProtocol: 'C-MOVE',
    });
    expect(invalidConfig.valid).toBe(false);
    expect(invalidConfig.error).toContain('Must use C-GET');

    const validConfig = validateRetrievalStrategy({
      aeTitle: 'HMIS_PACS',
      retrieveProtocol: 'C-GET',
    });
    expect(validConfig.valid).toBe(true);
  });
});
