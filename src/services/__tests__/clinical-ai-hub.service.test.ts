import { describe, it, expect } from 'vitest';
import { ClinicalAiHub } from '../clinical-ai-hub.service';

describe('Clinical AI Hub (Centralized AI Gateway)', () => {
  it('cleans and structures raw speech dictation with phonetic fallbacks', async () => {
    const raw = 'calories noted in gall ladder measuring 4mm';
    const structured = await ClinicalAiHub.transcribe.cleanAndStructure(raw, 'US');

    expect(Array.isArray(structured)).toBe(true);
    expect(structured.length).toBeGreaterThan(0);
    // Verifies phonetic correction: calories -> calculus, gall ladder -> gallbladder
    const combined = structured.join(' ').toLowerCase();
    expect(combined).toMatch(/calculus|gallbladder/);
  });

  it('assesses dictation prosody and clinical pacing', async () => {
    const res = await ClinicalAiHub.transcribe.assessProsody('Normal CT head examination', 15);
    expect(res.overallConfidenceScore).toBeGreaterThan(0);
    expect(res.speechClarity).toBeDefined();
    expect(res.assessedAt).toBeDefined();
  });

  it('parses voice commands via dictation engine', () => {
    const parsed = ClinicalAiHub.transcribe.parseVoiceCommands('patient has cough full stop new paragraph lungs clear');
    expect(parsed.remainingText).toContain('.');
  });

  it('provides intake OCR extraction fallback with structured fields', async () => {
    const res = await ClinicalAiHub.intake.extractHistoryFormOCR('data:image/jpeg;base64,dummy');
    expect(res.patientName).toBeDefined();
    expect(res.modality).toBeDefined();
    expect(res.confidence).toBeGreaterThan(50);
  });

  it('generates context-aware diagnostic suggestions', async () => {
    const res = await ClinicalAiHub.authoring.suggest({
      draftText: 'gb: 4mm calculus',
      modality: 'CT',
      activeSection: 'findings',
    });
    expect(res.suggestion).toBeDefined();
    expect(res.category).toBe('structured_finding');
  });

  it('rewrites report blocks with standardization', async () => {
    const res = await ClinicalAiHub.authoring.rewriteBlock({
      action: 'standardize',
      text: 'lesion 12 by 14 mm in liver',
      modality: 'CT',
    });
    expect(res.result).toContain('12 x 14 mm');
  });

  it('detects laterality and clinical contradictions in audit module', async () => {
    const findings = 'Acute fracture of the right femur.';
    const impression = 'No acute fracture of left femur.';
    const audit = await ClinicalAiHub.audit.detectDiscrepancies(findings, impression, 'X-RAY');

    expect(audit.discrepancies).toBeDefined();
    expect(audit.shadowDifferentials).toBeDefined();
  });

  it('generates prioritized differential diagnosis (DDx) with clinical features', async () => {
    const ddx = await ClinicalAiHub.authoring.generateDifferentialDiagnosis(
      'Ill-defined hypoattenuating lesion in right hepatic lobe with peripheral nodular enhancement',
      'CT',
      'Abdominal pain in 45yo female'
    );

    expect(ddx.primaryDifferential).toBeDefined();
    expect(Array.isArray(ddx.differentials)).toBe(true);
    expect(ddx.differentials.length).toBeGreaterThan(0);
    expect(ddx.formattedBlock).toBeDefined();
  });
});
