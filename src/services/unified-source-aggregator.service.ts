import type { PacsQueryFilter, PacsStudyResult, StorageSourceType, StorageSourceConfig } from '@/types/pacs';
import { getInternalStorageCredentials } from './storage-config.service';
import { queryUnifiedCases } from './unified-case.service';
import { queryPacsDimse } from './pacs-dimse.service';
import { queryGoogleDriveStudies } from './gdrive-case.service';
import { queryS3Studies } from './s3-case.service';
import { getClinicNodeStatus } from './clinic-node.service';
import { deduplicatePacsStudies } from './pacs-deduplication.service';
import { matchesModality } from '@/lib/modality-inference';
import { matchesDate } from './unified-case-filters';
import { rbacService } from './rbac.service';
import { getUserById, getCurrentUser } from './auth.service';

export function getActiveStorageSources(): StorageSourceConfig[] {
  const creds = getInternalStorageCredentials();
  const clinicNode = getClinicNodeStatus();
  return [
    {
      source: 'local_archive',
      name: 'Local Disk (E:)',
      enabled: true,
      badgeColor: 'emerald',
      isOnline: true,
    },
    {
      source: 'hospital_pacs',
      name: 'Hospital PACS',
      enabled: creds.pacsEnabled,
      badgeColor: 'blue',
      isOnline: true, // Probed fast during DIMSE call
    },
    {
      source: 's3',
      name: 'S3 Cloud Storage',
      enabled: creds.s3.enabled,
      badgeColor: 'amber',
      isOnline: Boolean(creds.s3.enabled && creds.s3.bucket),
    },
    {
      source: 'gdrive',
      name: 'Google Drive',
      enabled: creds.gdrive.enabled,
      badgeColor: 'sky',
      isOnline: Boolean(creds.gdrive.enabled && creds.gdrive.folderId),
    },
    {
      source: 'remote_node',
      name: 'Remote Clinic Node',
      enabled: true,
      badgeColor: 'purple',
      isOnline: clinicNode.online,
    },
  ];
}

