'use client';

import React from 'react';
import { CaseInsightsView } from './insights/case-insights-view';
import type { DifferentialDiagnosisResult } from '@/services/ai-differential.service';

export interface CopilotDdxTabProps {
  ddxResult?: DifferentialDiagnosisResult | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onInsertImpression: (text: string) => void;
  findings: string;
  impression?: string;
  clinicalHistory?: string;
  modality?: string;
  studyDescription?: string;
  patientAge?: string | number;
  patientGender?: string;
  studyId?: string;
  reportId?: string;
  accessionNumber?: string;
  initialContentJson?: any;
}

export function CopilotDdxTab({
  onInsertImpression,
  findings,
  impression = '',
  clinicalHistory = '',
  modality = 'CT',
  studyDescription,
  patientAge,
  patientGender,
  studyId,
  reportId,
  accessionNumber,
  initialContentJson,
}: CopilotDdxTabProps) {
  return (
    <CaseInsightsView
      findings={findings}
      impression={impression}
      clinicalHistory={clinicalHistory}
      modality={modality}
      studyDescription={studyDescription}
      patientAge={patientAge}
      patientGender={patientGender}
      studyId={studyId}
      reportId={reportId}
      accessionNumber={accessionNumber}
      initialContentJson={initialContentJson}
      onInsertImpression={onInsertImpression}
    />
  );
}
