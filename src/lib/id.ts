// Layer 0 (Utility): Type-Prefixed Chronological Entity ID Generator (<100 lines)
// Follows Stripe / Linear / Clerk standard: <prefix>_<timestamp_base36><entropy>

export type EntityPrefix =
  | 'tnt'   // Tenant / Hospital
  | 'usr'   // Clinician / User
  | 'pat'   // Patient
  | 'std'   // Diagnostic Study
  | 'rep'   // Clinical Report
  | 'rev'   // Report Revision
  | 'vault' // HMIS Draft Vault Item
  | 'sess'  // Session Token / Auth
  | 'aud'   // Audit Log
  | 'inv';  // Invite Code

/**
 * Generates a collision-safe, time-sortable, type-prefixed identifier.
 * Example: createId('std') -> "std_01jcb92abc45def678"
 */
export function createId(prefix: EntityPrefix): string {
  const now = Date.now();
  // 8-character base36 timestamp (sorts chronologically)
  const timePart = now.toString(36).padStart(8, '0');
  
  // 16-character cryptographic random entropy
  const randomBytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 10; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const randomPart = Array.from(randomBytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);

  return `${prefix}_${timePart}${randomPart}`;
}

/**
 * Extracts entity prefix from an identifier.
 */
export function parseIdPrefix(id?: string | null): EntityPrefix | null {
  if (!id || typeof id !== 'string') return null;
  const match = id.match(/^([a-z]{3,5})_/);
  return match ? (match[1] as EntityPrefix) : null;
}
