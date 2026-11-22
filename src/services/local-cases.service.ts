import fs from 'fs';
import path from 'path';
import { getOrientationFromIop, detectOrientationFromDescription } from './dicom-geometry.service';
import { parseSliceHeader, parseStudyHeader } from './dicom-header-reader';

export interface LocalSeriesInfo {
  seriesNumber: string;
  seriesDescription: string;
  orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceCount: number;
  files: string[];
  firstIpp?: [number, number, number];
  lastIpp?: [number, number, number];
  iop?: number[];
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
}

export interface LocalCaseStudy {
  id: string;
  patientName: string;
  patientId: string;
  accessionNumber: string;
  modality: string;
  studyDescription: string;
  studyDate: string;
  studyTime?: string;
  dateOfBirth?: string;
  examId?: string;
  referringPhysician?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  studyInstanceUid: string;
  numInstances: number;
  folderPath: string;
  series: LocalSeriesInfo[];
}

interface SliceMeta {
  file: string;
  instanceNumber: number;
  ipp?: [number, number, number];
  iop?: number[];
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
}

const DEFAULT_CASES_DIR = process.env.CASES_DIR || path.join(process.cwd(), 'cases');
let cachedCases: LocalCaseStudy[] | null = null;
let lastScanTime = 0;
let lastScanDir = '';

// Dynamic runtime FS access to prevent Next.js / Turbopack NFT from tracing external drive paths during build
const getRuntimeFs = (): typeof fs => (typeof window === 'undefined' ? eval("require('fs')") : fs);

export function formatDicomDate(dateStr?: string, timeStr?: string, fallback?: Date): string {
  if (dateStr && dateStr.length === 8) {
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    const hh = timeStr && timeStr.length >= 2 ? timeStr.slice(0, 2) : '12';
    const mm = timeStr && timeStr.length >= 4 ? timeStr.slice(2, 4) : '00';
    const ss = timeStr && timeStr.length >= 6 ? timeStr.slice(4, 6) : '00';
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
  }
  return (fallback || new Date()).toISOString();
}

