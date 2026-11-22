/**
 * HMIS Local Gateway HTTP Client
 * Bridges Rad Suite with the local HMIS Gateway on port 3788.
 */

import {
  HmisInvestigationDetails,
  HmisPriorReport,
  HmisSubmitResultPayload,
  HmisPublishedReport,
  HmisWorklistFilters,
  HmisWorklistEnvelope,
  HmisTrackingListFilters,
  HmisTrackingListEnvelope,
  HmisAuthCredentials,
  HmisBatchResponse,
} from './hmis-models';

export type { HmisAuthCredentials, HmisBatchResponse };

import { config } from '@/lib/config';
import {
  resolveGatewayBaseUrl,
  invalidateGatewayCache,
  getHmisPluginInfo,
  type HmisPluginInfo,
} from './hmis-discovery.service';
import {
  getGatewayBase,
  getGatewayHeaders,
  parseGatewayJson,
  toQueryString,
} from './hmis-gateway-transport';

export { getGatewayHeaders };

export async function checkGatewayHealth(): Promise<{
  online: boolean;
  extensionConnected: boolean;
  safetyMode?: string;
  activeSessions?: number;
  plugin?: HmisPluginInfo;
}> {
  const plugin = getHmisPluginInfo();
  if (plugin.available && (!plugin.enabled || !plugin.authorized)) {
    return { online: false, extensionConnected: false, plugin };
  }

  try {
    const base = await resolveGatewayBaseUrl(getGatewayHeaders());
    if (!base) return { online: false, extensionConnected: false, plugin };
    const res = await fetch(`${base}/api/status`, {
      headers: getGatewayHeaders(),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      invalidateGatewayCache();
      return { online: false, extensionConnected: false, plugin };
    }
    const data = await res.json();
    return {
      online: true,
      extensionConnected: !!data.extensionConnected,
      safetyMode: data.safetyMode,
      activeSessions: data.activeSessions,
      plugin,
    };
  } catch {
    invalidateGatewayCache();
    return { online: false, extensionConnected: false, plugin };
  }
}

export async function searchHmisPatient(
  params: { mrn?: string; accession?: string; bypassCache?: boolean },
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/patient${toQueryString(params)}`, {
      headers: getGatewayHeaders(credentials),
      signal: AbortSignal.timeout(30000),
    });
    return await parseGatewayJson(res, 'Patient search failed');
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function trackHmisReport(
  params: {
    mrn?: string;
    accession?: string;
    startDate?: string;
    endDate?: string;
    bypassCache?: boolean;
  },
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/track${toQueryString(params)}`, {
      headers: getGatewayHeaders(credentials),
      signal: AbortSignal.timeout(25000),
    });
    return await parseGatewayJson(res, 'Report tracking failed');
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function fetchHmisTrackingList(
  filters?: HmisTrackingListFilters,
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  data?: HmisTrackingListEnvelope;
  error?: string;
}> {
  try {
    const isMultiPage = Boolean(filters?.fetchAllPages);
    const timeoutMs = isMultiPage ? 90000 : 45000;
    const res = await fetch(`${getGatewayBase()}/api/radiology/tracking-list${toQueryString(filters)}`, {
      headers: getGatewayHeaders(credentials),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return await parseGatewayJson<HmisTrackingListEnvelope>(res, 'Failed to fetch tracking list');
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function fetchHmisWorklist(
  filters?: HmisWorklistFilters,
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const isMultiPage = Boolean(filters?.fetchAllPages);
    const timeoutMs = isMultiPage ? 90000 : 75000;
    const res = await fetch(`${getGatewayBase()}/api/radiology/worklist${toQueryString(filters)}`, {
      headers: getGatewayHeaders(credentials),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return await parseGatewayJson(res, 'Failed to fetch worklist');
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function fetchActiveInvestigation(): Promise<{
  success: boolean;
  data?: HmisInvestigationDetails;
  error?: string;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/current-investigation`, {
      headers: getGatewayHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    return await parseGatewayJson<HmisInvestigationDetails>(res, 'Failed to fetch active investigation');
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function fetchPatientHistory(investigationId: string): Promise<{
  success: boolean;
  data?: HmisPriorReport[];
  error?: string;
}> {
  try {
    const res = await fetch(
      `${getGatewayBase()}/api/radiology/patient-history?investigationId=${encodeURIComponent(investigationId)}`,
      {
        headers: getGatewayHeaders(),
        signal: AbortSignal.timeout(12000),
      }
    );
    return await parseGatewayJson<HmisPriorReport[]>(res, 'Failed to fetch patient history');
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway unreachable (${err.message})` };
  }
}

export async function submitResultToGateway(
  payload: HmisSubmitResultPayload,
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  verified?: boolean;
  auditScreenshot?: string;
  diagnostics?: any;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/submit-result`, {
      method: 'POST',
      headers: getGatewayHeaders(credentials),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });
    const result = await res.json();
    if (!res.ok) return { success: false, error: result.error || 'Submission failed' };
    return {
      success: true,
      message: result.message || 'Result processed successfully',
      verified: !!result.data?.verified,
      auditScreenshot: result.data?.auditScreenshot,
      diagnostics: result.data,
    };
  } catch (err: any) {
    return { success: false, error: `Gateway dispatch failed (${err.message})` };
  }
}

export async function revertStudyInGateway(params: { mrn: string; accession?: string }): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/revert`, {
      method: 'POST',
      headers: getGatewayHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(90000),
    });
    const result = await res.json();
    if (!res.ok) return { success: false, error: result.error || 'Revert failed' };
    return { success: true, message: result.message || 'Study successfully reverted to blank state' };
  } catch (err: any) {
    return { success: false, error: `Gateway revert dispatch failed (${err.message})` };
  }
}

export async function executeGatewayAction(action: string, payload: Record<string, any> = {}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/action`, {
      method: 'POST',
      headers: getGatewayHeaders(),
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await res.json();
    return { success: res.ok, error: result.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitBatchToGateway(
  items: HmisSubmitResultPayload[],
  credentials?: HmisAuthCredentials,
  options: { sync?: boolean } = {}
): Promise<HmisBatchResponse> {
  try {
    const queryParam = options.sync ? '?sync=true' : '';
    const timeoutMs = options.sync ? Math.max(60000, items.length * 25000) : 15000;

    const res = await fetch(`${getGatewayBase()}/api/radiology/batch-draft${queryParam}`, {
      method: 'POST',
      headers: getGatewayHeaders(credentials),
      body: JSON.stringify({ items }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const result = await res.json();
    if (!res.ok) return { success: false, error: result.error || 'Batch submission failed' };
    return {
      success: true,
      jobId: result.data?.id || result.data?.jobId,
      total: result.data?.total,
      processed: result.data?.processed,
      successful: result.data?.successful,
      failed: result.data?.failed,
      status: result.data?.status,
      items: result.data?.items,
      message: result.message || 'Batch dispatched successfully',
    };
  } catch (err: any) {
    return { success: false, error: `Gateway batch dispatch failed (${err.message})` };
  }
}

export async function fetchBatchJobStatus(jobId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/batch/${encodeURIComponent(jobId)}`, {
      headers: getGatewayHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const result = await res.json();
    if (!res.ok) return { success: false, error: result.error || 'Failed to fetch batch job status' };
    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, error: `Batch status lookup failed (${err.message})` };
  }
}

export {
  fetchHmisPublishedReports,
  fetchHmisPublishedPdfStream,
} from './hmis-published-client.service';

