/**
 * Deterministic MRN Resolution Service (P1 #12)
 *
 * Normalizes, canonicalizes, and resolves hospital MR Numbers across
 * Punjab HMIS (14-digit), LGH internal archives, and PACS worklists.
 */

import crypto from 'crypto';
import { eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { patients } from '@/db/schema';

/**
 * Normalizes an incoming raw MRN into its canonical representation.
 */
export function normalizeMrn(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim().toUpperCase();

  // Strip leading noise like "MRN:", "MR#", "MRN#"
  cleaned = cleaned.replace(/^(MRN|MR)\s*[:#\-_\s]+/i, 'MRN-');

  // If already prefixed with MR-, canonicalize to MRN-
  if (cleaned.startsWith('MR-') && !cleaned.startsWith('MRN-')) {
    cleaned = 'MRN-' + cleaned.substring(3);
  }

  // Remove duplicate dashes or invalid characters
  cleaned = cleaned.replace(/[^A-Z0-9\-]/g, '').replace(/-+/g, '-');

  // Strip trailing dashes
  cleaned = cleaned.replace(/-+$/, '');

  return cleaned;
}

/**
 * Checks whether an MRN conforms to the Punjab HMIS 14-digit standard.
 * Format: 2-digit hospital code (e.g. 19 for LGH) + 4-digit year + 8-digit sequence
 */
export function isPunjabHmisMrn(mrn: string): boolean {
  return /^\d{14}$/.test(mrn);
}

/**
 * Generates a deterministic fallback MRN when raw data lacks an explicit MRN.
 * Uses patient demographic features to ensure repeated imports map to the same ID.
 */
export function generateDeterministicMrn(
  fullName: string,
  ageOrDob?: number | string,
  gender?: string
): string {
  const normName = (fullName || 'UNKNOWN').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normAge = String(ageOrDob || '0').trim();
  const normGender = (gender || 'U').trim().toUpperCase().charAt(0);

  const hash = crypto
    .createHash('sha256')
    .update(`${normName}:${normAge}:${normGender}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  return `MRN-DET-${hash}`;
}

export interface PatientResolutionInput {
  mrn?: string | null;
  fullName: string;
  age?: number;
  dob?: string;
  gender?: string;
  phone?: string | null;
  guardianName?: string | null;
}

/**
 * Deterministically resolves or creates a patient record by canonical MRN.
 * Ensures concurrent or repeated calls for the same MRN map to the exact same record.
 */
export async function resolvePatientByMrn(
  input: PatientResolutionInput,
  tx: any = db
): Promise<{ id: string; mrNumber: string; isNew: boolean }> {
  let canonicalMrn = normalizeMrn(input.mrn);

  if (!canonicalMrn) {
    canonicalMrn = generateDeterministicMrn(input.fullName, input.age, input.gender);
  }

  // Generate prefix variants to look up (e.g. "MRN-99412", "MR-99412", "99412")
  const rawDigits = canonicalMrn.replace(/[^0-9]/g, '');
  const lookupConditions = [eq(patients.mrNumber, canonicalMrn)];

  if (rawDigits && rawDigits.length >= 4) {
    lookupConditions.push(eq(patients.mrNumber, rawDigits));
    lookupConditions.push(eq(patients.mrNumber, `MR-${rawDigits}`));
    lookupConditions.push(eq(patients.mrNumber, `MRN-${rawDigits}`));
  }

  const [existing] = await tx
    .select()
    .from(patients)
    .where(or(...lookupConditions))
    .limit(1);

  let normalizedGender = 'Male';
  if (input.gender) {
    const g = String(input.gender).trim().toUpperCase();
    if (g === 'F' || g === 'FEMALE') normalizedGender = 'Female';
    else if (g === 'O' || g === 'OTHER') normalizedGender = 'Other';
    else normalizedGender = 'Male';
  }

  if (existing) {
    // Idempotent resolution: update missing demographic data or normalize legacy gender
    const isSingleCharGender = existing.gender === 'M' || existing.gender === 'F';
    const resolvedGender = isSingleCharGender
      ? (existing.gender === 'F' ? 'Female' : 'Male')
      : (existing.gender || normalizedGender);

    const updateFields: Record<string, any> = {};
    if (!existing.phone && input.phone) updateFields.phone = input.phone;
    if (!existing.guardianName && input.guardianName) updateFields.guardianName = input.guardianName;
    if (isSingleCharGender || !existing.gender) updateFields.gender = resolvedGender;
    if (input.dob && (!existing.dob || existing.dob === '1980-01-01')) updateFields.dob = input.dob;
    // Upgrade default dummy age (35 or 30) when a non-default verified age is provided
    if (input.age && input.age !== 35 && (existing.age === 35 || existing.age === 30)) {
      updateFields.age = input.age;
    }

    if (Object.keys(updateFields).length > 0) {
      await tx
        .update(patients)
        .set(updateFields as any)
        .where(eq(patients.id, existing.id));
    }
    return { id: existing.id, mrNumber: existing.mrNumber, isNew: false };
  }

  // Create new patient atomically
  const newId = crypto.randomUUID();
  await tx.insert(patients).values({
    id: newId,
    mrNumber: canonicalMrn,
    fullName: input.fullName.trim(),
    dob: input.dob || '1980-01-01',
    age: input.age ?? 30,
    gender: normalizedGender,
    phone: input.phone || null,
    guardianName: input.guardianName || null,
    createdAt: new Date(),
  } as any);

  return { id: newId, mrNumber: canonicalMrn, isNew: true };
}
