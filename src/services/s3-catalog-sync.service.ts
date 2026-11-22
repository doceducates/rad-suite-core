// Layer 2: S3 Cloud Catalog Synchronizer
// Automatically crawls S3 cloud storage to populate fresh databases with existing DICOM studies.
import { getEffectiveS3Credentials, buildS3Url, getSigV4Headers, s3HttpGet } from './s3-client';
import { indexHospitalPacsStudies } from './hospital-pacs-index.service';
import type { HospitalPacsStudy } from '@/db/schema';

export interface S3SyncResult {
  synced: number;
  totalKeys: number;
  studies: Array<{ accession: string; patientName: string; modality: string; instances: number }>;
}

export function deriveClinicalStudyDescription(modality: string, seriesSet: Set<string>): string {
  const normMod = (modality || 'MR').toUpperCase().trim();
  const rawSeries = Array.from(seriesSet || []);
  const seriesNames = rawSeries.map((s) =>
    s.replace(/^series-\d+_?/, '').replace(/_+/g, ' ').trim()
  ).filter(Boolean);

  const hasContrast = rawSeries.some((s) =>
    /(_C_|_C$|\+C|\bPOST\b|\bGAD\b|\bCONTRAST\b|\bT1\s*\+?\s*C\b)/i.test(s)
  );

  const combined = seriesNames.join(' | ').toUpperCase();

  // 1. Musculoskeletal
  if (combined.includes('KNEE') || combined.includes('MENISCUS') || combined.includes('PCL') || combined.includes('ACL')) return 'MRI Knee';
  if (combined.includes('SHOULDER') || combined.includes('ROTATOR')) return 'MRI Shoulder';
  if (combined.includes('PELVIS') || combined.includes('HIP') || combined.includes('SIJ') || combined.includes('SACRO')) return 'MRI Pelvis / SI Joints';
  if (combined.includes('ANKLE') || combined.includes('FOOT')) return 'MRI Ankle / Foot';

  // 2. Spine protocols (Sagittal T1/T2 with STIR, or lumbar/cervical/dorsal markers)
  const isSpine =
    combined.includes('LSPINE') || combined.includes('L-SPINE') || combined.includes('LUMBAR') ||
    combined.includes('CSPINE') || combined.includes('C-SPINE') || combined.includes('CERVICAL') ||
    combined.includes('DSPINE') || combined.includes('D-SPINE') || combined.includes('DORSAL') ||
    combined.includes('STIR') ||
    (combined.includes('SG T2') && combined.includes('SG T1'));

  if (isSpine) {
    if (combined.includes('CSPINE') || combined.includes('C-SPINE') || combined.includes('CERVICAL')) {
      return `MRI Cervical Spine${hasContrast ? ' with Contrast' : ''}`;
    }
    if (combined.includes('DSPINE') || combined.includes('D-SPINE') || combined.includes('DORSAL')) {
      return `MRI Dorsal Spine${hasContrast ? ' with Contrast' : ''}`;
    }
    return `MRI L/S Spine${hasContrast ? ' with Contrast' : ''}`;
  }

  // 3. Brain / Neuro protocols (FLAIR, DWI, ADC, GRE, Coronal/Axial Brain sequences)
  const isNeuroOrBrain =
    combined.includes('BRAIN') || combined.includes('HEAD') || combined.includes('FLAIR') ||
    combined.includes('DWI') || combined.includes('ADC') || combined.includes('GRE') ||
    combined.includes('AX T2') || combined.includes('AX T1') || combined.includes('COR T1') || combined.includes('CO T2');

  if (isNeuroOrBrain) {
    if (combined.includes('ORBIT') || combined.includes('RTSG') || combined.includes('LT SG') || combined.includes('OPTIC')) {
      return `MRI Brain & Orbits${hasContrast ? ' with Contrast' : ''}`;
    }
    if (hasContrast) {
      return normMod === 'CT' ? 'CT Brain / Head with Contrast' : 'MRI Brain with Contrast';
    }
    return normMod === 'CT' ? 'CT Brain / Head' : 'MRI Brain';
  }

  // 4. CT Specific Modality Fallback
  if (normMod === 'CT') {
    if (combined.includes('CHEST') || combined.includes('THORAX')) return 'CT Chest';
    if (combined.includes('ABDOMEN')) return 'CT Abdomen / Pelvis';
    if (combined.includes('HEAD') || combined.includes('BRAIN')) return 'CT Brain / Head';
    return 'CT Scan';
  }

  if (combined.includes('SG T1') || combined.includes('SG T2')) return 'MRI Spine';
  return `${normMod} Study`;
}

