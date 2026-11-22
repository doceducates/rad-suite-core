/**
 * Gemini AI Compatibility Service
 * Unified adapter that delegates to the centralized ClinicalAiHub.
 * Layer 2 (Domain/Services) - Under 100 lines.
 */

import { ClinicalAiHub, ExtractedHistoryForm } from './clinical-ai-hub.service';
import { IdentifiedDiscrepancy, AudioAssessmentReport } from '@/types/dictation';

export type { ExtractedHistoryForm };

export async function correctAndStructureTranscript(
  rawText: string,
  modality = 'CT'
): Promise<string[]> {
  return ClinicalAiHub.transcribe.cleanAndStructure(rawText, modality);
}

export async function detectReportDiscrepanciesAI(
  findings: string,
  impression: string,
  modality = 'CT'
): Promise<{ discrepancies: IdentifiedDiscrepancy[]; shadowDifferentials: string[] }> {
  return ClinicalAiHub.audit.detectDiscrepancies(findings, impression, modality);
}

export async function assessDictationProsody(
  transcript: string,
  estimatedDurationSec = 30
): Promise<AudioAssessmentReport> {
  return ClinicalAiHub.transcribe.assessProsody(transcript, estimatedDurationSec);
}

export async function extractHistoryFormOCR(
  imageBase64: string
): Promise<ExtractedHistoryForm> {
  return ClinicalAiHub.intake.extractHistoryFormOCR(imageBase64);
}
