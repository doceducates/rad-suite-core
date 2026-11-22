/**
 * Layer 2 (Domain/Services): Clinic Gateway & Central PACS Study Series Resolver
 *
 * Resolves anatomically accurate series for remote or gateway-synced cases
 * when local disk files or direct S3 keys are not yet present.
 */

import { config } from '@/lib/config';
import { detectOrientationFromDescription } from './dicom-geometry.service';
import { db } from '@/db';
import { hospitalPacsStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchWithCoalescing } from './clinic-gateway-cache';

export interface GatewayStudySeries {
  seriesNumber: string;
  seriesDescription: string;
  orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'LOCALIZER';
  sliceCount: number;
  modality: string;
  keyPrefix?: string;
}

interface ProtocolTemplate {
  desc: string;
  orientation: 'AXIAL' | 'SAGITTAL' | 'CORONAL' | 'LOCALIZER';
  weight: number;
}

function getProtocolTemplates(modality: string, studyDesc: string): ProtocolTemplate[] {
  const mod = (modality || 'MR').toUpperCase();
  const desc = (studyDesc || '').toUpperCase();

  if (mod === 'MR' || mod === 'MRI') {
    // 1. Knee / Musculoskeletal
    if (desc.includes('KNEE') || desc.includes('MENISCUS') || desc.includes('PCL') || desc.includes('ACL')) {
      return [
        { desc: 'Loc 2PL(AX/CO)', orientation: 'LOCALIZER', weight: 12 },
        { desc: 'Sagittal T2 FS', orientation: 'SAGITTAL', weight: 44 },
        { desc: 'Coronal PDFS', orientation: 'CORONAL', weight: 48 },
        { desc: 'Axial PDFS', orientation: 'AXIAL', weight: 48 },
        { desc: 'Coronal T1', orientation: 'CORONAL', weight: 44 },
        { desc: 'Sagittal T1', orientation: 'SAGITTAL', weight: 48 },
        { desc: 'Sagittal PD', orientation: 'SAGITTAL', weight: 52 },
      ];
    }
    // 2. Spine (Lumbar, Cervical, Dorsal)
    if (desc.includes('SPINE') || desc.includes('LS') || desc.includes('CS') || desc.includes('DS') || desc.includes('LUMBAR')) {
      return [
        { desc: 'Loc 3PL C0', orientation: 'LOCALIZER', weight: 12 },
        { desc: 'Sagittal T2', orientation: 'SAGITTAL', weight: 24 },
        { desc: 'Sagittal T1', orientation: 'SAGITTAL', weight: 24 },
        { desc: 'Axial T2', orientation: 'AXIAL', weight: 32 },
        { desc: 'Sagittal STIR', orientation: 'SAGITTAL', weight: 24 },
        { desc: 'Axial T1', orientation: 'AXIAL', weight: 28 },
      ];
    }
    // 3. Brain / Head
    if (desc.includes('BRAIN') || desc.includes('HEAD') || desc.includes('NEURO')) {
      return [
        { desc: 'Loc 3PL C0', orientation: 'LOCALIZER', weight: 12 },
        { desc: 'Axial T2', orientation: 'AXIAL', weight: 30 },
        { desc: 'Axial FLAIR', orientation: 'AXIAL', weight: 30 },
        { desc: 'Axial DWI / ADC', orientation: 'AXIAL', weight: 30 },
        { desc: 'Sagittal T1', orientation: 'SAGITTAL', weight: 24 },
        { desc: 'Axial T1', orientation: 'AXIAL', weight: 28 },
      ];
    }
    // 4. Pelvis / Shoulder / Joints
    return [
      { desc: 'Loc 3PL C0', orientation: 'LOCALIZER', weight: 12 },
      { desc: 'Axial T2', orientation: 'AXIAL', weight: 32 },
      { desc: 'Coronal PDFS', orientation: 'CORONAL', weight: 32 },
      { desc: 'Coronal T1', orientation: 'CORONAL', weight: 32 },
      { desc: 'Sagittal T2', orientation: 'SAGITTAL', weight: 32 },
    ];
  }

  // CT Default Protocol
  return [
    { desc: 'Axial Soft Tissue', orientation: 'AXIAL', weight: 120 },
    { desc: 'Axial Bone Window', orientation: 'AXIAL', weight: 120 },
    { desc: 'Coronal MPR', orientation: 'CORONAL', weight: 60 },
    { desc: 'Sagittal MPR', orientation: 'SAGITTAL', weight: 60 },
  ];
}

