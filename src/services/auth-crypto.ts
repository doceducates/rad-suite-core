import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'rad_suite_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  if (hash.startsWith('$2')) {
    const ok = await bcrypt.compare(password, hash);
    if (ok) return true;
  }
  const sha = crypto.createHash('sha256').update(password + 'rad_suite_salt_2026').digest('hex');
  if (sha === hash) return true;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
