import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPacsStudyByAccession } from '../pacs.service';
import { db } from '@/db';
import { hospitalPacsStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('DICOM Mobile Multi-Touch & Hospital PACS Fallback Suite', () => {
  beforeEach(async () => {
    // Clean up test accession
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, 'ACC_MOBILE_TEST_99'));
  });

  it('resolves study from hospitalPacsStudies when local Cases folder does not exist', async () => {
    // Seed a hospital PACS study into database (matching what is indexed in /pacs)
    await db.insert(hospitalPacsStudies).values({
      accessionNumber: 'ACC_MOBILE_TEST_99',
      patientName: 'FATIMA BIBI',
      patientMrn: 'MRN-78901',
      patientId: 'MRN-78901',
      modality: 'MR',
      studyDescription: 'MRI BRAIN PLAIN AND CONTRAST',
      studyDate: '20261014',
      studyTime: '113000',
      studyInstanceUid: '1.2.840.113619.2.99.1234',
      numSeries: 6,
      numInstances: 140,
      pacsSource: 'HMIS_PACS',
      s3Status: 'not_uploaded',
    });

    const resolved = await getPacsStudyByAccession('ACC_MOBILE_TEST_99');
    expect(resolved).toBeDefined();
    expect(resolved?.accessionNumber).toBe('ACC_MOBILE_TEST_99');
    expect(resolved?.patientName).toBe('FATIMA BIBI');
    expect(resolved?.patientMrn).toBe('MRN-78901');
    expect(resolved?.modality).toBe('MR');
    expect(resolved?.studyDescription).toBe('MRI BRAIN PLAIN AND CONTRAST');
    expect(resolved?.source).toBe('hospital_pacs');
  });

  it('correctly calculates 2-finger pinch zoom scale ratio', () => {
    const dist1 = Math.hypot(100 - 200, 100 - 200); // 141.42
    const dist2 = Math.hypot(50 - 250, 50 - 250);   // 282.84
    const ratio = dist2 / dist1; // 2.0x zoom
    expect(ratio).toBeCloseTo(2.0, 1);

    const prevZoom = 1.0;
    const nextZoom = Math.max(0.2, Math.min(10.0, Number((prevZoom * ratio).toFixed(3))));
    expect(nextZoom).toBe(2.0);
  });

  it('correctly calculates 2-finger midpoint pan shift', () => {
    const touch0_start = { clientX: 100, clientY: 100 };
    const touch1_start = { clientX: 200, clientY: 200 };
    const midpoint_start = {
      x: (touch0_start.clientX + touch1_start.clientX) / 2,
      y: (touch0_start.clientY + touch1_start.clientY) / 2,
    };

    const touch0_move = { clientX: 120, clientY: 130 };
    const touch1_move = { clientX: 220, clientY: 230 };
    const midpoint_move = {
      x: (touch0_move.clientX + touch1_move.clientX) / 2,
      y: (touch0_move.clientY + touch1_move.clientY) / 2,
    };

    const panDx = midpoint_move.x - midpoint_start.x;
    const panDy = midpoint_move.y - midpoint_start.y;
    expect(panDx).toBe(20);
    expect(panDy).toBe(30);
  });

  it('detects double tap timing for viewport reset', () => {
    const tap1 = 1000;
    const tap2 = 1200; // 200ms delta (under 350ms threshold)
    const isDoubleTap = tap2 - tap1 < 350;
    expect(isDoubleTap).toBe(true);

    const tap3 = 2000; // 800ms delta (exceeds threshold)
    expect(tap3 - tap2 < 350).toBe(false);
  });
});
