/**
 * HMIS Demographics & Patient Verification Service
 * Handles on-demand extraction of verified registration cards and age resolution.
 * Strict File Size Invariant: Target < 200 lines
 */
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { config } from '@/lib/config';
import { getGatewayHeaders, HmisAuthCredentials } from './hmis-gateway-client.service';

const getGatewayBase = () => config.hmisGatewayUrl;

export interface ExtractedDemographics {
  fullName?: string;
  mrn?: string;
  cnic?: string;
  phone?: string;
  age?: number | null;
  rawAge?: string;
  gender?: 'Male' | 'Female' | 'Other';
  clinic?: string;
  acknowledgementDate?: string;
}

export async function fetchHmisPatientDemographics(
  params: { accession?: string; mrn?: string; investigationId?: string },
  credentials?: HmisAuthCredentials
): Promise<{ success: boolean; demographics?: ExtractedDemographics; error?: string }> {
  try {
    const q = new URLSearchParams();
    if (params.accession) q.set('accession', params.accession);
    if (params.mrn) q.set('mrn', params.mrn);
    if (params.investigationId) q.set('investigationId', params.investigationId);

    const res = await fetch(`${getGatewayBase()}/api/radiology/demographics?${q.toString()}`, {
      method: 'GET',
      headers: getGatewayHeaders(credentials),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || `Demographics lookup failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      demographics: data.data?.demographics,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Demographics service connection error: ${err.message}`,
    };
  }
}

export async function syncCaseDemographics(
  accessionNumber: string,
  credentials?: HmisAuthCredentials
): Promise<{
  success: boolean;
  demographics?: ExtractedDemographics;
  updatedPatient?: any;
  error?: string;
}> {
  if (!accessionNumber) {
    return { success: false, error: 'Accession number is required.' };
  }

  const studyRows = await db
    .select({
      study: studies,
      patient: patients,
    })
    .from(studies)
    .innerJoin(patients, eq(patients.id, studies.patientId))
    .where(eq(studies.accessionNumber, accessionNumber.toUpperCase()))
    .limit(1);

  if (studyRows.length === 0) {
    return { success: false, error: `Study "${accessionNumber}" not found in local workstation database.` };
  }

  const { study, patient } = studyRows[0];
  const lookupRes = await fetchHmisPatientDemographics(
    {
      accession: study.accessionNumber,
      mrn: patient.mrNumber,
      investigationId: study.hmisInvestigationId || undefined,
    },
    credentials
  );

  if (!lookupRes.success || !lookupRes.demographics) {
    return { success: false, error: lookupRes.error || 'Failed to extract demographics from HMIS.' };
  }

  const demo = lookupRes.demographics;
  const patUpdates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (demo.phone && !patient.phone) patUpdates.phone = demo.phone;
  if (demo.cnic && !patient.cnic) patUpdates.cnic = demo.cnic;
  if (demo.gender && (!patient.gender || patient.gender === 'Other')) patUpdates.gender = demo.gender;

  if (typeof demo.age === 'number' && demo.age > 0) {
    patUpdates.hmisAge = demo.age;
    if (!patient.dicomAge && patient.age > 0) {
      patUpdates.dicomAge = patient.age;
    }
  }

  await db.update(patients).set(patUpdates).where(eq(patients.id, patient.id));

  if (demo.clinic && !study.referringDoctor) {
    await db.update(studies).set({ referringDoctor: demo.clinic }).where(eq(studies.id, study.id));
  }

  const [updatedPatient] = await db.select().from(patients).where(eq(patients.id, patient.id)).limit(1);

  return {
    success: true,
    demographics: demo,
    updatedPatient,
  };
}

export async function updatePatientAgeResolution(
  mrNumber: string,
  selectedAge: number,
  source: 'dicom' | 'hmis' | 'manual'
): Promise<{ success: boolean; patient?: any; error?: string }> {
  if (!mrNumber) {
    return { success: false, error: 'Patient MRN is required.' };
  }

  if (typeof selectedAge !== 'number' || isNaN(selectedAge) || selectedAge < 0 || selectedAge > 120) {
    return { success: false, error: 'Invalid age provided.' };
  }

  const patientRows = await db.select().from(patients).where(eq(patients.mrNumber, mrNumber)).limit(1);
  if (patientRows.length === 0) {
    return { success: false, error: `Patient MRN "${mrNumber}" not found.` };
  }

  const pat = patientRows[0];
  const updates: any = {
    age: selectedAge,
    ageSource: source,
    updatedAt: new Date().toISOString(),
  };

  await db.update(patients).set(updates).where(eq(patients.id, pat.id));
  const [updated] = await db.select().from(patients).where(eq(patients.id, pat.id)).limit(1);

  return {
    success: true,
    patient: updated,
  };
}
