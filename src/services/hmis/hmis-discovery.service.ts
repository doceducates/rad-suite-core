/**
 * HMIS Gateway Discovery & Plugin Auto-Detection Service (<250 lines).
 * Standardized service discovery:
 * 1. Checks plugin availability & authorization (Rule 15 Modular Plugin invariant)
 * 2. Probes environment variables, manifest backendPort, and candidate ports (3788, 3789, 8080)
 * 3. Dynamically binds to the running HMIS Gateway process without hardcoding.
 */

import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';

export interface HmisPluginInfo {
  available: boolean;
  enabled: boolean;
  authorized: boolean;
  backendPort?: number;
  version?: string;
}

export interface DiscoveredGatewayStatus {
  online: boolean;
  url: string;
  extensionConnected?: boolean;
  safetyMode?: string;
  activeSessions?: number;
  plugin: HmisPluginInfo;
}

let cachedGatewayUrl: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Inspects if the HMIS Gateway plugin is installed, enabled, and authorized.
 */
export function getHmisPluginInfo(): HmisPluginInfo {
  try {
    const pluginManifestPath = path.resolve(process.cwd(), 'plugins', 'hmis-gateway', 'manifest.json');
    if (fs.existsSync(pluginManifestPath)) {
      const raw = fs.readFileSync(pluginManifestPath, 'utf8');
      const manifest = JSON.parse(raw);
      return {
        available: true,
        enabled: manifest.enabled !== false,
        authorized: manifest.authorized !== false,
        backendPort: typeof manifest.backendPort === 'number' ? manifest.backendPort : undefined,
        version: manifest.version,
      };
    }
  } catch {}

  // If no modular plugin folder exists (e.g. monolithic rad-suite), default to available
  return {
    available: true,
    enabled: true,
    authorized: true,
    backendPort: 3788,
  };
}

/**
 * Builds an ordered list of candidate URLs to probe for an active HMIS Gateway.
 */
export function getCandidateGatewayUrls(): string[] {
  const candidates: string[] = [];
  const add = (u?: string | null) => {
    if (!u) return;
    const clean = u.trim().replace(/\/+$/, '');
    if (clean && !candidates.includes(clean)) candidates.push(clean);
  };

  // 1. Explicit env configuration
  if (process.env.HMIS_GATEWAY_URL) add(process.env.HMIS_GATEWAY_URL);
  if (process.env.HMIS_GATEWAY_PORT) add(`http://127.0.0.1:${process.env.HMIS_GATEWAY_PORT}`);

  // 2. Plugin manifest configuration
  const pluginInfo = getHmisPluginInfo();
  if (pluginInfo.backendPort) add(`http://127.0.0.1:${pluginInfo.backendPort}`);

  // 3. Centralized config (server-side resolution)
  if (typeof window === 'undefined') {
    const cfgUrl = config.hmisGatewayUrl;
    if (cfgUrl && !cfgUrl.startsWith('/')) add(cfgUrl);
  }

  // 4. Standard local ports fallback
  add('http://127.0.0.1:3788');
  add('http://localhost:3788');
  add('http://127.0.0.1:3789');
  add('http://127.0.0.1:8080');

  return candidates;
}

/**
 * Synchronous accessor for currently active/cached gateway URL.
 */
export function getGatewayBaseUrlSync(): string {
  if (cachedGatewayUrl) return cachedGatewayUrl;
  const candidates = getCandidateGatewayUrls();
  return candidates[0] || 'http://127.0.0.1:3788';
}

/**
 * Probes a specific gateway URL to check if it is active and responding.
 */
async function probeUrl(url: string, headers: Record<string, string>, timeoutMs = 700): Promise<{
  online: boolean;
  data?: any;
}> {
  try {
    const res = await fetch(`${url}/api/status`, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { online: false };
    const data = await res.json();
    const isOnline = data && (data.status === 'online' || data.gatewayOnline === true || data.safetyMode);
    return { online: !!isOnline, data };
  } catch {
    return { online: false };
  }
}

/**
 * Dynamically resolves the active running HMIS Gateway base URL.
 * Automatically tests candidates and caches the verified endpoint.
 */
export async function resolveGatewayBaseUrl(
  headers: Record<string, string> = {},
  forceRefresh = false
): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedGatewayUrl && now < cacheExpiresAt) {
    return cachedGatewayUrl;
  }

  const candidates = getCandidateGatewayUrls();

  // Fast parallel probe with short timeout
  const probes = candidates.map(async (url) => {
    const result = await probeUrl(url, headers);
    return { url, ...result };
  });

  const results = await Promise.all(probes);
  const matched = results.find((r) => r.online);

  if (matched) {
    cachedGatewayUrl = matched.url;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return matched.url;
  }

  // Default fallback if no process currently active
  const fallback = candidates[0] || 'http://127.0.0.1:3788';
  cachedGatewayUrl = fallback;
  cacheExpiresAt = now + 5000; // Retry sooner if none was online
  return fallback;
}

/**
 * Invalidates the cached active URL when a request fails.
 */
export function invalidateGatewayCache(): void {
  cachedGatewayUrl = null;
  cacheExpiresAt = 0;
}
