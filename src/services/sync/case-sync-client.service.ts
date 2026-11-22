// Layer 2: Remote VPS Synchronization Transport Client
import { config } from '@/lib/config';
import type { CaseSyncBundle, SyncPushResult, SyncPullResult } from './case-sync-types';

export function getVpsSyncEndpoint(): string {
  const customUrl = process.env.VPS_SYNC_URL || process.env.NEXT_PUBLIC_VPS_SYNC_URL;
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim().replace(/\/gateway\/?$/i, '').replace(/\/+$/, '');
  }
  if (config.clinicGatewayUrl && config.clinicGatewayUrl.trim().length > 0) {
    return config.clinicGatewayUrl.trim().replace(/\/gateway\/?$/i, '').replace(/\/+$/, '');
  }
  return '';
}

export function getVpsSyncApiKey(): string {
  const configured =
    process.env.VPS_SYNC_API_KEY ||
    process.env.CLINIC_GATEWAY_API_KEY ||
    config.clinicGatewayApiKey;

  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }

  // Security Invariant: Never allow hardcoded fallback secrets in production
  if (process.env.NODE_ENV === 'production') {
    return '';
  }

  return 'cgt_secret_key_dev_local';
}

export function isVpsSyncConfigured(): boolean {
  return getVpsSyncEndpoint().length > 0;
}

/**
 * Pings the remote VPS sync health endpoint to measure latency and verify credentials.
 */
export async function testVpsSyncConnection(): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  serverTime?: string;
}> {
  const t0 = Date.now();
  const endpoint = getVpsSyncEndpoint();

  if (!endpoint) {
    return {
      success: false,
      latencyMs: 0,
      message: 'VPS sync URL is not configured (set VPS_SYNC_URL in .env)',
    };
  }

  try {
    const apiKey = getVpsSyncApiKey();
    const res = await fetch(`${endpoint}/api/v1/sync/cases/health`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });

    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      return {
        success: false,
        latencyMs,
        message: `VPS responded with HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      success: true,
      latencyMs,
      message: 'Remote VPS connected and ready for case synchronization',
      serverTime: data.serverTime,
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - t0,
      message: `Failed connecting to VPS: ${err.message || 'Connection timeout'}`,
    };
  }
}

/**
 * Pushes a batch of case bundles and optional PACS studies to the remote VPS sync endpoint.
 */
export async function pushBundlesToVps(
  bundles: CaseSyncBundle[],
  pacsStudies?: any[],
  userToken?: string
): Promise<SyncPushResult> {
  const endpoint = getVpsSyncEndpoint();
  if (!endpoint) {
    throw new Error('VPS sync URL is not configured');
  }

  const apiKey = getVpsSyncApiKey();
  const authHeader = userToken ? `Bearer ${userToken}` : `Bearer ${apiKey}`;

  const res = await fetch(`${endpoint}/api/v1/sync/cases/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ bundles, pacsStudies }, (_key, value) => (value === null ? undefined : value)),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`VPS push failed with HTTP ${res.status}: ${errorText || res.statusText}`);
  }

  const data: SyncPushResult = await res.json();
  return data;
}

/**
 * Pulls case bundles and PACS studies modified on the VPS since a given timestamp.
 */
export async function pullBundlesFromVps(
  since?: string,
  scope: 'my_cases' | 'active_shift' | 'all' = 'active_shift',
  userToken?: string
): Promise<SyncPullResult> {
  const endpoint = getVpsSyncEndpoint();
  if (!endpoint) {
    return { success: false, bundles: [], pacsStudies: [], serverTime: new Date().toISOString(), totalAvailable: 0, error: 'VPS sync URL is not configured' };
  }

  const apiKey = getVpsSyncApiKey();
  const authHeader = userToken ? `Bearer ${userToken}` : `Bearer ${apiKey}`;

  const params = new URLSearchParams();
  if (since) params.set('since', since);
  if (scope) params.set('scope', scope);
  const queryParam = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${endpoint}/api/v1/sync/cases/pull${queryParam}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'x-api-key': apiKey,
    },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });

  if (!res.ok) {
    return {
      success: false,
      bundles: [],
      pacsStudies: [],
      serverTime: new Date().toISOString(),
      totalAvailable: 0,
      error: `VPS pull failed with HTTP ${res.status}`,
    };
  }

  const data: SyncPullResult = await res.json();
  return data;
}

/**
 * Pulls universal settings bundle from remote VPS.
 */
export async function pullSettingsFromVps(): Promise<{ success: boolean; settings?: any; error?: string }> {
  const endpoint = getVpsSyncEndpoint();
  if (!endpoint) return { success: false, error: 'VPS sync URL is not configured' };

  try {
    const apiKey = getVpsSyncApiKey();
    const res = await fetch(`${endpoint}/api/v1/sync/settings`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: true, settings: data.settings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Pushes universal settings bundle to remote VPS.
 */
export async function pushSettingsToVps(settings: any): Promise<{ success: boolean; error?: string }> {
  const endpoint = getVpsSyncEndpoint();
  if (!endpoint) return { success: false, error: 'VPS sync URL is not configured' };

  try {
    const apiKey = getVpsSyncApiKey();
    const res = await fetch(`${endpoint}/api/v1/sync/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey },
      body: JSON.stringify(settings),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { success: data.success };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
