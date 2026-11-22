/**
 * Layer 2 (Domain/Services): Clinic Gateway Remote Command Dispatch & Audit Logs
 */

import { config } from '@/lib/config';
import { isClinicGatewayConfigured } from './clinic-gateway-client';
import { clearGatewayClientCache } from './clinic-gateway-cache';

export interface ClinicCommandLog {
  id: string;
  nodeId: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executedAt: string;
}

export async function executeGatewayCommand(
  nodeId: string,
  command: string
): Promise<{ success: boolean; actionId: string; command: string; message: string } | null> {
  if (!isClinicGatewayConfigured()) return null;

  const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
  const apiKey = config.clinicGatewayApiKey;

  try {
    const res = await fetch(`${baseUrl}/api/v1/nodes/${encodeURIComponent(nodeId)}/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ command }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success) {
      clearGatewayClientCache('gateway:nodes');
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchGatewayCommandLogs(
  nodeId: string,
  limit = 20
): Promise<{ success: boolean; total: number; commands: ClinicCommandLog[] } | null> {
  if (!isClinicGatewayConfigured()) return null;

  const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
  const apiKey = config.clinicGatewayApiKey;

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/nodes/${encodeURIComponent(nodeId)}/commands?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchGatewayLastCommand(
  nodeId: string
): Promise<{ success: boolean; command: ClinicCommandLog } | null> {
  if (!isClinicGatewayConfigured()) return null;

  const baseUrl = config.clinicGatewayUrl.replace(/\/+$/, '');
  const apiKey = config.clinicGatewayApiKey;

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/nodes/${encodeURIComponent(nodeId)}/commands/last`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data?.success ? data : null;
  } catch {
    return null;
  }
}
