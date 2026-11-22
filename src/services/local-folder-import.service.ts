// Layer 2 (Domain/Services): Local DICOM Folder & Directory Import Service
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '@/db';
import { hospitalPacsStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseStudyHeader, parseSliceHeader } from './dicom-header-reader';
import { getUnifiedStorageSettings, saveUnifiedStorageSettings } from './storage-config.service';
import { getLocalCases } from './local-cases.service';
import { logAudit } from './audit.service';
import { inferModality, resolveClinicalDescription } from '@/lib/modality-inference';

export interface DiscoveredStudySummary {
  accessionNumber: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDescription: string;
  studyDate?: string;
  studyTime?: string;
  studyInstanceUid?: string;
  numSeries: number;
  numInstances: number;
  folderPath: string;
}

export interface DetectedFolderInfo {
  path: string;
  label: string;
  exists: boolean;
  studyCount: number;
  isConfigured: boolean;
}

const getRuntimeFs = (): typeof fs => (typeof window === 'undefined' ? eval("require('fs')") : fs);

/**
 * Probes the workstation machine for known local DICOM storage paths.
 */
export function detectAvailableLocalFolders(): DetectedFolderInfo[] {
  const rfs = getRuntimeFs();
  const settings = getUnifiedStorageSettings();
  const defaultDir = process.env.LOCAL_CASES_DIR || path.join(process.cwd(), 'cases');
  const candidates: Array<{ path: string; label: string }> = [
    { path: settings.localPath || defaultDir, label: 'Configured Storage Directory' },
    { path: 'C:/Users/muham/Downloads/cases/My_Cases', label: 'My Cases (Downloads)' },
    { path: 'C:/Users/muham/Downloads/cases', label: 'Downloads Cases Directory' },
    { path: 'C:/MedicalSandbox/Cases', label: 'Medical Sandbox Cases' },
    { path: 'E:/Cases', label: 'External Drive (E:\\Cases)' },
    { path: defaultDir, label: 'Default Workspace Cases Directory' },
  ];

  const seen = new Set<string>();
  const results: DetectedFolderInfo[] = [];

  for (const c of candidates) {
    const norm = path.normalize(c.path).toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);

    let exists = false;
    let studyCount = 0;

    try {
      if (rfs.existsSync(c.path) && rfs.statSync(c.path).isDirectory()) {
        exists = true;
        const entries = rfs.readdirSync(c.path);
        for (const ent of entries) {
          try {
            const p = path.join(c.path, ent);
            if (rfs.statSync(p).isDirectory()) studyCount++;
          } catch {}
        }
      }
    } catch {}

    results.push({
      path: c.path,
      label: c.label,
      exists,
      studyCount,
      isConfigured: norm === path.normalize(settings.localPath || '').toLowerCase(),
    });
  }

  return results;
}

/**
 * Recursively discovers all DICOM slice files within a directory tree up to maxDepth.
 */
function gatherDicomFiles(dir: string, depth = 0, maxDepth = 4): string[] {
  if (depth > maxDepth) return [];
  const rfs = getRuntimeFs();
  const files: string[] = [];

  try {
    const entries = rfs.readdirSync(dir);
    for (const ent of entries) {
      const full = path.join(dir, ent);
      try {
        const stat = rfs.statSync(full);
        if (stat.isDirectory()) {
          files.push(...gatherDicomFiles(full, depth + 1, maxDepth));
        } else if (stat.isFile() && (ent.toLowerCase().endsWith('.dcm') || (!ent.includes('.') && stat.size > 132))) {
          files.push(full);
        }
      } catch {}
    }
  } catch {}

  return files;
}

/**
 * Scans a local folder on disk, groups files into studies, and indexes them into hospital_pacs_studies.
 */
