import { describe, it, expect, beforeEach } from 'vitest';
import { matchesAssigned } from '@/services/unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

describe('Workspace User Isolation & Case Attribution', () => {
  const consultantId = 'usr-consultant-123';
  const adminId = 'usr-admin-456';

  const consultantStudy: PacsStudyResult = {
    accessionNumber: 'ACC-CONSULTANT-01',
    patientName: 'Patient Alpha',
    patientMrn: 'MRN-001',
    patientId: 'MRN-001',
    age: 45,
    gender: 'Male',
    modality: 'MR',
    studyDescription: 'MRI Brain',
    studyDate: '2026-10-25',
    numSeries: 4,
    numInstances: 120,
    pacsServerAe: 'LGH_PACS',
    studyInstanceUid: '1.2.840.111',
    source: 'hospital_pacs',
    assignedRadiologistId: consultantId,
  };

  const adminStudy: PacsStudyResult = {
    accessionNumber: 'ACC-ADMIN-02',
    patientName: 'Patient Beta',
    patientMrn: 'MRN-002',
    patientId: 'MRN-002',
    age: 55,
    gender: 'Female',
    modality: 'CT',
    studyDescription: 'CT Chest',
    studyDate: '2026-10-25',
    numSeries: 2,
    numInstances: 80,
    pacsServerAe: 'LGH_PACS',
    studyInstanceUid: '1.2.840.222',
    source: 'hospital_pacs',
    assignedRadiologistId: adminId,
  };

  const unassignedStudy: PacsStudyResult = {
    accessionNumber: 'ACC-UNASSIGNED-03',
    patientName: 'Patient Gamma',
    patientMrn: 'MRN-003',
    patientId: 'MRN-003',
    age: 30,
    gender: 'Male',
    modality: 'CR',
    studyDescription: 'Chest X-Ray',
    studyDate: '2026-10-25',
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'LGH_PACS',
    studyInstanceUid: '1.2.840.333',
    source: 'hospital_pacs',
    assignedRadiologistId: null,
  };

  it('strictly isolates consultant study so it does NOT appear in admin personal workspace', () => {
    // Consultant viewing their own workspace
    const matchesConsultant = matchesAssigned(consultantStudy, 'me', consultantId);
    expect(matchesConsultant).toBe(true);

    // Admin viewing their personal workspace: consultant study must NOT match!
    const matchesAdmin = matchesAssigned(consultantStudy, 'me', adminId);
    expect(matchesAdmin).toBe(false);
  });

  it('strictly isolates admin study so it does NOT appear in consultant personal workspace', () => {
    // Admin viewing their own workspace
    const matchesAdmin = matchesAssigned(adminStudy, 'me', adminId);
    expect(matchesAdmin).toBe(true);

    // Consultant viewing their workspace: admin study must NOT match!
    const matchesConsultant = matchesAssigned(adminStudy, 'me', consultantId);
    expect(matchesConsultant).toBe(false);
  });

  it('never matches "me" if currentUserId is undefined', () => {
    const leakAttempt = matchesAssigned(consultantStudy, 'me', undefined);
    expect(leakAttempt).toBe(false);
  });

  it('allows unassigned studies to be filtered cleanly with "unassigned"', () => {
    expect(matchesAssigned(unassignedStudy, 'unassigned')).toBe(true);
    expect(matchesAssigned(consultantStudy, 'unassigned')).toBe(false);
    expect(matchesAssigned(adminStudy, 'unassigned')).toBe(false);
  });

  it('permits all studies when filterAssigned is "all"', () => {
    expect(matchesAssigned(consultantStudy, 'all')).toBe(true);
    expect(matchesAssigned(adminStudy, 'all')).toBe(true);
    expect(matchesAssigned(unassignedStudy, 'all')).toBe(true);
  });
});