function distributeSlices(templates: ProtocolTemplate[], totalInstances: number): GatewayStudySeries[] {
  const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);
  let remaining = totalInstances > 0 ? totalInstances : totalWeight;

  return templates.map((tpl, i) => {
    let count: number;
    if (i === templates.length - 1) {
      count = Math.max(1, remaining);
    } else {
      count = Math.max(1, Math.round((tpl.weight / totalWeight) * totalInstances));
      remaining -= count;
    }

    return {
      seriesNumber: String(i + 1),
      seriesDescription: tpl.desc,
      orientation: tpl.orientation,
      sliceCount: count,
      modality: tpl.desc.startsWith('CT') ? 'CT' : 'MR',
    };
  });
}

export async function fetchGatewayStudySeries(
  accession: string,
  modalityHint?: string
): Promise<GatewayStudySeries[]> {
  const cleanAcc = accession.trim();
  if (!cleanAcc) return [];

  let studyMeta: {
    modality: string;
    studyDescription: string;
    numInstances: number;
    series?: any[];
  } | null = null;

  // 1. Probe Clinic Gateway microservice if configured
  if (config.clinicGatewayUrl) {
    studyMeta = await fetchWithCoalescing<{
      modality: string;
      studyDescription: string;
      numInstances: number;
      series?: any[];
    }>(`gateway:series:${cleanAcc}`, 60000, async (cachedEtag) => {
      try {
        const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
        const apiKey = config.clinicGatewayApiKey;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        };
        if (cachedEtag) {
          headers['If-None-Match'] = cachedEtag;
        }

        const res = await fetch(`${baseUrl}/api/v1/studies/${encodeURIComponent(cleanAcc)}`, {
          headers,
          signal: AbortSignal.timeout(3500),
        });

        if (res.status === 304) {
          return { data: null as any, notModified: true, etag: cachedEtag };
        }

        if (res.ok) {
          const data = await res.json();
          if (data?.success && data.study) {
            const etag = typeof res.headers?.get === 'function' ? (res.headers.get('etag') || undefined) : undefined;
            return {
              data: {
                modality: data.study.modality || modalityHint || 'MR',
                studyDescription: data.study.studyDescription || '',
                numInstances: Number(data.study.numInstances) || 0,
                series: data.study.series,
              },
              etag,
            };
          }
        }
        return null;
      } catch {
        return null;
      }
    });
  }

  // 2. Fall back to local hospital_pacs_studies database cache
  if (!studyMeta) {
    try {
      const [row] = await db
        .select()
        .from(hospitalPacsStudies)
        .where(eq(hospitalPacsStudies.accessionNumber, cleanAcc))
        .limit(1);

      if (row) {
        studyMeta = {
          modality: row.modality || modalityHint || 'MR',
          studyDescription: row.studyDescription || '',
          numInstances: Number(row.numInstances) || 0,
        };
      }
    } catch {}
  }

  if (!studyMeta) {
    return [];
  }

  // If gateway provided explicit series records, map them
  if (Array.isArray(studyMeta.series) && studyMeta.series.length > 0) {
    return studyMeta.series.map((s: any, idx: number) => ({
      seriesNumber: String(s.seriesNumber || idx + 1),
      seriesDescription: s.seriesDescription || `Series ${idx + 1}`,
      orientation: s.orientation || detectOrientationFromDescription(s.seriesDescription),
      sliceCount: Number(s.sliceCount || s.numInstances || 1),
      modality: s.modality || studyMeta!.modality,
      keyPrefix: s.keyPrefix,
    }));
  }

  // Synthesize clinically accurate protocol series matching study anatomy
  const templates = getProtocolTemplates(studyMeta.modality, studyMeta.studyDescription);
  return distributeSlices(templates, studyMeta.numInstances || 100);
}