export async function syncS3BucketToDatabase(): Promise<S3SyncResult> {
  const creds = getEffectiveS3Credentials();
  if (!creds.enabled || !creds.bucket) {
    return { synced: 0, totalKeys: 0, studies: [] };
  }

  let continuationToken: string | undefined = undefined;
  const allKeys: string[] = [];
  let pageCount = 0;
  const maxPages = 20;

  try {
    do {
      if (++pageCount > maxPages) break;
      const queryParams: Record<string, string> = {
        'list-type': '2',
        prefix: 'dicom/',
      };
      if (continuationToken) queryParams['continuation-token'] = continuationToken;

      const listUrl = buildS3Url(creds, '', queryParams);
      let headers: Record<string, string> = {};
      if (creds.accessKeyId && creds.secretAccessKey) {
        headers = getSigV4Headers('GET', listUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
      }

      const res = await s3HttpGet(listUrl, headers, 10000);
      if (!res.ok) break;

      const xml = await res.text();
      const keyMatches = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)];
      for (const m of keyMatches) {
        const k = m[1];
        if (!k.endsWith('/')) allKeys.push(k);
      }

      const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
      continuationToken = tokenMatch ? tokenMatch[1] : undefined;
    } while (continuationToken);
  } catch (err) {
    console.warn('[S3_CATALOG_SYNC_CRAWL_ERR]', err);
    return { synced: 0, totalKeys: 0, studies: [] };
  }

  interface S3GroupEntry {
    accession: string;
    patientName: string;
    modality: string;
    studyDate: string;
    studyTime: string;
    studyUid: string;
    keyPrefix: string;
    seriesSet: Set<string>;
    instances: number;
  }

  const studyGroups = new Map<string, S3GroupEntry>();

  for (const k of allKeys) {
    const parts = k.split('/');
    if (parts[0] !== 'dicom' || parts.length < 5) continue;

    const y = parts[1];
    const m = parts[2];
    const mod = parts[3].toUpperCase();
    const folder = parts[4];

    const groupKey = `${mod}::${folder}`;
    let group = studyGroups.get(groupKey);

    if (!group) {
      const sub = folder.split('_');
      const acc = sub[0];
      const uid = sub.length >= 3 ? sub[sub.length - 1] : '';
      const name = sub.length > 2
        ? sub.slice(1, -1).join(' ').replace(/-/g, ' ')
        : (sub[1] || 'PATIENT').replace(/-/g, ' ');

      let studyDate = `${y}${m}01`;
      let studyTime = '';
      const uidDateMatch = uid.match(/(202\d[01]\d[0-3]\d)([0-2]\d[0-5]\d[0-5]\d)/);
      if (uidDateMatch) {
        studyDate = uidDateMatch[1];
        studyTime = uidDateMatch[2];
      }

      group = {
        accession: acc,
        patientName: name.trim() || 'PATIENT',
        modality: mod,
        studyDate,
        studyTime,
        studyUid: uid,
        keyPrefix: `dicom/${y}/${m}/${mod}/${folder}/`,
        seriesSet: new Set<string>(),
        instances: 0,
      };
      studyGroups.set(groupKey, group);
    }

    if (!group) continue;

    if (k.endsWith('.dcm')) {
      group.instances++;
    }

    for (const part of parts) {
      if (part.startsWith('series-')) {
        group.seriesSet.add(part);
        break;
      }
    }
  }

  const toIngest: Array<Partial<HospitalPacsStudy>> = [];
  const resultStudies: S3SyncResult['studies'] = [];

  for (const group of studyGroups.values()) {
    if (!group.accession) continue;
    const clinicalDesc = deriveClinicalStudyDescription(group.modality, group.seriesSet);
    toIngest.push({
      accessionNumber: group.accession,
      patientName: group.patientName,
      patientId: group.accession,
      patientMrn: group.accession,
      modality: group.modality,
      studyDescription: clinicalDesc,
      studyDate: group.studyDate,
      studyTime: group.studyTime || '',
      studyInstanceUid: group.studyUid,
      numSeries: Math.max(1, group.seriesSet.size),
      numInstances: Math.max(1, group.instances),
      pacsSource: 'S3_CLOUD',
      s3Status: 'synced',
      s3KeyPrefix: group.keyPrefix,
      s3UploadedAt: new Date(),
    });
    resultStudies.push({
      accession: group.accession,
      patientName: group.patientName,
      modality: group.modality,
      instances: group.instances,
    });
  }

  if (toIngest.length > 0) {
    await indexHospitalPacsStudies(toIngest);
  }

  return {
    synced: toIngest.length,
    totalKeys: allKeys.length,
    studies: resultStudies,
  };
}
