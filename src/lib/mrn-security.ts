// Layer 0 (Security Utility): Canonical MRN Security & UUID Protection
// Strict File Size Invariant: Target < 100 lines

/**
 * Checks if a string is a standard UUID.
 */
export function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Sanitizes an MRN string. If the string is empty or is a database UUID, returns empty string.
 */
export function sanitizeMrn(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (isUuid(trimmed)) return '';
  return trimmed;
}

/**
 * Deterministically resolves the safest, non-poisoned MRN from patient and study models.
 * Guarantee: NEVER returns a database UUID foreign key.
 */
export function extractSafeMrn(patient?: any, study?: any): string {
  const candidates = [
    patient?.mrNumber,
    patient?.mrn,
    study?.patientMrn,
    study?.mrNumber,
    study?.mrn,
    study?.patientId,
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizeMrn(candidate);
    if (sanitized) return sanitized;
  }

  return '';
}
