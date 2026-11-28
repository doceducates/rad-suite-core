/**
 * Layer 2: Cloud-to-Localhost Clinic Node Relay Service
 *
 * Bridges a local development workstation (`npm run dev` on localhost)
 * or standalone desktop app to the remote hospital Clinic PC through the VPS.
 * Supports both token-authenticated relay and session-authenticated relay.
 */

import { config } from '@/lib/config';
import type { ClinicNodeTelemetry, ClinicActionType } from './clinic-node.service';
import { getEffectiveRelayConfig, type EffectiveRelayConfig } from './clinic-relay-storage.service';

export { getEffectiveRelayConfig, type EffectiveRelayConfig };

interface RelayResponse {
  telemetry: ClinicNodeTelemetry | null;
  nodes: ClinicNodeTelemetry[];
}

let cachedRelaySessionCookie: string | null = null;
let cachedSessionExpiry = 0;
let lastRelayFetchTime = 0;
let lastRelayFailureTime = 0;
let lastRelayResult: RelayResponse | null = null;

const RELAY_FAILURE_COOLDOWN_MS = 30_000;
const RELAY_STATUS_TIMEOUT_MS = 2_500;

export function isRelayApplicable(): boolean {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_CLINIC_RELAY_IN_TEST) {
    return false;
  }
  const { isConfigured, relayUrl } = getEffectiveRelayConfig();
  if (!isConfigured || !relayUrl) return false;

  // Prevent infinite self-loop if running ON the production VPS itself
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  if (appUrl && appUrl === relayUrl.replace(/\/+$/, '')) {
    return false;
  }
  return true;
}

async function getRelaySessionCookie(baseUrl: string): Promise<string | null> {
  if (cachedRelaySessionCookie && Date.now() < cachedSessionExpiry) {
    return cachedRelaySessionCookie;
  }

  const candidates: Array<{ email: string; password: string }> = [];
  if (process.env.CLINIC_RELAY_EMAIL && process.env.CLINIC_RELAY_PASSWORD) {
    candidates.push({
      email: process.env.CLINIC_RELAY_EMAIL,
      password: process.env.CLINIC_RELAY_PASSWORD,
    });
  }

  for (const cred of candidates) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
          const match = setCookie.match(/rad_suite_session=[^;]+/);
          if (match) {
            cachedRelaySessionCookie = match[0];
            cachedSessionExpiry = Date.now() + 1000 * 60 * 60 * 4; // 4 hours
            return cachedRelaySessionCookie;
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

function annotateRelayedNode(node: ClinicNodeTelemetry, baseUrl: string): ClinicNodeTelemetry {
  return {
    ...node,
    relayedFrom: baseUrl,
  };
}

export async function fetchRelayedClinicStatus(nodeId?: string): Promise<RelayResponse | null> {
  if (!isRelayApplicable()) return null;

  const { relayUrl: baseUrl, secret } = getEffectiveRelayConfig();
  const now = Date.now();
  if (!nodeId && lastRelayResult && now - lastRelayFetchTime < 5000) {
    return lastRelayResult;
  }
  if (lastRelayFailureTime && now - lastRelayFailureTime < RELAY_FAILURE_COOLDOWN_MS) {
    return lastRelayResult;
  }

  const query = nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : '';

  // 1. Try direct token-authenticated endpoint (/api/clinic-node/heartbeat GET)
  try {
    const tokenRes = await fetch(`${baseUrl}/api/clinic-node/heartbeat${query}`, {
      method: 'GET',
      headers: {
        'x-clinic-token': secret,
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(RELAY_STATUS_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      if (data?.success && data.telemetry) {
        const result: RelayResponse = {
          telemetry: annotateRelayedNode(data.telemetry, baseUrl),
          nodes: Array.isArray(data.nodes)
            ? data.nodes.map((n: ClinicNodeTelemetry) => annotateRelayedNode(n, baseUrl))
            : [annotateRelayedNode(data.telemetry, baseUrl)],
        };
        lastRelayResult = result;
        lastRelayFetchTime = now;
        lastRelayFailureTime = 0;
        return result;
      }
    }
  } catch {
    // Fall through to session-authenticated /api/clinic-node
  }

  // 2. Fallback to session-authenticated /api/clinic-node
  try {
    const cookie = cachedRelaySessionCookie || `rad_suite_session=${secret}`;
    const headers: Record<string, string> = {
      'x-clinic-token': secret,
      Cookie: cookie,
    };
    if (config.apiSecretKey) headers['x-api-key'] = config.apiSecretKey;

    let res = await fetch(`${baseUrl}/api/clinic-node${query}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(RELAY_STATUS_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (res.status === 401) {
      const loginCookie = await getRelaySessionCookie(baseUrl);
      if (loginCookie) {
        headers.Cookie = loginCookie;
        res = await fetch(`${baseUrl}/api/clinic-node${query}`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(RELAY_STATUS_TIMEOUT_MS),
          cache: 'no-store',
        });
      }
    }

    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.telemetry) {
        const result: RelayResponse = {
          telemetry: annotateRelayedNode(data.telemetry, baseUrl),
          nodes: Array.isArray(data.nodes)
            ? data.nodes.map((n: ClinicNodeTelemetry) => annotateRelayedNode(n, baseUrl))
            : [annotateRelayedNode(data.telemetry, baseUrl)],
        };
        lastRelayResult = result;
        lastRelayFetchTime = now;
        lastRelayFailureTime = 0;
        return result;
      }
    }
  } catch {
    // Offline or unreachable
  }

  lastRelayFailureTime = Date.now();
  return null;
}

export async function dispatchRelayedClinicAction(
  action: ClinicActionType,
  payload?: any,
  nodeId?: string
): Promise<{ success: boolean; message: string } | null> {
  if (!isRelayApplicable()) return null;

  const { relayUrl: baseUrl, secret } = getEffectiveRelayConfig();

  // Invalidate cached status so next poll reflects change immediately
  lastRelayFetchTime = 0;
  lastRelayFailureTime = 0;
  lastRelayResult = null;

  // 1. Try direct token-authenticated PUT /api/clinic-node/heartbeat
  try {
    const tokenRes = await fetch(`${baseUrl}/api/clinic-node/heartbeat`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-clinic-token': secret,
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ nodeId, action, payload }),
      signal: AbortSignal.timeout(4000),
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      if (data?.success) {
        return {
          success: true,
          message: data.message || `Action '${action}' relayed to clinic node via ${baseUrl}.`,
        };
      }
    }
  } catch {
    // Fall through to session-authenticated POST /api/clinic-node
  }

  // 2. Fallback to session-authenticated POST /api/clinic-node
  try {
    const cookie = cachedRelaySessionCookie || `rad_suite_session=${secret}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-clinic-token': secret,
      Cookie: cookie,
    };
    if (config.apiSecretKey) headers['x-api-key'] = config.apiSecretKey;

    let res = await fetch(`${baseUrl}/api/clinic-node`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nodeId, action, payload }),
      signal: AbortSignal.timeout(4500),
    });

    if (res.status === 401) {
      const loginCookie = await getRelaySessionCookie(baseUrl);
      if (loginCookie) {
        headers.Cookie = loginCookie;
        res = await fetch(`${baseUrl}/api/clinic-node`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ nodeId, action, payload }),
          signal: AbortSignal.timeout(4500),
        });
      }
    }

    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        return {
          success: true,
          message: data.message || `Action '${action}' relayed to clinic node via ${baseUrl}.`,
        };
      }
    }
  } catch {
    // Ignore network error
  }

  return null;
}

