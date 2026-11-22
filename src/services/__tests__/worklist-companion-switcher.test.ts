import { describe, it, expect } from 'vitest';
import type { PacsStudyResult } from '@/types/pacs';

describe('Worklist Report Modal Companion Switcher Logic', () => {
  const primaryStudy: PacsStudyResult = {
    studyId: 'std-cervical',
    studyInstanceUid: '1.2.3.4.5',
    accessionNumber: '192611001164',
    patientMrn: '48202416809549',
    patientName: 'M HAYAT',
    patientId: '48202416809549',
    studyDescription: 'MRI Cervical Spine Without Contrast',
    modality: 'MRI',
    status: 'draft',
    priority: 'routine',
    studyDate: '2026-11-05',
    numSeries: 4,
    numInstances: 84,
    age: 45,
    gender: 'Male',
    pacsServerAe: 'LGH_PACS',
    companionStudies: [
      {
        accessionNumber: '192611001162',
        studyDescription: 'MRI Lumbosacral Spine Without Contrast',
        modality: 'MRI',
        status: 'awaiting_report',
      },
    ],
  };

  it('identifies companion studies list including primary study', () => {
    const allStudies = [
      {
        accessionNumber: primaryStudy.accessionNumber,
        studyDescription: primaryStudy.studyDescription,
        modality: primaryStudy.modality,
        status: primaryStudy.status,
      },
      ...(primaryStudy.companionStudies || []),
    ];

    expect(allStudies).toHaveLength(2);
    expect(allStudies[0].accessionNumber).toBe('192611001164');
    expect(allStudies[1].accessionNumber).toBe('192611001162');
  });

  it('switches active study accurately when companion accession is selected', () => {
    const targetAccession = '192611001162';
    const companion = primaryStudy.companionStudies?.find((s) => s.accessionNumber === targetAccession);

    expect(companion).toBeDefined();
    const switchedStudy: PacsStudyResult = {
      ...primaryStudy,
      accessionNumber: companion!.accessionNumber,
      studyDescription: companion!.studyDescription,
      status: (companion!.status as any) || 'draft',
    };

    expect(switchedStudy.accessionNumber).toBe('192611001162');
    expect(switchedStudy.studyDescription).toBe('MRI Lumbosacral Spine Without Contrast');
  });
});