export async function aggregateMultiSourceStudies(filter: PacsQueryFilter = {}): Promise<PacsStudyResult[]> {
  const creds = getInternalStorageCredentials();
  const requestedSource = filter.source || 'all';

  let requestingUser: any = null;
  if (filter.currentUserId) {
    requestingUser = await getUserById(filter.currentUserId).catch(() => null);
  }
  if (!requestingUser) {
    requestingUser = await getCurrentUser().catch(() => null);
  }

  const canAccessPacs = rbacService.canAccessStorageSource(requestingUser, 'pacs');
  const canAccessS3 = rbacService.canAccessStorageSource(requestingUser, 's3');
  const canAccessRemoteNode = rbacService.canAccessStorageSource(requestingUser, 'remote_node');

  const shouldQueryLocal = requestedSource === 'all' || requestedSource === 'local' || requestedSource === 'local_archive' || requestedSource === 'worklist';
  const shouldQueryPacs = (requestedSource === 'all' || requestedSource === 'pacs' || requestedSource === 'hospital_pacs') && creds.pacsEnabled && canAccessPacs;
  const shouldQueryGdrive = (requestedSource === 'all' || requestedSource === 'gdrive');
  const shouldQueryS3 = (requestedSource === 'all' || requestedSource === 's3') && creds.s3.enabled && canAccessS3;
  const shouldQueryRemoteNode = (requestedSource === 'all' || requestedSource === 'remote_node') && canAccessRemoteNode;

  const tasks: Promise<{ source: StorageSourceType; studies: PacsStudyResult[] }>[] = [];

  if (shouldQueryLocal) {
    tasks.push(
      queryUnifiedCases(filter)
        .then((res) => ({
          source: 'local_archive' as StorageSourceType,
          studies:
            requestedSource === 'worklist'
              ? res
              : res.filter((s) => Boolean(s.hasImages || (s.numInstances && s.numInstances > 0 && (s.folderPath || s.isDownloaded)))),
        }))
        .catch(() => ({ source: 'local_archive' as StorageSourceType, studies: [] }))
    );
  }

  if (shouldQueryPacs && process.env.NODE_ENV !== 'test') {
    tasks.push(
      queryPacsDimse(filter)
        .then((res) => ({ source: 'hospital_pacs' as StorageSourceType, studies: res }))
        .catch(() => ({ source: 'hospital_pacs' as StorageSourceType, studies: [] }))
    );
  }

  if (shouldQueryGdrive && process.env.NODE_ENV !== 'test') {
    tasks.push(
      queryGoogleDriveStudies(filter)
        .then((res) => ({ source: 'gdrive' as StorageSourceType, studies: res }))
        .catch(() => ({ source: 'gdrive' as StorageSourceType, studies: [] }))
    );
  }

  if (shouldQueryS3 && process.env.NODE_ENV !== 'test') {
    tasks.push(
      queryS3Studies(filter)
        .then((res) => ({ source: 's3' as StorageSourceType, studies: res }))
        .catch(() => ({ source: 's3' as StorageSourceType, studies: [] }))
    );
  }

  if (shouldQueryRemoteNode) {
    try {
      const nodeStatus = getClinicNodeStatus();
      const nodeStudies: PacsStudyResult[] = [];
      if (nodeStatus.syncedStudies && nodeStatus.syncedStudies.length > 0) {
        for (const s of nodeStatus.syncedStudies) {
          nodeStudies.push({
            accessionNumber: s.accession,
            patientName: s.patientName || 'PATIENT',
            patientMrn: s.patientId || s.accession,
            patientId: s.patientId,
            age: 0,
            gender: 'Other',
            modality: s.modality || 'MR',
            studyDescription: `Clinic PC Synced (${s.status})`,
            studyDate: s.studyDate || new Date().toISOString().split('T')[0],
            studyTime: s.time || '',
            numSeries: 1,
            numInstances: (s as any).sliceCount || 1,
            pacsServerAe: 'CLINIC_EDGE',
            studyInstanceUid: (s as any).studyUid || `1.2.840.${s.accession}`,
            source: 'remote_node',
            availableSources: ['remote_node'],
            isDownloaded: false,
            status: s.status === 'synced' ? 'awaiting_report' : 'scheduled',
          });
        }
      }

      const q = filter.query ? filter.query.trim().toLowerCase() : undefined;
      const acc = filter.accessionNumber ? filter.accessionNumber.trim().toUpperCase() : undefined;
      const mod = filter.modality && filter.modality !== 'all' ? filter.modality.toUpperCase() : undefined;

      const filtered = nodeStudies.filter((st) => {
        if (mod && !matchesModality(st.modality, mod)) return false;
        if (acc && !st.accessionNumber.toUpperCase().includes(acc)) return false;
        if (!matchesDate(st.studyDate, filter)) return false;
        if (q) {
          return (
            st.accessionNumber.toLowerCase().includes(q) ||
            st.patientName.toLowerCase().includes(q) ||
            st.studyDescription.toLowerCase().includes(q)
          );
        }
        return true;
      });

      tasks.push(Promise.resolve({ source: 'remote_node' as StorageSourceType, studies: filtered }));
    } catch {
      tasks.push(Promise.resolve({ source: 'remote_node' as StorageSourceType, studies: [] }));
    }
  }

  const settled = await Promise.allSettled(tasks);
  const studyMap = new Map<string, PacsStudyResult>();

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      const { source, studies } = item.value;
      for (const study of studies) {
        const key = study.accessionNumber.trim().toUpperCase();
        const existing = studyMap.get(key);

        if (!existing) {
          studyMap.set(key, {
            ...study,
            source: source === 'local_archive' ? 'local_archive' : source,
            availableSources: [source],
            isDownloaded: source === 'local_archive',
          });
        } else {
          // If already in map, add this source to availableSources
          const sources = new Set(existing.availableSources || [existing.source as StorageSourceType]);
          sources.add(source);
          existing.availableSources = Array.from(sources);

          // If found in local_archive, mark as local and downloaded
          if (source === 'local_archive') {
            existing.source = 'local_archive';
            existing.isDownloaded = true;
            if (study.localCaseId) existing.localCaseId = study.localCaseId;
            if (study.folderPath) existing.folderPath = study.folderPath;
          }
        }
      }
    }
  }

  const results = Array.from(studyMap.values());
  return deduplicatePacsStudies(results);
}
