/**
 * Layer 2: Clinic Gateway Client Adapter
 *
 * Connects Rad Suite to the standalone Clinic Gateway microservice (config.clinicGatewayUrl).
 * Provides graceful fallback: if the gateway is offline or not configured, callers continue
 * using embedded Rad Suite telemetry.
 */

import { config } from '@/lib/config';
import type { ClinicNodeTelemetry } from './clinic-node.types';
import { fetchWithCoalescing, clearGatewayClientCache } from './clinic-gateway-cache';

export { clearGatewayClientCache };
export {
  executeGatewayCommand,
  fetchGatewayCommandLogs,
  fetchGatewayLastCommand,
  type ClinicCommandLog,
} from './clinic-gateway-commands';

export function isClinicGatewayConfigured(): boolean {
  return Boolean(config.clinicGatewayUrl && config.clinicGatewayUrl.trim().length > 0);
}

export async function fetchGatewayNodes(nodeId?: string): Promise<{
  telemetry: ClinicNodeTelemetry | null;
  nodes: ClinicNodeTelemetry[];
} | null> {
  if (!isClinicGatewayConfigured()) return null;

  const result = await fetchWithCoalescing<{ nodes: ClinicNodeTelemetry[] }>(
    'gateway:nodes',
    3000,
    async (cachedEtag) => {
      const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
      const apiKey = config.clinicGatewayApiKey;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      };
      if (cachedEtag) {
        headers['If-None-Match'] = cachedEtag;
      }

      try {
        const res = await fetch(`${baseUrl}/api/v1/nodes`, {
          headers,
          signal: AbortSignal.timeout(3000),
        });

        if (res.status === 304) {
          return { data: { nodes: [] }, notModified: true, etag: cachedEtag };
        }

        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.nodes)) return null;

        const etag = typeof res.headers?.get === 'function' ? (res.headers.get('etag') || undefined) : undefined;
        return { data: { nodes: data.nodes }, etag };
      } catch {
        return null;
      }
    }
  );

  if (!result || !Array.isArray(result.nodes)) return null;

  const nodes = result.nodes;
  let telemetry: ClinicNodeTelemetry | null = null;

  if (nodeId) {
    telemetry = nodes.find((n) => n.nodeId === nodeId) || null;
  }
  if (!telemetry && nodes.length > 0) {
    telemetry = nodes[0];
  }

  return { telemetry, nodes };
}

export async function dispatchGatewayAction(
  nodeId: string,
  action: string,
  payload?: any
): Promise<{ success: boolean; message: string } | null> {
  if (!isClinicGatewayConfigured()) return null;

  const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
  const apiKey = config.clinicGatewayApiKey;

  try {
    const res = await fetch(`${baseUrl}/api/v1/nodes/${encodeURIComponent(nodeId)}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ action, payload }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success) {
      clearGatewayClientCache('gateway:nodes');
      return {
        success: true,
        message: data.message || `Action '${action}' dispatched via Clinic Gateway`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function forwardHeartbeatToGateway(
  payload: any,
  token: string
): Promise<any | null> {
  if (!isClinicGatewayConfigured()) return null;

  const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');

  try {
    const res = await fetch(`${baseUrl}/api/v1/edge/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-clinic-token': token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export interface GatewayStudyFilter {
  accession?: string;
  modality?: string;
  patientName?: string;
  mrn?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function queryGatewayStudies(
  filters: GatewayStudyFilter
): Promise<{ success: boolean; total: number; studies: any[] } | null> {
  const p = new URLSearchParams();
  if (filters.accession) p.set('accession', filters.accession);
  if (filters.modality && filters.modality !== 'all') p.set('modality', filters.modality);
  if (filters.patientName) p.set('name', filters.patientName);
  if (filters.mrn) p.set('mrn', filters.mrn);
  if (filters.startDate) p.set('from', filters.startDate);
  if (filters.endDate) p.set('to', filters.endDate);
  if (filters.limit) p.set('limit', String(filters.limit));
  if (filters.offset) p.set('offset', String(filters.offset));

  const queryStr = p.toString();
  const cacheKey = `gateway:studies:${queryStr}`;

  // 1. If remote/configured gateway URL is present, query it via HTTP with caching and coalescing
  if (isClinicGatewayConfigured()) {
    const remoteResult = await fetchWithCoalescing<{ total: number; studies: any[] }>(
      cacheKey,
      10000,
      async (cachedEtag) => {
        const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
        const apiKey = config.clinicGatewayApiKey;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        };
        if (cachedEtag) {
          headers['If-None-Match'] = cachedEtag;
        }

        try {
          const res = await fetch(`${baseUrl}/api/v1/studies?${queryStr}`, {
            headers,
            signal: AbortSignal.timeout(4000),
          });

          if (res.status === 304) {
            return { data: { total: 0, studies: [] }, notModified: true, etag: cachedEtag };
          }

          if (res.ok) {
            const data = await res.json();
            if (data?.success && Array.isArray(data.studies)) {
              const etag = typeof res.headers?.get === 'function' ? (res.headers.get('etag') || undefined) : undefined;
              return { data: { total: data.total || data.studies.length, studies: data.studies }, etag };
            }
          }
          return null;
        } catch {
          return null;
        }
      }
    );

    if (remoteResult && Array.isArray(remoteResult.studies)) {
      return { success: true, total: remoteResult.total, studies: remoteResult.studies };
    }
  }

  // 2. In local workstation development / offline fallback:
  // Directly check clinic-gateway SQLite database if it exists on disk
  try {
    const fs = await import('fs');
    const path = await import('path');
    const gwDbPath = path.join(process.cwd(), '..', 'clinic-gateway', 'data', 'clinic-gateway.db');
    if (fs.existsSync(gwDbPath)) {
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(gwDbPath, { readonly: true });
      let sql = 'SELECT * FROM studies WHERE 1=1';
      const params: any[] = [];
      if (filters.accession) {
        sql += ' AND lower(accession_number) = lower(?)';
        params.push(filters.accession.trim());
      }
      if (filters.patientName) {
        sql += ' AND lower(patient_name) LIKE lower(?)';
        params.push(`%${filters.patientName.trim()}%`);
      }
      if (filters.mrn) {
        sql += ' AND lower(patient_mrn) LIKE lower(?)';
        params.push(`%${filters.mrn.trim()}%`);
      }
      if (filters.modality && filters.modality !== 'all') {
        sql += ' AND modality = ?';
        params.push(filters.modality.toUpperCase().trim());
      }
      sql += ' ORDER BY study_date DESC, study_time DESC';
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }
      const rows = db.prepare(sql).all(...params);
      db.close();
      return { success: true, total: rows.length, studies: rows };
    }
  } catch {
    // Ignore fallback errors
  }

  return null;
}

export { fetchGatewayStudySeries, type GatewayStudySeries } from './gateway-study-series.service';
