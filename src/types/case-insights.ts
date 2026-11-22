/**
 * Case Insights & Viva Briefing Type Definitions
 * Pure TypeScript types - safe for Client & Server components.
 */

export interface DifferentialItem {
  diagnosis: string;
  likelihood: 'High' | 'Moderate' | 'Consider';
  rationale: string;
  discriminativeFeatures?: string;
}

export interface VivaBriefing {
  demographics: string;
  hallmarkSigns: string[];
  discriminativeFeatures: string[];
  narrowingQuestions?: string[]; // Targeted questions to ask patient/clinician to narrow differentials
  examinerTraps?: string[];
  guidelinePearl?: string;
}

export interface RecommendedInvestigation {
  type: 'imaging' | 'laboratory' | 'clinical';
  name: string;
  rationale: string;
}

export interface CaseInsightsData {
  primaryDifferential: string;
  differentials: DifferentialItem[];
  vivaBriefing: VivaBriefing;
  recommendedInvestigations: RecommendedInvestigation[];
  narrowingQuestions?: string[];
  generatedAt?: string;
  source?: 'cached' | 'ai' | 'fallback';
}

export interface GenerateCaseInsightsOptions {
  findings: string;
  modality?: string;
  clinicalHistory?: string;
  patientAge?: number | string;
  patientGender?: string;
  studyDescription?: string;
}