export async function scanAndIndexLocalDirectory(
  targetDir: string,
  options: { userId?: string; userName?: string } = {}
): Promise<{
  success: boolean;
  folderPath: string;
  totalFiles: number;
  studyCount: number;
  studies: DiscoveredStudySummary[];
  error?: string;
}> {
  const rfs = getRuntimeFs();
  const cleanPath = path.normalize(targetDir.trim());

  if (!rfs.existsSync(cleanPath)) {
    return { success: false, folderPath: cleanPath, totalFiles: 0, studyCount: 0, studies: [], error: `Directory does not exist: ${cleanPath}` };
  }

  try {
    const stat = rfs.statSync(cleanPath);
    if (!stat.isDirectory()) {
      return { success: false, folderPath: cleanPath, totalFiles: 0, studyCount: 0, studies: [], error: `Path is not a directory: ${cleanPath}` };
    }
  } catch (err: any) {
    return { success: false, folderPath: cleanPath, totalFiles: 0, studyCount: 0, studies: [], error: err.message };
  }

  // 1. Gather all DICOM files under this folder tree
  const allFiles = gatherDicomFiles(cleanPath);
  if (allFiles.length === 0) {
    return { success: false, folderPath: cleanPath, totalFiles: 0, studyCount: 0, studies: [], error: 'No DICOM files (.dcm) found in the selected folder.' };
  }

  // 2. Group files by Study (group by StudyInstanceUID or study subfolder)
  const studyGroups = new Map<string, { files: string[]; sampleFile: string; parentDir: string }>();

  for (const filePath of allFiles) {
    // Read partial header to obtain StudyInstanceUID
    const sliceMeta = parseSliceHeader(filePath);
    const parentDir = path.dirname(filePath);
    
    // Group key: Use study folder name or slice header UID
    const rel = path.relative(cleanPath, filePath);
    const parts = rel.split(path.sep);
    let topFolder = parts.length > 1 ? parts[0] : path.basename(cleanPath);
    if (parts.length > 2 && /^(my_cases|cases|dicom|studies)$/i.test(parts[0])) {
      topFolder = parts[1];
    }
    const groupKey = topFolder;

    if (!studyGroups.has(groupKey)) {
      studyGroups.set(groupKey, {
        files: [],
        sampleFile: filePath,
        parentDir,
      });
    }
    studyGroups.get(groupKey)!.files.push(filePath);
  }

  const discoveredStudies: DiscoveredStudySummary[] = [];
  const nowDate = new Date();

  // 3. Process and index each discovered study group
  for (const [groupName, group] of studyGroups.entries()) {
    const studyMeta = parseStudyHeader(group.sampleFile, groupName);
    const accession = (studyMeta.accessionNumber || groupName).trim().toUpperCase();
    const patientName = (studyMeta.patientName || groupName).trim();
    const patientId = (studyMeta.patientId || accession).trim();
    const studyTimeVal = (studyMeta.studyTime || '').trim();
    const mod = inferModality(studyMeta.modality, studyMeta.studyDescription, patientName, studyTimeVal);
    const resolvedDesc = resolveClinicalDescription(studyMeta.studyDescription, null, null, null, mod, patientName, studyTimeVal);

    // Count distinct series
    const seriesSet = new Set<string>();
    for (const f of group.files) {
      const sm = parseSliceHeader(f);
      seriesSet.add(sm.seriesInstanceUid || sm.seriesNumber || '1');
    }

    const summary: DiscoveredStudySummary = {
      accessionNumber: accession,
      patientName,
      patientId,
      modality: mod,
      studyDescription: resolvedDesc,
      studyDate: studyMeta.studyDate || nowDate.toISOString().slice(0, 10).replace(/-/g, ''),
      studyTime: studyTimeVal,
      studyInstanceUid: studyMeta.studyInstanceUid || `1.2.840.${accession}`,
      numSeries: seriesSet.size || 1,
      numInstances: group.files.length,
      folderPath: group.parentDir,
    };

    discoveredStudies.push(summary);

    // Upsert into hospital_pacs_studies
    try {
      const existing = await db
        .select({ id: hospitalPacsStudies.id, s3Status: hospitalPacsStudies.s3Status })
        .from(hospitalPacsStudies)
        .where(eq(hospitalPacsStudies.accessionNumber, accession))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(hospitalPacsStudies).values({
          accessionNumber: accession,
          patientName,
          patientId,
          patientMrn: patientId,
          modality: mod,
          studyDescription: resolvedDesc,
          studyDate: summary.studyDate,
          studyTime: studyTimeVal,
          studyInstanceUid: summary.studyInstanceUid,
          numSeries: summary.numSeries,
          numInstances: summary.numInstances,
          pacsSource: 'LOCAL_FOLDER',
          s3Status: 'local_only',
          lastIndexedAt: nowDate,
          createdAt: nowDate,
        } as any);
      } else {
        await db
          .update(hospitalPacsStudies)
          .set({
            patientName,
            patientId,
            patientMrn: patientId,
            modality: mod,
            studyDescription: resolvedDesc,
            studyDate: summary.studyDate,
            studyTime: studyTimeVal,
            numSeries: summary.numSeries,
            numInstances: summary.numInstances,
            pacsSource: 'LOCAL_FOLDER',
            lastIndexedAt: nowDate,
          } as any)
          .where(eq(hospitalPacsStudies.id, existing[0].id));
      }
    } catch (dbErr) {
      console.warn('[INDEX_STUDY_DB_WARN]', accession, dbErr);
    }
  }

  // 4. Update unified storage configuration if importing the root cases directory
  try {
    const defaultDir = process.env.LOCAL_CASES_DIR || path.join(process.cwd(), 'cases');
    const currentSettings = getUnifiedStorageSettings();
    if (!currentSettings.localPath || currentSettings.localPath === defaultDir) {
      saveUnifiedStorageSettings({ localPath: cleanPath });
    }
  } catch {}

  // 5. Invalidate and refresh local-cases cache
  getLocalCases(true, cleanPath);

  // 6. Record audit log
  await logAudit({
    userId: options.userId || 'system',
    action: 'IMPORT_LOCAL_FOLDER',
    entityType: 'Study',
    entityId: cleanPath,
    details: `Imported ${discoveredStudies.length} studies (${allFiles.length} slices) from local folder ${cleanPath}`,
  });

  return {
    success: true,
    folderPath: cleanPath,
    totalFiles: allFiles.length,
    studyCount: discoveredStudies.length,
    studies: discoveredStudies,
  };
}
