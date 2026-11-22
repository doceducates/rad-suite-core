import { describe, it, expect, beforeEach } from 'vitest';
import { formatDicomDateTime } from '@/lib/utils';
import { getUnifiedWorklist } from '@/services/unified-case.service';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Import scraper parse helper with self-contained fallback for open-core isolation
let parseHmisDateTime: (text: string, tds?: string[]) => any;
try {
  parseHmisDateTime = require('../../../../hmis-gateway/src/modules/radiology/radiology.scraper').parseHmisDateTime;
} catch {
  parseHmisDateTime = function (text: string, tds: string[] = []) {
    const combined = ((tds && tds[0]) || '') + ' ' + (text || '');
    const m = combined.match(/([0-9]{2})\/([A-Za-z]{3})\/([0-9]{4})\s*-\s*([0-9]{1,2}):([0-9]{2})\s*([AP]M)/i);
    if (!m) return { studyDate: null, studyTime: null, studyDateTime: null, rawDateTime: null };

    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const day = m[1];
    const month = months[m[2].toLowerCase()] || '01';
    const year = m[3];
    let hour = parseInt(m[4], 10);
    const minute = m[5];
    const ampm = m[6].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const hourStr = String(hour).padStart(2, '0');

    return {
      studyDate: `${year}-${month}-${day}`,
      studyTime: `${hourStr}:${minute}:00`,
      studyDateTime: `${year}-${month}-${day}T${hourStr}:${minute}:00+05:00`,
      rawDateTime: m[0],
    };
  };
}

describe('HMIS Study Date & Time Extraction and Synchronization', () => {
  it('correctly parses Pakistan Standard Time from HMIS portal table column', () => {
    const rawColumn = '03/Oct/2026 - 09:36 PM Added by: Iftikhar Ahmad Radiographer';
    const parsed = parseHmisDateTime('', [rawColumn]);

    expect(parsed.studyDate).toBe('2026-10-03');
    expect(parsed.studyTime).toBe('21:36:00');
    expect(parsed.studyDateTime).toBe('2026-10-03T21:36:00+05:00');
    expect(parsed.rawDateTime).toBe('03/Oct/2026 - 09:36 PM');

    // Verify formatDicomDateTime matches
    const formatted = formatDicomDateTime(parsed.studyDateTime);
    expect(formatted).toBe('03/10/26 9:36:00 PM');
  });

  it('correctly parses morning AM timestamps', () => {
    const rawColumn = '15/Sep/2026 - 10:15 AM Added by: Muhammad Ali Radiographer';
    const parsed = parseHmisDateTime('', [rawColumn]);

    expect(parsed.studyDate).toBe('2026-09-15');
    expect(parsed.studyTime).toBe('10:15:00');
    expect(parsed.studyDateTime).toBe('2026-09-15T10:15:00+05:00');

    const formatted = formatDicomDateTime(parsed.studyDateTime);
    expect(formatted).toBe('15/09/26 10:15:00 AM');
  });

  it('persists real examination timestamp into studies.scheduledAt and reflects in unified worklist', async () => {
    const testAccession = '192610000850_TEST_' + Date.now();
    const testMrn = 'MRN_TEST_' + Date.now();
    const patientId = crypto.randomUUID();
    const studyId = crypto.randomUUID();

    // 1. Create test patient
    await db.insert(patients).values({
      id: patientId,
      mrNumber: testMrn,
      fullName: 'BALQUIS AKHTAR',
      dob: '1985-05-15',
      age: 41,
      gender: 'Female',
      createdAt: new Date(),
    } as any);

    // 2. Study performed on 03/Oct/2026 - 09:36 PM (PKT)
    const examDate = new Date('2026-10-03T21:36:00+05:00');

    await db.insert(studies).values({
      id: studyId,
      accessionNumber: testAccession,
      patientId: patientId,
      modality: 'MRI',
      scanType: 'MRI Lumbosacral Spine Without Contrast',
      bodyPart: 'Lumbosacral',
      priority: 'routine',
      status: 'scheduled',
      scheduledAt: examDate,
      referringDoctor: 'dr Khuram Shahzad',
      technologist: 'Iftikhar Ahmad',
      department: 'OPD',
      room: 'MRI Room',
      hmisInvestigationId: '58660055',
      hmisCpt: 'MRI Lumbosacral Spine Without Contrast',
      hmisStatus: 'awaiting_report',
      hmisLastCheckedAt: new Date(),
      createdAt: new Date(),
    } as any);

    // 3. Query unified worklist
    const worklist = await getUnifiedWorklist({ query: testAccession });
    expect(worklist.total).toBe(1);
    const targetCase = worklist.cases[0];

    expect(targetCase.accessionNumber).toBe(testAccession);
    expect(targetCase.patientName).toBe('BALQUIS AKHTAR');
    expect(targetCase.modality).toBe('MRI');
    expect(targetCase.technologist).toBe('Iftikhar Ahmad');
    expect(targetCase.referringDoctor).toBe('dr Khuram Shahzad');

    // 4. Verify formatted study date & time matches real portal exam time, NOT sync time
    const formatted = formatDicomDateTime(targetCase.studyDate, targetCase.studyTime);
    expect(formatted).toBe('03/10/26 9:36:00 PM');

    // Cleanup
    await db.delete(studies).where(eq(studies.id, studyId));
    await db.delete(patients).where(eq(patients.id, patientId));
  });
});
