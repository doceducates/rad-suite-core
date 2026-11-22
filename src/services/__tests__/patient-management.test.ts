import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createManualPatientAndStudy,
  updatePatientAndStudyDetails,
  inferBodyPart,
} from '../patient-management.service';
import { db } from '@/db';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('PatientManagementService - Manual Entry & Editing Suite', () => {
  const mockUser = {
    id: 'user-doc-1',
    name: 'Dr. Radiologist',
    role: 'radiologist',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('inferBodyPart', () => {
    it('infers correct body part from descriptions', () => {
      expect(inferBodyPart('MRI Lumbar Spine with Contrast')).toBe('LS Spine');
      expect(inferBodyPart('CT Brain Plain Stroke Protocol')).toBe('Brain');
      expect(inferBodyPart('High Resolution Chest CT HRCT')).toBe('Chest');
      expect(inferBodyPart('Ultrasound Whole Abdomen and Pelvis')).toBe('Abdomen');
      expect(inferBodyPart('MRI Right Knee Joint')).toBe('MSK');
      expect(inferBodyPart('MRI Cervical Spine')).toBe('Cervical Spine');
      expect(inferBodyPart('MRI Whole Spine Screening')).toBe('Whole Spine');
    });
  });

  describe('createManualPatientAndStudy', () => {
    it('throws error when NEITHER MR number nor Accession number is provided', async () => {
      await expect(
        createManualPatientAndStudy(
          {
            patientName: 'Test Patient',
            age: 50,
            gender: 'Male',
            modality: 'CT',
            studyDescription: 'CT Brain',
          },
          mockUser
        )
      ).rejects.toThrow('At least one of MR Number or Accession Number is mandatory.');
    });

    it('creates case when MR number is provided and auto-generates accession number', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // no existing study or patient
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      vi.spyOn(db, 'select').mockImplementation(mockSelect as any);
      vi.spyOn(db, 'insert').mockImplementation(mockInsert as any);

      const res = await createManualPatientAndStudy(
        {
          patientName: 'Ali Raza',
          patientMrn: 'MRN-998877',
          age: 42,
          gender: 'Male',
          modality: 'CT',
          studyDescription: 'CT Brain Plain',
          department: 'ER',
          priority: 'stat',
        },
        mockUser
      );

      expect(res.success).toBe(true);
      expect(res.accessionNumber).toMatch(/^MAN-/);
      expect(res.study.patientName).toBe('Ali Raza');
      expect(res.study.patientMrn).toBe('MRN-998877');
      expect(res.study.priority).toBe('stat');
      expect(res.study.department).toBe('ER');
      expect(mockInsert).toHaveBeenCalledTimes(3); // patients, studies, reports
    });

    it('creates case when Accession number is provided and auto-generates MR number', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      vi.spyOn(db, 'select').mockImplementation(mockSelect as any);
      vi.spyOn(db, 'insert').mockImplementation(mockInsert as any);

      const res = await createManualPatientAndStudy(
        {
          patientName: 'Fatima Bibi',
          accessionNumber: 'ACC-CUSTOM-001',
          age: 28,
          gender: 'Female',
          modality: 'MRI',
          studyDescription: 'MRI Lumbar Spine',
          department: 'OPD',
          referringDoctor: 'Dr. Usman (Neurosurgery)',
        },
        mockUser
      );

      expect(res.success).toBe(true);
      expect(res.accessionNumber).toBe('ACC-CUSTOM-001');
      expect(res.study.patientMrn).toBe('MRN-ACC-CUSTOM-001');
      expect(res.study.referringDoctor).toBe('Dr. Usman (Neurosurgery)');
    });
  });

  describe('updatePatientAndStudyDetails', () => {
    it('updates patient name, MRN, and study attributes successfully', async () => {
      const existingStudy = {
        id: 'study-123',
        patientId: 'patient-123',
        accessionNumber: 'ACC-ORIGINAL',
        modality: 'CT',
        scanType: 'CT Chest',
        priority: 'routine',
        department: 'OPD',
        referringDoctor: 'Dr. Old',
      };

      const existingPatient = {
        id: 'patient-123',
        fullName: 'Original Name',
        mrNumber: 'MRN-ORIGINAL',
        age: 35,
        gender: 'Male',
        dob: '1991-01-01',
      };

      const updatedStudy = {
        ...existingStudy,
        scanType: 'CT Chest CECT with Contrast',
        priority: 'urgent',
        department: 'ER',
        referringDoctor: 'Dr. New',
      };

      const updatedPatient = {
        ...existingPatient,
        fullName: 'Corrected Name',
        age: 36,
      };

      // Mock lookup
      vi.spyOn(db, 'select')
        // 1. Study lookup
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([existingStudy]),
            }),
          }),
        } as any)
        // 2. Patient lookup
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([existingPatient]),
            }),
          }),
        } as any)
        // 3. Re-fetch fresh study
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([updatedStudy]),
            }),
          }),
        } as any)
        // 4. Re-fetch fresh patient
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([updatedPatient]),
            }),
          }),
        } as any);

      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      });
      vi.spyOn(db, 'update').mockReturnValue({ set: mockSet } as any);

      const res = await updatePatientAndStudyDetails(
        'ACC-ORIGINAL',
        {
          patientName: 'Corrected Name',
          age: 36,
          studyDescription: 'CT Chest CECT with Contrast',
          priority: 'urgent',
          department: 'ER',
          referringDoctor: 'Dr. New',
        },
        mockUser
      );

      expect(res.success).toBe(true);
      expect(res.study.patientName).toBe('Corrected Name');
      expect(res.study.priority).toBe('urgent');
      expect(res.study.department).toBe('ER');
      expect(mockSet).toHaveBeenCalledTimes(2); // patients and studies
    });

    it('rejects update if accession conflicts with an existing study', async () => {
      const existingStudy = {
        id: 'study-123',
        patientId: 'patient-123',
        accessionNumber: 'ACC-ORIGINAL',
      };
      const existingPatient = {
        id: 'patient-123',
        fullName: 'Original Name',
        mrNumber: 'MRN-ORIGINAL',
      };
      const conflictingStudy = {
        id: 'study-456',
        accessionNumber: 'ACC-CONFLICT',
      };

      vi.spyOn(db, 'select')
        // 1. Study lookup
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([existingStudy]),
            }),
          }),
        } as any)
        // 2. Patient lookup
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([existingPatient]),
            }),
          }),
        } as any)
        // 3. Conflict lookup
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([conflictingStudy]),
            }),
          }),
        } as any);

      await expect(
        updatePatientAndStudyDetails(
          'ACC-ORIGINAL',
          { accessionNumber: 'ACC-CONFLICT' },
          mockUser
        )
      ).rejects.toThrow(/Accession number "ACC-CONFLICT" is already in use by another study/);
    });
  });
});
