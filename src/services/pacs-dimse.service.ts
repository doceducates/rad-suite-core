// Layer 2 (Domain/Services): PACS DIMSE Native Service
// Executes DICOM C-ECHO, C-FIND, and C-GET against PACS servers
import path from 'path';
import { spawn } from 'child_process';
import { getDefaultPacsServer } from './pacs-server.service';
import { testPacsTcpConnection } from './pacs-network.service';
import type { PacsServer, PacsQueryFilter, PacsStudyResult } from '@/types/pacs';

const BRIDGE_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'pacs_bridge.py');

interface BridgeResponse<T = any> {
  success: boolean;
  error?: string;
  count?: number;
  studies?: T[];
  instancesRetrieved?: number;
  folderPath?: string;
  latencyMs?: number;
}

async function runBridgeCommand<T = any>(
  command: 'cfind' | 'cget' | 'cecho',
  payload: Record<string, any>,
  timeoutMs = 12000
): Promise<BridgeResponse<T>> {
  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let isSettled = false;

    const proc = spawn('python', [BRIDGE_SCRIPT_PATH, command, JSON.stringify(payload)], {
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          proc.kill();
        } catch {}
        resolve({ success: false, error: `PACS DIMSE ${command} timed out after ${timeoutMs}ms` });
      }
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('close', (code) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (code !== 0 && !stdoutData) {
        return resolve({
          success: false,
          error: stderrData || `Bridge exited with code ${code}`,
        });
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        resolve({
          success: false,
          error: `Failed to parse PACS response: ${stdoutData || stderrData || (err as Error).message}`,
        });
      }
    });

    proc.on('error', (err) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      resolve({ success: false, error: `Failed to execute python bridge: ${err.message}` });
    });
  });
}

export async function queryPacsDimse(
  filter: PacsQueryFilter,
  serverOverride?: PacsServer
): Promise<PacsStudyResult[]> {
  const server = serverOverride || (await getDefaultPacsServer());

  // Fast failover if PACS network is disconnected (e.g. user at home)
  const probe = await testPacsTcpConnection(server.host, server.port, 600);
  if (!probe.reachable) {
    return [];
  }

  const payload = {
    host: server.host,
    port: server.port,
    aeTitle: server.aeTitle,
    callingAeTitle: server.callingAeTitle || 'RADIANT',
    modality: filter.modality,
    dateRange: filter.dateRange,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    patientName: filter.patientName || filter.query,
    patientId: filter.patientMrn,
    accessionNumber: filter.accessionNumber,
    limit: filter.limit || 150,
  };

  const res = await runBridgeCommand<PacsStudyResult>('cfind', payload, 10000);
  if (!res.success || !res.studies) {
    console.warn('[PACS_DIMSE_CFIND_WARN]', res.error);
    return [];
  }
  return res.studies;
}

export async function retrieveStudyDimse(
  studyInstanceUid: string,
  accessionNumber: string,
  patientName?: string,
  serverOverride?: PacsServer
): Promise<{ success: boolean; folderPath?: string; instancesRetrieved?: number; error?: string }> {
  const server = serverOverride || (await getDefaultPacsServer());

  const safeDirName = `${accessionNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}_${(patientName || 'PATIENT').trim().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const destinationFolder = path.join('E:', 'Cases', safeDirName);

  const payload = {
    host: server.host,
    port: server.port,
    aeTitle: server.aeTitle,
    callingAeTitle: server.callingAeTitle || 'RADIANT',
    studyInstanceUid,
    accessionNumber,
    destinationFolder,
  };

  const res = await runBridgeCommand('cget', payload, 60000);
  if (!res.success) {
    return {
      success: false,
      error: res.error || 'Failed to retrieve study via DICOM C-GET',
      instancesRetrieved: res.instancesRetrieved || 0,
    };
  }

  return {
    success: true,
    folderPath: res.folderPath || destinationFolder,
    instancesRetrieved: res.instancesRetrieved || 0,
  };
}

export async function echoPacsDimse(
  serverOverride?: PacsServer
): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  const server = serverOverride || (await getDefaultPacsServer());

  const probe = await testPacsTcpConnection(server.host, server.port, 600);
  if (!probe.reachable) {
    return { success: false, error: probe.error || 'PACS host is offline or unreachable' };
  }

  const payload = {
    host: server.host,
    port: server.port,
    aeTitle: server.aeTitle,
    callingAeTitle: server.callingAeTitle || 'RADIANT',
  };

  const res = await runBridgeCommand('cecho', payload, 5000);
  return {
    success: Boolean(res.success),
    latencyMs: res.latencyMs,
    error: res.error,
  };
}