export async function testRelayConnection(
  targetUrl?: string,
  targetSecret?: string
): Promise<{ success: boolean; latencyMs: number; nodeCount: number; message: string }> {
  const effective = getEffectiveRelayConfig();
  const url = (targetUrl || effective.relayUrl || '').trim().replace(/\/+$/, '');
  const secret = targetSecret !== undefined ? targetSecret.trim() : effective.secret;

  if (!url) {
    return { success: false, latencyMs: 0, nodeCount: 0, message: 'Cloud relay URL is required.' };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${url}/api/clinic-node/heartbeat`, {
      method: 'GET',
      headers: {
        'x-clinic-token': secret,
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    const latency = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data?.nodes) ? data.nodes.length : data?.telemetry ? 1 : 0;
      return {
        success: true,
        latencyMs: latency,
        nodeCount: count,
        message: `Successfully connected to cloud relay (${latency}ms, ${count} node${count === 1 ? '' : 's'} available).`,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, latencyMs: latency, nodeCount: 0, message: 'Authentication failed. Please verify clinic secret token.' };
    }

    return { success: false, latencyMs: latency, nodeCount: 0, message: `Cloud relay responded with HTTP ${res.status}.` };
  } catch (err: any) {
    const latency = Date.now() - start;
    return { success: false, latencyMs: latency, nodeCount: 0, message: `Could not reach ${url}: ${err.message || 'Connection timed out'}` };
  }
}

export function resetRelayCache(): void {
  cachedRelaySessionCookie = null;
  cachedSessionExpiry = 0;
  lastRelayFetchTime = 0;
  lastRelayResult = null;
}
