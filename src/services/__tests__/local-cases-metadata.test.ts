import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getLocalCases, getLocalCaseById } from '../local-cases.service';
import { parseSliceHeader, parseStudyHeader } from '../dicom-header-reader';
import { getOrientationFromIop, detectOrientationFromDescription } from '../dicom-geometry.service';
import { createMockDicomBuffer } from './test-dicom-helper';

describe('Local DICOM Series Separation & Orientation Parsing', () => {
  let testTempDir: string;
  let testCaseDir: string;

  beforeAll(() => {
    testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rad-cases-test-'));
    testCaseDir = path.join(testTempDir, '192609999_MOCK_STUDY');
    fs.mkdirSync(testCaseDir, { recursive: true });

    // Auxiliary subfolder to test subfolder prioritization (root files must be processed)
    fs.mkdirSync(path.join(testCaseDir, 'auxiliary_previews'), { recursive: true });

    const slices = [
      { name: '1.2.826.0.1.3680043.2.1143.1001.1.dcm', sNum: '1001', sUid: '1.2.392.200036.9116.4.2.9652.38686.1002', desc: 'Loc 3PL (C0)', inst: 1, iop: '1\\0\\0\\0\\0\\-1', ipp: '0\\0\\0' },
      { name: '1.2.826.0.1.3680043.2.1143.1001.2.dcm', sNum: '1001', sUid: '1.2.392.200036.9116.4.2.9652.38686.1002', desc: 'Loc 3PL (C0)', inst: 2, iop: '1\\0\\0\\0\\0\\-1', ipp: '0\\0\\10' },
      { name: '1.2.826.0.1.3680043.2.1143.13001.1.dcm', sNum: '13001', sUid: '1.2.392.200036.9116.4.2.9652.38686.13002', desc: 'SG T2', inst: 1, iop: '.05678781\\.99672246\\.05761498\\.1056899\\.05138226\\-.99307072', ipp: '-7.92\\-96.92\\-29.42', rows: 512, cols: 512, sp: '0.625\\0.625' },
      { name: '1.2.826.0.1.3680043.2.1143.13001.2.dcm', sNum: '13001', sUid: '1.2.392.200036.9116.4.2.9652.38686.13002', desc: 'SG T2', inst: 2, iop: '.05678781\\.99672246\\.05761498\\.1056899\\.05138226\\-.99307072', ipp: '-11.92\\-96.92\\-29.42', rows: 512, cols: 512, sp: '0.625\\0.625' },
      { name: '1.2.826.0.1.3680043.2.1143.14001.1.dcm', sNum: '14001', sUid: '1.2.392.200036.9116.4.2.9652.38686.14002', desc: 'SG T1', inst: 1, iop: '.05678781\\.99672246\\.05761498\\.1056899\\.05138226\\-.99307072', ipp: '-5.0\\-90.0\\-20.0' },
      { name: '1.2.826.0.1.3680043.2.1143.15001.1.dcm', sNum: '15001', sUid: '1.2.392.200036.9116.4.2.9652.38686.15002', desc: 'COR T2 STIR', inst: 1 },
      { name: '1.2.826.0.1.3680043.2.1143.16001.1.dcm', sNum: '16001', sUid: '1.2.392.200036.9116.4.2.9652.38686.16002', desc: 'AX T1', inst: 1 },
    ];

    for (const s of slices) {
      fs.writeFileSync(
        path.join(testCaseDir, s.name),
        createMockDicomBuffer({
          patientName: 'TEST^PATIENT ',
          patientId: '19202652134763 ',
          accessionNumber: '192609005769 ',
          modality: 'MR ',
          seriesNumber: s.sNum,
          seriesInstanceUid: s.sUid,
          seriesDescription: s.desc,
          instanceNumber: s.inst,
          iop: s.iop,
          ipp: s.ipp,
          rows: s.rows,
          columns: s.cols,
          pixelSpacing: s.sp,
        })
      );
    }
  });

  afterAll(() => {
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('separates non-hyphenated SOP UID files into distinct series using real DICOM header attributes', () => {
    const cases = getLocalCases(true, testTempDir);
    expect(cases.length).toBe(1);

    const study = cases[0];
    expect(study.id).toBe('192609999_MOCK_STUDY');
    expect(study.series.length).toBe(5);

    const sNums = study.series.map((s) => s.seriesNumber);
    expect(sNums).toEqual(['1001', '13001', '14001', '15001', '16001']);
  });

  it('accurately sets seriesDescription for every series from tag (0008,103e)', () => {
    const cases = getLocalCases(false, testTempDir);
    const study = cases[0];

    expect(study.series.find((s) => s.seriesNumber === '1001')?.seriesDescription).toBe('Loc 3PL (C0)');
    expect(study.series.find((s) => s.seriesNumber === '13001')?.seriesDescription).toBe('SG T2');
    expect(study.series.find((s) => s.seriesNumber === '14001')?.seriesDescription).toBe('SG T1');
    expect(study.series.find((s) => s.seriesNumber === '15001')?.seriesDescription).toBe('COR T2 STIR');
    expect(study.series.find((s) => s.seriesNumber === '16001')?.seriesDescription).toBe('AX T1');
  });

  it('retains rows, columns, and pixelSpacing on series and trims padded strings', () => {
    const cases = getLocalCases(false, testTempDir);
    const study = cases[0];

    // String trimming for space-padded fields
    expect(study.patientName).toBe('TEST^PATIENT');
    expect(study.patientId).toBe('19202652134763');
    expect(study.accessionNumber).toBe('192609005769');
    expect(study.modality).toBe('MR');

    // 3D geometry dimensions retained on series
    const s13001 = study.series.find((s) => s.seriesNumber === '13001');
    expect(s13001?.rows).toBe(512);
    expect(s13001?.columns).toBe(512);
    expect(s13001?.pixelSpacing).toEqual([0.625, 0.625]);
  });

  it('preserves multi-phase slices in 4D dynamic series without purging identical IPP', () => {
    const cineDir = path.join(testTempDir, 'CINE_4D_STUDY');
    fs.mkdirSync(cineDir, { recursive: true });

    // 2 slices at identical spatial IPP but distinct instanceNumber (temporal phases)
    for (const inst of [1, 2]) {
      fs.writeFileSync(
        path.join(cineDir, `phase${inst}.dcm`),
        createMockDicomBuffer({
          studyInstanceUid: '1.2.840.10008.1.cine4d',
          accessionNumber: 'ACC_CINE_4D',
          seriesNumber: '200',
          seriesInstanceUid: '1.2.840.10008.200',
          instanceNumber: inst,
          ipp: '10.0\\20.0\\30.0',
          iop: '1\\0\\0\\0\\1\\0',
        })
      );
    }

    const cases = getLocalCases(true, testTempDir);
    const cineStudy = cases.find((c) => c.id === 'CINE_4D_STUDY');
    expect(cineStudy).toBeDefined();
    expect(cineStudy?.series[0].sliceCount).toBe(2);
  });

  it('accurately detects orientation using getOrientationFromIop and detectOrientationFromDescription', () => {
    const cases = getLocalCases(false, testTempDir);
    const study = cases.find((c) => c.id === '192609999_MOCK_STUDY')!;

    expect(study.series.find((s) => s.seriesNumber === '1001')?.orientation).toBe('CORONAL');
    expect(study.series.find((s) => s.seriesNumber === '13001')?.orientation).toBe('SAGITTAL');
    expect(study.series.find((s) => s.seriesNumber === '14001')?.orientation).toBe('SAGITTAL');
    expect(study.series.find((s) => s.seriesNumber === '15001')?.orientation).toBe('CORONAL');
    expect(study.series.find((s) => s.seriesNumber === '16001')?.orientation).toBe('AXIAL');
  });

  it('tests orientation detector helpers directly for clinical sequence acronyms', () => {
    expect(detectOrientationFromDescription('SG T2')).toBe('SAGITTAL');
    expect(detectOrientationFromDescription('COR T2 STIR')).toBe('CORONAL');
    expect(detectOrientationFromDescription('AX T1')).toBe('AXIAL');
    expect(detectOrientationFromDescription('Loc SG')).toBe('SAGITTAL');
    expect(detectOrientationFromDescription('Loc CO')).toBe('CORONAL');

    expect(getOrientationFromIop([1, 0, 0, 0, 1, 0])).toBe('AXIAL');
    expect(getOrientationFromIop([0, 1, 0, 0, 0, -1])).toBe('SAGITTAL');
    expect(getOrientationFromIop([1, 0, 0, 0, 0, -1])).toBe('CORONAL');
  });

  it('verifies slice deduplication and physical sorting along slice normal', () => {
    const cases = getLocalCases(false, testTempDir);
    const study = cases.find((c) => c.id === '192609999_MOCK_STUDY')!;
    const s13001 = study.series.find((s) => s.seriesNumber === '13001');

    expect(s13001?.sliceCount).toBe(2);
    expect(s13001?.files.length).toBe(2);
    expect(s13001?.firstIpp).toBeDefined();
    expect(s13001?.lastIpp).toBeDefined();
  });

  it('falls back to Series ${seriesNumber} when seriesDescription tag is omitted', () => {
    const noDescDir = path.join(testTempDir, 'NO_DESC_STUDY');
    fs.mkdirSync(noDescDir, { recursive: true });
    fs.writeFileSync(
      path.join(noDescDir, 'slice.dcm'),
      createMockDicomBuffer({
        studyInstanceUid: '1.2.840.10008.1.nodesc',
        accessionNumber: 'ACC_NO_DESC',
        seriesNumber: '42',
        seriesInstanceUid: '1.2.3.42',
        instanceNumber: 1,
      })
    );

    const cases = getLocalCases(true, testTempDir);
    const noDescStudy = cases.find((c) => c.id === 'NO_DESC_STUDY');
    expect(noDescStudy).toBeDefined();
    expect(noDescStudy?.series[0].seriesDescription).toBe('Series 42');
  });

  it('verifies parseSliceHeader and parseStudyHeader utility resilience', () => {
    const validFile = path.join(testCaseDir, '1.2.826.0.1.3680043.2.1143.1001.1.dcm');
    const sliceMeta = parseSliceHeader(validFile);
    expect(sliceMeta.seriesNumber).toBe('1001');
    expect(sliceMeta.seriesDescription).toBe('Loc 3PL (C0)');
    expect(sliceMeta.instanceNumber).toBe(1);

    const studyMeta = parseStudyHeader(validFile, 'FALLBACK_ID');
    expect(studyMeta.patientName).toBe('TEST^PATIENT');
    expect(studyMeta.patientId).toBe('19202652134763');
    expect(studyMeta.accessionNumber).toBe('192609005769');

    // Missing file fallback
    const missingSlice = parseSliceHeader(path.join(testCaseDir, 'nonexistent-0002-slice.dcm'));
    expect(missingSlice.seriesNumber).toBe('0002');

    const missingStudy = parseStudyHeader(path.join(testCaseDir, 'nonexistent.dcm'), 'FALLBACK_DIR');
    expect(missingStudy.patientName).toBe('FALLBACK_DIR');
  });

  it('validates live clinical case E:/Cases/192609005769_AHMAD_AYAZ if available', () => {
    const livePath = 'E:/Cases/192609005769_AHMAD_AYAZ';
    if (!fs.existsSync(livePath)) {
      console.log('Skipping live test: E:/Cases/192609005769_AHMAD_AYAZ not present on host');
      return;
    }

    const cases = getLocalCases(true, 'E:/Cases');
    const ahmadCase = cases.find(
      (c) => c.id.includes('AHMAD_AYAZ') || c.patientName.includes('AHMAD') || c.accessionNumber === '192609005769'
    );

    expect(ahmadCase).toBeDefined();
    if (!ahmadCase) return;

    expect(ahmadCase.series.length).toBe(5);

    const totalSlices = ahmadCase.series.reduce((sum, s) => sum + s.sliceCount, 0);
    expect(totalSlices).toBe(53);

    const seriesByNum = new Map(ahmadCase.series.map((s) => [s.seriesNumber, s]));

    const s1001 = seriesByNum.get('1001');
    expect(s1001?.seriesDescription).toBe('Loc 3PL (C0)');
    expect(s1001?.sliceCount).toBe(15);

    const s10001 = seriesByNum.get('10001');
    expect(s10001?.seriesDescription).toBe('Loc 3PL (C0)');
    expect(s10001?.sliceCount).toBe(12);

    const s13001 = seriesByNum.get('13001');
    expect(s13001?.seriesDescription).toBe('SG T2');
    expect(s13001?.sliceCount).toBe(12);
    expect(s13001?.orientation).toBe('SAGITTAL');
    expect(s13001?.rows).toBe(624);
    expect(s13001?.columns).toBe(480);
    expect(s13001?.pixelSpacing).toEqual([0.625, 0.625]);

    const s14001 = seriesByNum.get('14001');
    expect(s14001?.seriesDescription).toBe('SG T1');
    expect(s14001?.sliceCount).toBe(12);
    expect(s14001?.orientation).toBe('SAGITTAL');

    const s15001 = seriesByNum.get('15001');
    expect(s15001?.seriesDescription).toBe('SG T2 STIR');
    expect(s15001?.sliceCount).toBe(2);
    expect(s15001?.orientation).toBe('SAGITTAL');

    const byId = getLocalCaseById('192609005769', 'E:/Cases');
    expect(byId).toBeDefined();
    expect(byId?.series.length).toBe(5);
  });
});
