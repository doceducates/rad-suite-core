// Layer 2 (Domain/Services): Case Packaging & ZIP Generation Service
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import { ZipArchive } from 'archiver';
import { getLocalCaseById } from './local-cases.service';
import { createS3StudyZipBuffer } from './s3-zip.service';
import { HOT_CASES_DIR } from './hot-case-staging.service';

/**
 * Packages all DICOM files from a local directory into a consolidated ZIP buffer.
 */
export async function createCaseZipBuffer(caseFolder: string): Promise<Buffer> {
  if (!fs.existsSync(caseFolder)) {
    throw new Error(`Directory does not exist: ${caseFolder}`);
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const passThrough = new PassThrough();
  archive.pipe(passThrough);

  const chunks: Uint8Array[] = [];
  passThrough.on('data', (c) => chunks.push(c));

  let fileCount = 0;

  async function scanAndAppend(dir: string, baseDir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await scanAndAppend(fullPath, baseDir);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        // Include .dcm files, or files without extension in DICOM series
        if (ext === '.dcm' || !ext || ext === '.dicom') {
          const relativeName = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          archive.file(fullPath, { name: relativeName.endsWith('.dcm') ? relativeName : `${relativeName}.dcm` });
          fileCount++;
        }
      }
    }
  }

  await scanAndAppend(caseFolder, caseFolder);

  if (fileCount === 0) {
    archive.destroy();
    throw new Error(`No DICOM files found in directory: ${caseFolder}`);
  }

  archive.finalize();

  await new Promise<void>((resolve, reject) => {
    passThrough.on('end', resolve);
    passThrough.on('error', reject);
    archive.on('error', reject);
  });

  return Buffer.concat(chunks);
}

export interface PackagedStudyResult {
  buffer: Buffer;
  patientName: string;
  modality: string;
  studyDate?: string;
  source: 'local' | 'hot_staged' | 's3';
}

/**
 * Resolves a study across local disk, hot-staging cache, and S3, and builds a consolidated ZIP.
 */
export async function packageStudyToZip(accessionNumber: string): Promise<PackagedStudyResult> {
  const cleanAcc = (accessionNumber || '').trim();
  if (!cleanAcc) {
    throw new Error('Accession number is required');
  }

  // 1. Try Local Case Storage
  const localCase = getLocalCaseById(cleanAcc);
  if (localCase && localCase.folderPath && fs.existsSync(localCase.folderPath)) {
    const buffer = await createCaseZipBuffer(localCase.folderPath);
    return {
      buffer,
      patientName: localCase.patientName || 'PATIENT',
      modality: localCase.modality || 'MR',
      studyDate: localCase.studyDate,
      source: 'local',
    };
  }

  // 2. Try Hot Staging Directory
  const hotPath = path.join(HOT_CASES_DIR, cleanAcc);
  if (fs.existsSync(hotPath)) {
    const buffer = await createCaseZipBuffer(hotPath);
    return {
      buffer,
      patientName: localCase?.patientName || 'PATIENT',
      modality: localCase?.modality || 'CT',
      source: 'hot_staged',
    };
  }

  // 3. Fallback to S3 Cloud Object Storage
  const s3Buffer = await createS3StudyZipBuffer(cleanAcc);
  if (s3Buffer && s3Buffer.length > 0) {
    return {
      buffer: s3Buffer,
      patientName: 'PATIENT',
      modality: 'MR',
      source: 's3',
    };
  }

  throw new Error(`Could not find study instances for accession: ${cleanAcc}`);
}
