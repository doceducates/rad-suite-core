/**
 * HMIS Gateway HTTP Transport Utilities (<100 lines)
 * Reusable header formatting, URL construction, and JSON response parsing.
 */

import { HmisAuthCredentials } from './hmis-models';
import { getGatewayBaseUrlSync } from './hmis-discovery.service';

export const getGatewayBase = () => getGatewayBaseUrlSync();

export function getGatewayHeaders(credentials?: HmisAuthCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const secretKey = process.env.API_SECRET_KEY;
  if (secretKey) {
    headers['Authorization'] = `Bearer ${secretKey.trim()}`;
    headers['x-api-key'] = secretKey.trim();
  }
  if (credentials?.username) headers['x-hmis-username'] = credentials.username;
  if (credentials?.hospitalId) headers['x-hmis-hospital-id'] = credentials.hospitalId;
  if (credentials?.password) headers['x-hmis-password'] = credentials.password;
  if (credentials?.reportingDoctorName) headers['x-hmis-doctor-name'] = credentials.reportingDoctorName;
  return headers;
}

export async function parseGatewayJson<T = any>(
  res: Response,
  fallbackError: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const cType = res.headers.get('content-type') || '';
  if (!cType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    return { success: false, error: `HMIS Gateway HTTP ${res.status}: ${clean || res.statusText || fallbackError}` };
  }
  const result = await res.json().catch(() => null);
  if (!res.ok) return { success: false, error: result?.error || fallbackError };
  return { success: true, data: result?.data ?? result };
}

export function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
