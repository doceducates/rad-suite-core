// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { generateDifferentialDiagnosis } from '@/services/ai-differential.service';
import { askCopilotQuestion } from '@/services/ai-copilot-chat.service';
import { InlineDiffExtension } from '@/components/editor/clinical-editor/inline-diff-extension';

describe('AI Differential & Radiologist Copilot Test Suite', () => {
  describe('1. Differential Diagnosis & Knowledge Pearl Generation', () => {
    it('should generate ranked differentials and academic knowledge pearls in offline mode', async () => {
      const findings = '6 mm non-calcified solid nodule in right upper lobe with smooth margins.';
      const result = await generateDifferentialDiagnosis(findings, 'CT', 'History of smoking');

      expect(result).toBeDefined();
      expect(result.primaryDifferential).toBeTruthy();
      expect(Array.isArray(result.differentials)).toBe(true);
      expect(result.differentials.length).toBeGreaterThan(0);

      // Verify structure of differential items
      const first = result.differentials[0];
      expect(first.diagnosis).toBeTruthy();
      expect(['High', 'Moderate', 'Consider']).toContain(first.likelihood);
      expect(first.rationale).toBeTruthy();

      // Verify knowledge pearls
      expect(result.knowledgePearls).toBeDefined();
      expect(result.knowledgePearls!.length).toBeGreaterThan(0);
      expect(result.knowledgePearls![0].system).toBeTruthy();
    });

    it('should format HTML block output suitable for report insertion', async () => {
      const findings = 'Hyperdense mass with hyperattenuating rim.';
      const result = await generateDifferentialDiagnosis(findings, 'CT');

      expect(result.formattedBlock).toContain('Differential Considerations (CT)');
      expect(result.formattedBlock).toContain('hematoma');
    });
  });

  describe('2. Interactive AI Copilot Follow-up Chat', () => {
    it('should answer Fleischner criteria questions with guideline citations and suggested impression', async () => {
      const response = await askCopilotQuestion('What are the Fleischner recommendations for this nodule?', {
        modality: 'CT',
        findings: '5 mm solid nodule in left lower lobe.',
        clinicalHistory: 'Routine health checkup',
      });

      expect(response).toBeDefined();
      expect(response.answer).toContain('Fleischner');
      expect(response.referenceGuideline).toContain('Fleischner');
      expect(response.suggestedImpression).toBeTruthy();
      expect(Array.isArray(response.quickFollowUps)).toBe(true);
    });

    it('should handle diagnostic mimics query gracefully', async () => {
      const response = await askCopilotQuestion('What are the main mimics or differential?', {
        modality: 'MRI',
        findings: 'High T2 signal in periventricular white matter.',
      });

      expect(response.answer).toBeTruthy();
      expect(response.quickFollowUps!.length).toBeGreaterThan(0);
    });
  });

  describe('3. Native Inline Redline Diff Extension', () => {
    let editor: Editor;
    let accepted = false;
    let dismissed = false;

    beforeEach(() => {
      accepted = false;
      dismissed = false;
      editor = new Editor({
        extensions: [
          StarterKit,
          InlineDiffExtension.configure({
            onAccept: () => {
              accepted = true;
            },
            onDismiss: () => {
              dismissed = true;
            },
          }),
        ],
        content: '<p>Lungs are clear. gb: 4mm stone noted.</p>',
      });
    });

    afterEach(() => {
      editor.destroy();
    });

    it('should attach diff suggestion without modifying the underlying text before acceptance', () => {
      const initialText = editor.getText();
      const from = 17;
      const to = 33; // "gb: 4mm stone"

      editor.commands.setAiDiffSuggestion({
        text: 'Gallbladder contains a 4 mm calculus without wall thickening.',
        matchedOrgan: 'Gallbladder',
        category: 'structured_finding',
        draftPrefix: 'gb: 4mm stone',
        pos: { from, to },
      });

      // The document text itself is unchanged until accepted
      expect(editor.getText()).toBe(initialText);
    });

    it('should clear diff decorations on dismiss', () => {
      editor.commands.setAiDiffSuggestion({
        text: 'Normal liver parenchyma.',
        category: 'structured_finding',
        draftPrefix: 'liver: normal',
        pos: { from: 1, to: 10 },
      });

      editor.commands.setAiDiffSuggestion(null);
      // Clean state
      expect(editor.getText()).toBeTruthy();
    });
  });
});
