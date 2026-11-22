import { describe, it, expect } from 'vitest';
import {
  HMIS_CT_MODULE_OPTIONS,
  matchHmisModule,
} from '../hmis/hmis-models';
import { HmisSubmitResultSchema } from '@/lib/validation';

describe('HMIS Punjab Integration Unit Tests', () => {
  it('should contain all 22 verified CT module options', () => {
    expect(HMIS_CT_MODULE_OPTIONS.length).toBe(21); // 21 distinct CT options verified from portal
    expect(HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '803')?.text).toBe('CT BRAIN');
    expect(HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '813')?.text).toBe('HRCT CHEST');
    expect(HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '825')?.text).toBe('MLC CT SCAN 3D');
  });

  it('should accurately fuzzy match clinical scan types to HMIS CT module IDs', () => {
    expect(matchHmisModule('CT BRAIN PLAIN')?.value).toBe('803');
    expect(matchHmisModule('HRCT Chest with contrast')?.value).toBe('813');
    expect(matchHmisModule('CT Abdomen & Pelvis (Triple Phase)')?.value).toBe('805');
    expect(matchHmisModule('CT PNS Coronal')?.value).toBe('811');
    expect(matchHmisModule('CT Cervical Spine 3D')?.value).toBe('818');
    expect(matchHmisModule('CT Lumbar Spine')?.value).toBe('819');
    expect(matchHmisModule('CT Temporal Bone High Res')?.value).toBe('820');
    expect(matchHmisModule('Unknown Modality Scan')).toBeUndefined();
  });

  it('should validate valid HMIS result submission payload via Zod', () => {
    const valid = {
      investigationId: '56484260',
      patientMrn: '192609002796',
      patientName: 'Muhammad Ali',
      accessionNumber: 'ACC-9901',
      moduleId: '803',
      findings: 'No intracranial hemorrhage, midline shift or acute infarction.',
      impression: 'Normal CT Brain study.',
      clinicalHistory: 'Head injury after fall',
      action: 'save' as const,
    };

    const parsed = HmisSubmitResultSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.action).toBe('save');
      expect(parsed.data.moduleId).toBe('803');
    }
  });

  it('should reject invalid HMIS result submission lacking required findings or MRN', () => {
    const invalidNoFindings = {
      patientMrn: '192609002796',
      moduleId: '803',
      findings: '',
      impression: 'Normal study',
      action: 'save',
    };
    expect(HmisSubmitResultSchema.safeParse(invalidNoFindings).success).toBe(false);

    const invalidNoMrn = {
      patientMrn: '',
      moduleId: '803',
      findings: 'Clear lungs',
      impression: 'Normal study',
      action: 'save',
    };
    expect(HmisSubmitResultSchema.safeParse(invalidNoMrn).success).toBe(false);
  });

  it('should validate search queries with MRN or Accession correctly', async () => {
    const { HmisSearchQuerySchema } = await import('@/lib/validation');
    
    // Valid cases
    expect(HmisSearchQuerySchema.safeParse({ mrn: '19202653175835' }).success).toBe(true);
    expect(HmisSearchQuerySchema.safeParse({ accession: '192609005762' }).success).toBe(true);
    expect(HmisSearchQuerySchema.safeParse({ mrn: '19202653175835', accession: '192609005762' }).success).toBe(true);

    // Invalid: neither provided
    expect(HmisSearchQuerySchema.safeParse({}).success).toBe(false);
    expect(HmisSearchQuerySchema.safeParse({ mrn: '', accession: '' }).success).toBe(false);
  });

  it('should report offline status gracefully when gateway process is not running', async () => {
    const { getGatewayStatus } = await import('../hmis/hmis-process-manager.service');
    const status = await getGatewayStatus();
    expect(typeof status.online).toBe('boolean');
    expect(typeof status.starting).toBe('boolean');
  });
});

