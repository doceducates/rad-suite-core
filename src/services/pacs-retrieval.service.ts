// Layer 2 (Domain/Services): Multi-Source Unified Study Retrieval Service
import path from 'path';
import { getDefaultPacsServer } from './pacs-server.service';
import { testPacsTcpConnection } from './pacs-network.service';
import { retrieveStudyDimse } from './pacs-dimse.service';
import { downloadStudyFromGoogleDrive } from './gdrive-case.service';
import { downloadStudyFromS3 } from './s3-case.service';
import { getInternalStorageCredentials } from './storage-config.service';
import { getLocalCases } from './local-cases.service';
import { logAudit } from './audit.service';
import type { StorageSourceType } from '@/types/pacs';

export interface PacsRetrievalResult {
  success: boolean;
  reachable: boolean;
  serverName: string;
  protocol: 'C-GET' | 'C-MOVE' | 'GDRIVE_REST' | 'S3_REST';
  instancesRetrieved?: number;
  folderPath?: string;
  message?: string;
  error?: string;
}

export async function retrieveStudyFromSource(
  accessionNumber: string,
  studyInstanceUid?: string,
  patientName?: string,
  source: StorageSourceType = 'hospital_pacs'
): Promise<PacsRetrievalResult> {
  const creds = getInternalStorageCredentials();
  const folderName = `${accessionNumber}_${(patientName || 'PATIENT').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const targetDir = path.join(creds.localPath, folderName);

  // 0. Local Archive (already present)
  if (source === 'local_archive') {
    return {
      success: true,
      reachable: true,
      serverName: 'Local Disk (E:)',
      protocol: 'LOCAL_DISK' as any,
      message: `Study ${accessionNumber} is already stored locally on disk.`,
    };
  }

  // 0.1 Remote Clinic Edge Node Retrieval Dispatch
  if (source === 'remote_node') {
    try {
      const { dispatchClinicAction } = await import('./clinic-node.service');
      await dispatchClinicAction(
        'fetch-accession',
        { id: 'system', name: 'Workstation Standby' },
        { accessionNumber }
      );
      return {
        success: true,
        reachable: true,
        serverName: 'Clinic Edge Node',
        protocol: 'REMOTE_ACTION' as any,
        message: `Dispatched fetch request for accession ${accessionNumber} to clinic edge daemon.`,
      };
    } catch (e: any) {
      return {
        success: false,
        reachable: false,
        serverName: 'Clinic Edge Node',
        protocol: 'REMOTE_ACTION' as any,
        error: e?.message || 'Failed to dispatch remote accession pull',
      };
    }
  }

  // 1. Google Drive Retrieval
  if (source === 'gdrive') {
    const res = await downloadStudyFromGoogleDrive(accessionNumber, targetDir);
    if (res.success && res.filesDownloaded > 0) {
      getLocalCases(true);
      return {
        success: true,
        reachable: true,
        serverName: 'Google Drive Cloud',
        protocol: 'GDRIVE_REST',
        instancesRetrieved: res.filesDownloaded,
        folderPath: targetDir,
        message: `Downloaded ${res.filesDownloaded} instances from Google Drive into ${targetDir}`,
      };
    }
    return {
      success: false,
      reachable: true,
      serverName: 'Google Drive Cloud',
      protocol: 'GDRIVE_REST',
      error: 'Failed to retrieve study files from Google Drive folder',
    };
  }

  // 2. S3 Storage Retrieval
  if (source === 's3') {
    const res = await downloadStudyFromS3(accessionNumber, targetDir);
    if (res.success && res.filesDownloaded > 0) {
      getLocalCases(true);
      return {
        success: true,
        reachable: true,
        serverName: 'S3 Storage Bucket',
        protocol: 'S3_REST',
        instancesRetrieved: res.filesDownloaded,
        folderPath: targetDir,
        message: `Downloaded ${res.filesDownloaded} instances from S3 into ${targetDir}`,
      };
    }
    return {
      success: false,
      reachable: true,
      serverName: 'S3 Storage Bucket',
      protocol: 'S3_REST',
      error: 'Failed to retrieve study objects from S3 storage bucket',
    };
  }

  // 3. Hospital PACS Retrieval via DIMSE C-GET
  const server = await getDefaultPacsServer();
  const protocol = server.retrieveProtocol || 'C-GET';

  const probe = await testPacsTcpConnection(server.host, server.port, 2000);
  if (!probe.reachable) {
    return {
      success: false,
      reachable: false,
      serverName: server.name,
      protocol,
      error: 'PACS server is offline or unreachable. Operating in standalone diagnostic mode.',
    };
  }

  try {
    await logAudit({
      userId: 'system',
      userName: 'PACS Worker',
      action: protocol === 'C-GET' ? 'DICOM_C_GET_RETRIEVE' : 'DICOM_C_MOVE_RETRIEVE',
      entityType: 'Study',
      entityId: accessionNumber,
      details: `Initiated ${protocol} study retrieval for accession ${accessionNumber} from ${server.name}`,
    });

    if (studyInstanceUid) {
      const dimseRes = await retrieveStudyDimse(studyInstanceUid, accessionNumber, patientName, server);
      if (dimseRes.success) {
        getLocalCases(true);
        return {
          success: true,
          reachable: true,
          serverName: server.name,
          protocol,
          instancesRetrieved: dimseRes.instancesRetrieved,
          folderPath: dimseRes.folderPath,
          message: `Successfully retrieved ${dimseRes.instancesRetrieved} instances for study ${accessionNumber}.`,
        };
      }
      return {
        success: false,
        reachable: true,
        serverName: server.name,
        protocol,
        error: dimseRes.error || 'DIMSE C-GET retrieval failed',
      };
    }

    return {
      success: true,
      reachable: true,
      serverName: server.name,
      protocol,
      instancesRetrieved: 0,
      message: `Connected to ${server.name}. Ready for retrieval.`,
    };
  } catch (err: any) {
    return {
      success: false,
      reachable: true,
      serverName: server.name,
      protocol,
      error: `PACS retrieval protocol error: ${err.message || 'Association aborted'}`,
    };
  }
}

// Backward compatible alias
export const retrieveStudyFromPacs = retrieveStudyFromSource;
