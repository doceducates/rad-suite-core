/**
 * HMIS Punjab Portal Integration Service
 * Bridges Rad Suite with Punjab Health Department (hmis.punjab.gov.pk)
 */

import { config } from '@/lib/config';

export interface HmisHospital {
  id: string;
  name: string;
  code: string;
  city: string;
}

export const PUNJAB_HOSPITALS: HmisHospital[] = [
  { id: '19', name: 'Lahore General Hospital (LGH)', code: 'LGH-LHR', city: 'Lahore' },
  { id: '18', name: 'Services Hospital Lahore (SIMS)', code: 'SHL-LHR', city: 'Lahore' },
  { id: '15', name: 'Mayo Hospital Lahore (KEMU)', code: 'MHL-LHR', city: 'Lahore' },
  { id: '22', name: 'Jinnah Hospital Lahore (AIMC)', code: 'JHL-LHR', city: 'Lahore' },
  { id: '31', name: 'Allied Hospital Faisalabad', code: 'AHF-FSD', city: 'Faisalabad' },
  { id: '40', name: 'Nishtar Hospital Multan', code: 'NHM-MUX', city: 'Multan' },
];

export interface HmisCrossSectionalPayload {
  hospitalId: string;
  departmentId: string;
  patientMrn: string;
  patientName: string;
  age: number;
  gender: string;
  modality: 'CT' | 'MRI';
  scanType: string;
  clinicalHistory: string;
  provisionalDiagnosis: string;
  icd10Code: string;
  radiologistImpression: string;
  signedBy: string;
  checkoutAction: 'draft' | 'order_only' | 'save_and_checkout';
}

/**
 * Solves the Punjab HMIS math verification captcha.
 */
export function solveHmisCaptcha(val1: number, val2: number, operator: string = '+'): number {
  switch (operator) {
    case '-':
      return val1 - val2;
    case '*':
      return val1 * val2;
    default:
      return val1 + val2;
  }
}

/**
 * Builds standard encounter payload for HMIS Punjab cross-sectional scans.
 */
export function buildHmisEncounterPayload(data: HmisCrossSectionalPayload) {
  return {
    source: 'RadSuite-Workstation',
    portalUrl: 'https://hmis.punjab.gov.pk/',
    timestamp: new Date().toISOString(),
    hospital: PUNJAB_HOSPITALS.find((h) => h.id === data.hospitalId) || PUNJAB_HOSPITALS[0],
    encounter: {
      mrn: data.patientMrn,
      patientName: data.patientName,
      demographics: {
        age: data.age,
        gender: data.gender,
      },
      department: 'Radiology / Cross-Sectional Imaging',
      complaint: data.clinicalHistory,
      diagnosis: {
        title: data.provisionalDiagnosis,
        icd10: data.icd10Code,
      },
      investigationOrder: {
        type: data.modality,
        protocol: data.scanType,
      },
      diagnosticReport: {
        impression: data.radiologistImpression,
        signedBy: data.signedBy,
        finalizedAt: new Date().toISOString(),
      },
      status: data.checkoutAction === 'save_and_checkout' ? 'CLOSED' : data.checkoutAction === 'draft' ? 'DRAFT_STAGED' : 'PENDING_SCAN',
    },
  };
}

/**
 * Checks connection status of the local HMIS Autopilot Gateway.
 */
export async function checkGatewayStatus(): Promise<{ connected: boolean; status?: any }> {
  const base = config.hmisGatewayUrl;
  if (!base) return { connected: false };
  try {
    const res = await fetch(`${base}/api/status`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return { connected: true, status: data };
    }
    return { connected: false };
  } catch {
    return { connected: false };
  }
}

export interface HmisRadiologyReportPayload {
  hospitalId?: string;
  patientMrn: string;
  patientName: string;
  accessionNumber?: string;
  modality: string;
  scanType: string;
  technique?: string;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  pgrName?: string;
  consultantName?: string;
  provisionalDiagnosis?: string;
  icd10Code?: string;
}

/**
 * Dispatches a verified radiology report to the local HMIS extension gateway.
 */
export async function dispatchReportToHmisGateway(payload: HmisRadiologyReportPayload): Promise<{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}> {
  try {
    const gatewayBase = config.hmisGatewayUrl;
    if (!gatewayBase) return { success: false, error: 'HMIS Gateway is not configured.' };
    const res = await fetch(`${gatewayBase}/api/radiology/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Failed to dispatch report to HMIS Gateway' };
    }
    return { success: true, message: 'Report successfully dispatched to HMIS extension', data: result.data };
  } catch (err: any) {
    return { success: false, error: `HMIS Gateway connection failed (${err.message}). Ensure gateway server is running.` };
  }
}
