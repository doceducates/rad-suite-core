import fs from 'fs';
import path from 'path';
import dicomParser from 'dicom-parser';

export interface DicomSliceHeaderMeta {
  file: string;
  seriesNumber: string;
  seriesInstanceUid: string;
  studyInstanceUid?: string;
  patientId?: string;
  seriesDescription?: string;
  instanceNumber: number;
  ipp?: [number, number, number];
  iop?: number[];
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
}

export interface DicomStudyHeaderMeta {
  patientName: string;
  patientId: string;
  accessionNumber: string;
  modality: string;
  studyDescription: string;
  studyDate?: string;
  studyTime?: string;
  age?: string;
  gender?: string;
  dateOfBirth?: string;
  examId?: string;
  referringPhysician?: string;
  studyInstanceUid: string;
}

/**
 * Fast partial DICOM header reader. Reads only initial header bytes (default 8KB),
 * avoiding multi-megabyte pixel data loading into memory during directory sweeps.
 * Safely manages file descriptors with try-finally and recovers partial dataSet on buffer EOF.
 */
export function readDicomHeaderFast(filePath: string, maxBytes = 8192): dicomParser.DataSet | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buf, 0, maxBytes, 0);

    try {
      return dicomParser.parseDicom(new Uint8Array(buf.buffer, buf.byteOffset, bytesRead), {
        untilTag: 'x7fe00010',
      });
    } catch (err: any) {
      if (err?.dataSet && (err.dataSet.elements['x0020000e'] || err.dataSet.elements['x00200011'])) {
        return err.dataSet;
      }
    }
  } catch {
    // If open/read fails, proceed to full-file fallback below
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore close error
      }
    }
  }

  try {
    const full = fs.readFileSync(filePath);
    return dicomParser.parseDicom(new Uint8Array(full));
  } catch {
    return null;
  }
}

/**
 * Extracts slice metadata, series identifiers, and 3D geometric positioning tags.
 */
export function parseSliceHeader(filePath: string): DicomSliceHeaderMeta {
  const ds = readDicomHeaderFast(filePath);
  if (!ds) {
    const parts = path.basename(filePath).split('-');
    const fallbackNum = parts.length >= 2 ? parts[1].trim() : '1';
    return {
      file: filePath,
      seriesNumber: fallbackNum,
      seriesInstanceUid: fallbackNum,
      instanceNumber: 0,
    };
  }

  const sNum = ds.string('x00200011')?.trim();
  const sUid = ds.string('x0020000e')?.trim();
  const stUid = ds.string('x0020000d')?.trim();
  const pId = ds.string('x00100020')?.trim();
  const sDesc = ds.string('x0008103e')?.trim();
  const instNumStr = ds.string('x00200013')?.trim();
  const ippStr = ds.string('x00200032')?.trim();
  const iopStr = ds.string('x00200037')?.trim();
  const pixelSpacingStr = ds.string('x00280030')?.trim();
  const rows = ds.uint16('x00280010');
  const columns = ds.uint16('x00280011');

  const seriesNumber = sNum || (sUid ? sUid : '1');
  const seriesInstanceUid = sUid || seriesNumber;
  const studyInstanceUid = stUid || undefined;
  const patientId = pId || undefined;
  const seriesDescription = sDesc || undefined;
  const instanceNumber = instNumStr ? parseInt(instNumStr, 10) : 0;

  const ipp = ippStr ? (ippStr.split('\\').map(Number).filter((n) => !isNaN(n)) as [number, number, number]) : undefined;
  const iop = iopStr ? iopStr.split('\\').map(Number).filter((n) => !isNaN(n)) : undefined;
  const pixelSpacing = pixelSpacingStr
    ? (pixelSpacingStr.split('\\').map(Number).filter((n) => !isNaN(n)) as [number, number])
    : undefined;

  return {
    file: filePath,
    seriesNumber,
    seriesInstanceUid,
    studyInstanceUid,
    patientId,
    seriesDescription,
    instanceNumber: isNaN(instanceNumber) ? 0 : instanceNumber,
    ipp: ipp && ipp.length === 3 ? ipp : undefined,
    iop: iop && iop.length === 6 ? iop : undefined,
    pixelSpacing: pixelSpacing && pixelSpacing.length >= 2 ? [pixelSpacing[0], pixelSpacing[1]] : undefined,
    rows,
    columns,
  };
}

/**
 * Extracts study-level demographics and identification tags from a sample DICOM file.
 * Trims all string attributes to handle DICOM Part 5 space padding.
 */
export function parseStudyHeader(filePath: string, fallbackDirName: string): DicomStudyHeaderMeta {
  const cleanFallback = fallbackDirName.trim();
  const ds = readDicomHeaderFast(filePath);
  if (!ds) {
    return {
      patientName: cleanFallback,
      patientId: cleanFallback,
      accessionNumber: cleanFallback,
      modality: 'MR',
      studyDescription: 'Medical Imaging',
      studyInstanceUid: '',
    };
  }

  const rawPatientName = ds.string('x00100010');
  const rawPatientId = ds.string('x00100020');
  const rawAccession = ds.string('x00080050');
  const rawModality = ds.string('x00080060');
  const rawStudyDesc = ds.string('x00081030');
  const rawStudyDate = ds.string('x00080020');
  const rawStudyTime = ds.string('x00080030');
  const rawAge = ds.string('x00101010');
  const rawGender = ds.string('x00100040');
  const rawDob = ds.string('x00100030');
  const rawExamId = ds.string('x00200010');
  const rawPhysician = ds.string('x00080090');
  const rawStudyUid = ds.string('x0020000d');

  const patientId = rawPatientId?.trim() || cleanFallback;
  return {
    patientName: rawPatientName?.trim() || cleanFallback,
    patientId,
    accessionNumber: rawAccession?.trim() || patientId,
    modality: rawModality?.trim() || 'MR',
    studyDescription: rawStudyDesc?.trim() || 'Medical Imaging',
    studyDate: rawStudyDate?.trim() || undefined,
    studyTime: rawStudyTime?.trim() || undefined,
    age: rawAge?.trim() || undefined,
    gender: rawGender?.trim() || undefined,
    dateOfBirth: rawDob?.trim() || undefined,
    examId: rawExamId?.trim() || undefined,
    referringPhysician: rawPhysician?.trim() || undefined,
    studyInstanceUid: rawStudyUid?.trim() || '',
  };
}
