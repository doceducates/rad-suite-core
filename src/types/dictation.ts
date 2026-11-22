export interface IdentifiedDiscrepancy {
  id: string;
  field: 'findings' | 'impression' | 'technique';
  findingIndex?: number;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  lateralityConflict?: boolean;
  suggestedCorrection?: string;
}

export interface AudioAssessmentFindingInsight {
  findingIndex: number;
  findingTitleOrExcerpt: string;
  uncertaintyScore: number; // 0 (certain) to 100 (high vocal hesitation)
  acousticObservation: string;
  clinicalSignificance: string;
  differentialConsiderations: string[];
  suggestedChatInquiry: string;
}

export interface AudioAssessmentReport {
  overallConfidenceScore: number; // 0 to 100
  estimatedWpm: number;
  speechClarity: 'Exceptional' | 'Crisp & Clear' | 'Good' | 'Moderate / Background Noise' | 'Muffled';
  pacingEvaluation: string;
  acousticHesitationSummary: string;
  keyShadowDifferentials: string[];
  findingInsights: AudioAssessmentFindingInsight[];
  actionableSummary: string;
  assessedAt: string;
}

export interface VoiceCommandResult {
  action:
    | 'DELIMITER_NEW_LINE'
    | 'DELIMITER_IMPRESSION'
    | 'DELIMITER_CLINICAL_PROFILE'
    | 'DELIMITER_TECHNIQUE'
    | 'DELETE_LAST_FINDING'
    | 'DELETE_LAST_WORD'
    | 'CLEAR_ALL'
    | 'SELF_CORRECTION'
    | 'MARK_BOLD'
    | 'NONE';
  remainingText: string;
  description?: string;
  target?: string;
  replacement?: string;
}

export interface DictationState {
  isRecording: boolean;
  transcript: string;
  audioLevel: number;
  hasAudio: boolean;
  error: string | null;
}
