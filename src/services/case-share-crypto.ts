// Layer 2 (Domain/Services): Case Share Cryptographic Tokens & Session Proofs (<80 lines)
import crypto from 'crypto';
import { config } from '@/lib/config';

export const SHARE_SECRET =
  process.env.SHARE_SIGNING_SECRET || config.apiSecretKey || 'rad_suite_secure_consultant_share_2026';

export interface CreateShareInput {
  studyId: string;
  password?: string;
  passwordHint?: string;
  durationHours?: number;
  expiresAt?: string;
  maxViews?: number;
}

export interface ShareResult {
  id: string;
  studyId: string;
  token: string;
  passwordPin: string;
  passwordHint?: string;
  expiresAt: string;
  durationHours: number;
  shareUrl: string;
}

export interface ShareRecord {
  id: string;
  token: string;
  password_hint?: string;
  expires_at: string;
  duration_hours: number;
  view_count: number;
  is_active: number | boolean;
  created_at: string;
}

export function generateMemorablePin(): string {
  const num = crypto.randomInt(100, 999);
  return `RAD-${num}`;
}

export function generateShareToken(): string {
  return crypto.randomBytes(18).toString('base64url');
}

export function createShareSessionProof(token: string, shareId: string, expiresAt: string): string {
  const payload = JSON.stringify({ token, shareId, expiresAt });
  const hmac = crypto.createHmac('sha256', SHARE_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64url');
}

export function verifyShareSessionProof(token: string, proof?: string): boolean {
  if (!proof) return false;
  try {
    const raw = Buffer.from(proof, 'base64url').toString('utf8');
    const { payload, hmac } = JSON.parse(raw);
    const expected = crypto.createHmac('sha256', SHARE_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
      return false;
    }
    const parsed = JSON.parse(payload);
    if (parsed.token !== token) return false;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}
