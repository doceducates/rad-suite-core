'use client';

import { useEffect } from 'react';
import {
  startCaseLoadingProgress,
  updateCaseLoadingProgress,
  finishCaseLoadingProgress,
} from '@/services/case-loading-progress.service';

export function useCaseLoadingProgress(
  accession?: string,
  modality = 'Study',
  isReady = true
) {
  useEffect(() => {
    if (!accession || !accession.trim()) return;

    startCaseLoadingProgress(accession.trim(), modality);

    const timer1 = setTimeout(() => {
      updateCaseLoadingProgress(65, 'Buffering series instances & metadata...');
    }, 200);

    const timer2 = setTimeout(() => {
      finishCaseLoadingProgress('Case loaded successfully');
    }, 550);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [accession, modality]);

  useEffect(() => {
    if (isReady && accession) {
      finishCaseLoadingProgress('Case ready for diagnosis');
    }
  }, [isReady, accession]);
}