export function getLocalCases(forceRefresh = false, customDir?: string): LocalCaseStudy[] {
  const rfs = getRuntimeFs();
  const targetDirs: string[] = [];
  if (customDir) {
    if (rfs.existsSync(customDir)) targetDirs.push(customDir);
  } else {
    const candidates = [
      process.env.CASES_DIR,
      process.env.LOCAL_CASES_DIR,
      'C:/MedicalSandbox/Cases',
      'C:/Users/muham/Downloads/cases',
      DEFAULT_CASES_DIR,
    ].filter(Boolean) as string[];
    for (const d of candidates) {
      if (rfs.existsSync(d) && !targetDirs.includes(d)) targetDirs.push(d);
    }
  }
  if (targetDirs.length === 0) return [];

  const cacheKey = targetDirs.join(';');
  if (!forceRefresh && cachedCases && cacheKey === lastScanDir && Date.now() - lastScanTime < 10000) {
    return cachedCases;
  }

  const results: LocalCaseStudy[] = [];

  for (const targetDir of targetDirs) {
    try {
      const caseDirs = rfs.readdirSync(targetDir);

    for (const dirName of caseDirs) {
      const casePath = path.join(/*turbopackIgnore: true*/ targetDir, dirName);
      let stat: fs.Stats;
      try {
        stat = rfs.statSync(casePath);
        if (!stat.isDirectory()) continue;
      } catch {
        continue;
      }

      // Recursively gather all DICOM files under casePath
      const allFiles: string[] = [];
      const gather = (curr: string, depth = 0) => {
        if (depth > 3) return;
        try {
          const list = rfs.readdirSync(curr);
          for (const item of list) {
            const full = path.join(curr, item);
            try {
              const s = rfs.statSync(full);
              if (s.isDirectory()) {
                gather(full, depth + 1);
              } else if (item.toLowerCase().endsWith('.dcm') || (!item.includes('.') && s.size > 132)) {
                allFiles.push(full);
              }
            } catch {}
          }
        } catch {}
      };
      gather(casePath);

      if (allFiles.length === 0) continue;

      const studyFolder = path.dirname(allFiles[0]);
      const studyMeta = parseStudyHeader(allFiles[0], dirName);

      const seriesGroups = new Map<
        string,
        {
          seriesNumber: string;
          seriesInstanceUid: string;
          seriesDescription?: string;
          slices: SliceMeta[];
        }
      >();

      for (const filePath of allFiles) {
        const meta = parseSliceHeader(filePath);
        const groupKey = meta.seriesInstanceUid || meta.seriesNumber || '1';

        if (!seriesGroups.has(groupKey)) {
          seriesGroups.set(groupKey, {
            seriesNumber: meta.seriesNumber,
            seriesInstanceUid: meta.seriesInstanceUid,
            seriesDescription: meta.seriesDescription,
            slices: [],
          });
        }

        const group = seriesGroups.get(groupKey)!;
        if (!group.seriesDescription && meta.seriesDescription) {
          group.seriesDescription = meta.seriesDescription;
        }

        group.slices.push({
          file: filePath,
          instanceNumber: meta.instanceNumber,
          ipp: meta.ipp,
          iop: meta.iop,
          pixelSpacing: meta.pixelSpacing,
          rows: meta.rows,
          columns: meta.columns,
        });
      }

      const seriesList: LocalSeriesInfo[] = [];

      for (const group of seriesGroups.values()) {
        const seriesDesc = group.seriesDescription || `Series ${group.seriesNumber}`;

        // Deduplicate slices while preserving multi-phase 4D series (DCE-MRI / cine)
        const uniqueSlices = new Map<string, SliceMeta>();
        for (const slice of group.slices) {
          const ippPart = slice.ipp ? slice.ipp.map((v) => v.toFixed(4)).join('\\') : '';
          const key = `${slice.instanceNumber}_${ippPart}`;
          if (!uniqueSlices.has(key)) {
            uniqueSlices.set(key, slice);
          }
        }

        const finalSlices = Array.from(uniqueSlices.values());

        // Sort physically using slice normal or InstanceNumber fallback with tie-breaking
        const iopForNormal = finalSlices.find((s) => s.iop?.length === 6)?.iop;
        if (iopForNormal && iopForNormal.length === 6) {
          const [rX, rY, rZ, cX, cY, cZ] = iopForNormal;
          const nX = rY * cZ - rZ * cY;
          const nY = rZ * cX - rX * cZ;
          const nZ = rX * cY - rY * cX;

          finalSlices.sort((a, b) => {
            if (a.ipp && b.ipp) {
              const distA = a.ipp[0] * nX + a.ipp[1] * nY + a.ipp[2] * nZ;
              const distB = b.ipp[0] * nX + b.ipp[1] * nY + b.ipp[2] * nZ;
              if (Math.abs(distA - distB) > 1e-4) {
                return distA - distB;
              }
            }
            return a.instanceNumber - b.instanceNumber;
          });
        } else {
          finalSlices.sort((a, b) => a.instanceNumber - b.instanceNumber);
        }

        let orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | undefined;
        if (iopForNormal) {
          orientation = getOrientationFromIop(iopForNormal);
        }
        if (!orientation) {
          orientation = detectOrientationFromDescription(seriesDesc);
        }

        const sortedFiles = finalSlices.map((s) => s.file);
        const firstMeta = finalSlices[0];
        const lastMeta = finalSlices[finalSlices.length - 1];

        seriesList.push({
          seriesNumber: group.seriesNumber,
          seriesDescription: seriesDesc,
          orientation,
          sliceCount: sortedFiles.length,
          files: sortedFiles,
          firstIpp: firstMeta?.ipp,
          lastIpp: lastMeta?.ipp,
          iop: firstMeta?.iop,
          pixelSpacing: firstMeta?.pixelSpacing,
          rows: firstMeta?.rows,
          columns: firstMeta?.columns,
        });
      }

      seriesList.sort((a, b) => {
        const na = parseInt(a.seriesNumber, 10);
        const nb = parseInt(b.seriesNumber, 10);
        if (isNaN(na) || isNaN(nb)) return a.seriesNumber.localeCompare(b.seriesNumber);
        return na - nb;
      });

      const caseId = dirName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const age = studyMeta.age ? parseInt(studyMeta.age.replace(/\D/g, ''), 10) || 45 : 45;
      const gender: 'Male' | 'Female' | 'Other' =
        studyMeta.gender === 'F' ? 'Female' : studyMeta.gender === 'M' ? 'Male' : 'Other';

      results.push({
        id: caseId,
        patientName: studyMeta.patientName,
        patientId: studyMeta.patientId,
        accessionNumber: studyMeta.accessionNumber,
        modality: studyMeta.modality,
        studyDescription: studyMeta.studyDescription,
        studyDate: formatDicomDate(studyMeta.studyDate, studyMeta.studyTime, stat.mtime),
        studyTime: studyMeta.studyTime,
        dateOfBirth: studyMeta.dateOfBirth,
        examId: studyMeta.examId,
        referringPhysician: studyMeta.referringPhysician,
        age,
        gender,
        studyInstanceUid: studyMeta.studyInstanceUid,
        numInstances: allFiles.length,
        folderPath: studyFolder,
        series: seriesList,
      });
    }
  } catch (err) {
    console.error(`Error scanning ${targetDir}:`, err);
  }
}

  // Deduplicate identical studies residing across multiple folders
  const deduplicated: LocalCaseStudy[] = [];
  const seenMap = new Map<string, LocalCaseStudy>();

  for (const c of results) {
    const key = (c.studyInstanceUid || c.accessionNumber || c.id).toLowerCase();
    const existing = seenMap.get(key);
    if (!existing) {
      seenMap.set(key, c);
      deduplicated.push(c);
    } else if (
      c.numInstances > existing.numInstances ||
      (c.id.startsWith(c.accessionNumber) && !existing.id.startsWith(existing.accessionNumber))
    ) {
      const idx = deduplicated.indexOf(existing);
      if (idx !== -1) deduplicated[idx] = c;
      seenMap.set(key, c);
    }
  }

  cachedCases = deduplicated;
  lastScanTime = Date.now();
  lastScanDir = cacheKey;
  return deduplicated;
}

export function getLocalCaseById(id: string, customDir?: string): LocalCaseStudy | undefined {
  if (!id) return undefined;
  const cases = getLocalCases(false, customDir);
  const clean = id.trim().toLowerCase();
  return cases.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.accessionNumber.toLowerCase() === clean ||
      c.patientId.toLowerCase() === clean ||
      c.patientName.toLowerCase().includes(clean)
  );
}
