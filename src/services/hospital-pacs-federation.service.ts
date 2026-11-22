// Layer 2: Hospital PACS Federation & Edge Clinic Node Relay Service
import {
  queryIndexedHospitalPacs,
  indexHospitalPacsStudies,
  getLast48HoursDicomRange,
  type IndexedPacsQueryFilter,
} from './hospital-pacs-index.service';
import { getClinicNodeStatus, getAllClinicNodes, dispatchClinicAction } from './clinic-node.service';
import { inferModality, resolveClinicalDescription } from '@/lib/modality-inference';
import type { HospitalPacsStudy } from '@/db/schema';

function normalizeDicomDate(d?: string | null): string {
  if (!d) return '';
  return d.replace(/[^0-9]/g, '').slice(0, 8);
}

function resolveDicomDateFilter(preset?: string, from?: string, to?: string): string {
  const now = new Date();
  const format = (dt: Date) =>
    `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;

  if (preset === 'today') return format(now);
  if (preset === 'yesterday') return format(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  if (preset === '48h') return getLast48HoursDicomRange().startDicomDate;
  if (from) return normalizeDicomDate(from);
  return '';
}

export async function federateHospitalPacsQuery(
  filters: IndexedPacsQueryFilter = {}
): Promise<{ studies: HospitalPacsStudy[]; total: number }> {
  // If user lacks clinic node permissions, query local indexed SQLite directly
  const canAccessClinic =
    filters.isAdmin ||
    filters.allowedStorageSources === undefined ||
    Boolean(
      filters.allowedStorageSources?.includes('remote_node') ||
      filters.allowedStorageSources?.includes('*')
    );

  if (!canAccessClinic) {
    return queryIndexedHospitalPacs(filters);
  }

  let result: { studies: HospitalPacsStudy[]; total: number } = { studies: [], total: 0 };

  // 1. Check Clinic Gateway master study catalog and Clinic Node telemetry
  try {
    const candidateStudies: Array<Partial<HospitalPacsStudy>> = [];

    // 1a. Query Clinic Gateway Master Ledger
    try {
      const { queryGatewayStudies } = await import('./clinic-gateway-client');
      const isNumeric = filters.search && /^\d+$/.test(filters.search.trim());
      const targetStartDate = resolveDicomDateFilter(filters.datePreset, filters.customFrom, filters.customTo);
      const gwRes = await queryGatewayStudies({
        accession: filters.searchField === 'accession' || (filters.searchField === 'all' && isNumeric) ? filters.search : undefined,
        patientName: filters.searchField === 'name' || (filters.searchField === 'all' && !isNumeric) ? filters.search : undefined,
        mrn: filters.searchField === 'mrn' ? filters.search : undefined,
        modality: filters.modality,
        startDate: targetStartDate || undefined,
        endDate: filters.customTo,
      });

      if (gwRes && Array.isArray(gwRes.studies) && gwRes.studies.length > 0) {
        for (const s of gwRes.studies) {
          const acc = (s.accessionNumber || s.accession_number || '').trim();
          if (!acc) continue;
          const mappedStatus =
            s.s3Status === 'synced' ? 'synced' :
            s.s3Status === 'uploading' ? 'uploading' :
            s.pacsStatus === 'downloading' ? 'downloading' :
            s.pacsStatus === 'in_sandbox' ? 'in_sandbox' :
            (s.s3Status && s.s3Status !== 'unknown' ? s.s3Status : 'not_uploaded');

          const pName = (s.patientName || s.patient_name || 'PATIENT').trim();
          const pDesc = (s.studyDescription || s.study_description || '').trim();
          const studyTimeVal = s.studyTime || s.study_time || '';
          const mod = inferModality(s.modality, pDesc, pName, studyTimeVal);
          const resolvedDesc = resolveClinicalDescription(pDesc, null, null, null, mod, pName, studyTimeVal);

          candidateStudies.push({
            accessionNumber: acc,
            patientName: pName,
            patientId: s.patientMrn || s.patient_mrn || acc,
            patientMrn: s.patientMrn || s.patient_mrn || acc,
            modality: mod,
            studyDate: s.studyDate || s.study_date || '',
            studyTime: studyTimeVal,
            studyDescription: resolvedDesc,
            numSeries: s.numSeries || s.num_series || 1,
            numInstances: s.numInstances || s.num_instances || 1,
            pacsSource: s.originNodeId || s.origin_node_id || 'CLINIC_NODE',
            s3Status: mappedStatus,
            rawTagsJson: JSON.stringify({
              patientAge: s.patientAge || s.patient_age,
              patientDob: s.patientDob || s.patient_dob,
              patientSex: s.patientSex || s.patient_sex,
            }),
          });
        }
      }
    } catch (err) {
      console.warn('[FEDERATED_GATEWAY_FETCH_WARN]', err);
    }

    // 1b. Check all configured Clinic Nodes in memory / registry
    const allNodes = getAllClinicNodes();
    for (const node of allNodes) {
      if (node.localStudies && node.localStudies.length > 0) {
        for (const ls of node.localStudies) {
          if (!ls.accession) continue;
          const pName = (ls.patientName || 'PATIENT').trim();
          const pDesc = (ls.studyDescription || '').trim();
          const studyTimeVal = ls.studyTime || ls.time || '';
          const mod = inferModality(ls.modality, pDesc, pName, studyTimeVal);
          if (filters.modality && filters.modality !== 'all' && filters.modality !== '*' && mod !== filters.modality) {
            continue;
          }
          const resolvedDesc = resolveClinicalDescription(pDesc, null, null, null, mod, pName, studyTimeVal);

          candidateStudies.push({
            accessionNumber: ls.accession,
            patientName: pName,
            patientId: ls.patientId,
            patientMrn: ls.patientId,
            modality: mod,
            studyDate: ls.studyDate,
            studyTime: studyTimeVal,
            studyDescription: resolvedDesc,
            numInstances: ls.sliceCount && ls.sliceCount > 1 ? ls.sliceCount : undefined,
            numSeries: ls.seriesCount && ls.seriesCount > 1 ? ls.seriesCount : (ls.numSeries && ls.numSeries > 1 ? ls.numSeries : (Array.isArray(ls.seriesList) && ls.seriesList.length > 1 ? ls.seriesList.length : undefined)),
            s3Status: ls.isSyncedToS3 ? 'synced' : 'local_only',
            pacsSource: 'CLINIC_NODE',
            rawTagsJson: JSON.stringify({
              patientAge: ls.patientAge,
              patientSex: ls.patientSex,
              patientBirthDate: ls.patientBirthDate,
              seriesList: ls.seriesList,
            }),
          });
        }
      }

      if (node.syncedStudies && node.syncedStudies.length > 0) {
        for (const ss of node.syncedStudies) {
          if (!ss.accession) continue;
          const pName = (ss.patientName || 'PATIENT').trim();
          const pDesc = (ss.studyDescription || ss.description || '').trim();
          const studyTimeVal = ss.studyTime || (ss.time && !ss.time.includes('T') ? ss.time : undefined);
          const mod = inferModality(ss.modality, pDesc, pName, studyTimeVal);
          const resolvedDesc = resolveClinicalDescription(pDesc, null, null, null, mod, pName, studyTimeVal);

          candidateStudies.push({
            accessionNumber: ss.accession,
            patientName: pName,
            patientId: ss.patientId,
            patientMrn: ss.patientId,
            modality: mod,
            studyDate: ss.studyDate,
            studyTime: studyTimeVal,
            studyDescription: resolvedDesc,
            numInstances: ss.sliceCount && ss.sliceCount > 1 ? ss.sliceCount : (ss.numInstances && ss.numInstances > 1 ? ss.numInstances : 1),
            numSeries: ss.seriesCount && ss.seriesCount > 1 ? ss.seriesCount : (ss.numSeries && ss.numSeries > 1 ? ss.numSeries : (Array.isArray(ss.seriesList) && ss.seriesList.length > 1 ? ss.seriesList.length : undefined)),
            s3Status: ss.status === 'synced' ? 'synced' : 'pending',
            pacsSource: 'CLINIC_NODE',
            rawTagsJson: JSON.stringify({
              patientAge: ss.patientAge,
              patientSex: ss.patientSex,
              patientBirthDate: ss.patientBirthDate,
              seriesList: ss.seriesList,
            }),
          });
        }
      }
    }

    if (candidateStudies.length > 0) {
      await indexHospitalPacsStudies(candidateStudies);
    }

    // 2. Query indexed database with fresh federated telemetry
    result = await queryIndexedHospitalPacs(filters);
    if (result.total > 0) return result;

    // 3. If still empty and Clinic Node is online, request On-Demand C-FIND via Edge Node
    const activeNode = getClinicNodeStatus();
    if (activeNode?.online) {
      const q = filters.search ? filters.search.trim() : '';
      const isNumeric = q && /^\d+$/.test(q);
      const isAcc = filters.searchField === 'accession' || (filters.searchField === 'all' && isNumeric && q.length >= 10);
      const isMrn = filters.searchField === 'mrn' || (filters.searchField === 'all' && !isAcc && (isNumeric || q.startsWith('*')));
      const targetDate = resolveDicomDateFilter(filters.datePreset, filters.customFrom, filters.customTo);
      const searchPayload = {
        date: targetDate,
        modality: filters.modality && filters.modality !== 'all' ? filters.modality : 'MR',
        accession: isAcc ? q : undefined,
        patientId: isMrn ? q : undefined,
      };
      await dispatchClinicAction('harvest-pacs', { id: 'federation-svc', name: 'Federation Service' }, searchPayload);
    }
  } catch (err) {
    console.warn('[FEDERATED_CLINIC_NODE_FETCH_WARN]', err);
  }

  // 4. Fallback: Direct DIMSE C-FIND if direct LAN / VPN is reachable (not test)
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { queryPacsDimse } = await import('./pacs-dimse.service');
      const dimseFilter: any = {
        modality: filters.modality && filters.modality !== 'all' ? filters.modality : undefined,
        limit: 100,
      };

      if (filters.search) {
        if (filters.searchField === 'accession') dimseFilter.accessionNumber = filters.search;
        else if (filters.searchField === 'mrn') dimseFilter.patientMrn = filters.search;
        else dimseFilter.patientName = filters.search;
      }

      if (filters.datePreset === 'today') dimseFilter.dateRange = 'today';
      else if (filters.datePreset === 'yesterday') dimseFilter.dateRange = 'yesterday';
      else if (filters.datePreset === '7d') dimseFilter.dateRange = 'week';
      else if (filters.datePreset === '30d') dimseFilter.dateRange = 'month';
      else if (filters.datePreset === '48h') {
        const range = getLast48HoursDicomRange();
        dimseFilter.dateFrom = range.startDicomDate;
        dimseFilter.dateTo = range.endDicomDate;
      } else if (filters.datePreset === 'custom' && (filters.customFrom || filters.customTo)) {
        dimseFilter.dateFrom = normalizeDicomDate(filters.customFrom);
        dimseFilter.dateTo = normalizeDicomDate(filters.customTo);
      }

      const dimseStudies = await queryPacsDimse(dimseFilter);
      if (dimseStudies && dimseStudies.length > 0) {
        const toIndex = dimseStudies.map((s) => ({
          accessionNumber: s.accessionNumber,
          patientName: s.patientName,
          patientId: s.patientId,
          patientMrn: s.patientId,
          modality: s.modality,
          studyDate: s.studyDate,
          studyTime: s.studyTime,
          studyDescription: s.studyDescription,
          studyInstanceUid: s.studyInstanceUid,
          numInstances: s.numInstances || 1,
          numSeries: s.numSeries && s.numSeries > 1 ? s.numSeries : undefined,
          pacsSource: 'HMIS_PACS',
          s3Status: 'not_uploaded' as const,
        }));
        await indexHospitalPacsStudies(toIndex);
        result = await queryIndexedHospitalPacs(filters);
      }
    } catch (dimseErr) {
      console.warn('[FEDERATED_DIMSE_QUERY_WARN]', dimseErr);
    }
  }

  return result;
}
