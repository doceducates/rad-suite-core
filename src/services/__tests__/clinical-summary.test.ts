import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractDiagnosisHighlight } from '@/lib/clinical-summary';
import { generateAiDiagnosisHighlight } from '@/services/ai-clinical-summary.service';
import * as aiRouter from '@/services/ai-router.service';

describe('Clinical Diagnosis Highlight & Summary Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractDiagnosisHighlight (Deterministic Saba Parser)', () => {
    it('extracts primary finding from Saba-standard HTML ordered lists', () => {
      const html = `
        <ol>
          <li><strong>L4-L5 left paracentral disc protrusion</strong> causing moderate spinal canal stenosis and thecal sac compression.</li>
          <li>L5-S1 diffuse disc bulge without significant neural impingement.</li>
        </ol>
      `;
      const result = extractDiagnosisHighlight(html);
      expect(result).toBe('L4-L5 left paracentral disc protrusion');
    });

    it('extracts primary finding from unordered lists with bullet markers', () => {
      const html = `
        <ul>
          <li>• Acute right MCA territorial ischemic infarct with mild mass effect.</li>
          <li>• Chronic small vessel ischemic changes.</li>
        </ul>
      `;
      const result = extractDiagnosisHighlight(html);
      expect(result).toBe('Acute right MCA territorial ischemic infarct');
    });

    it('extracts primary finding from paragraph tags with numbering prefixes', () => {
      const html = `
        <p>1. Acute appendicitis with periappendiceal fat stranding and wall thickening.</p>
        <p>2. Minimal free fluid in the right iliac fossa.</p>
      `;
      const result = extractDiagnosisHighlight(html);
      expect(result).toBe('Acute appendicitis');
    });

    it('extracts primary finding from plain multiline text with numbering', () => {
      const plain = `1. Acute intracranial hemorrhage in the right basal ganglia.\n2. Surrounding vasogenic edema.`;
      const result = extractDiagnosisHighlight(plain);
      expect(result).toBe('Acute intracranial hemorrhage in the right basal ganglia');
    });

    it('extracts and cleans bullet markers, prunes parentheticals and secondary clauses', () => {
      const plain = `- Left distal ureteric calculus (6 mm) with upstream hydroureteronephrosis.`;
      const result = extractDiagnosisHighlight(plain);
      expect(result).toBe('Left distal ureteric calculus');
    });

    it('handles lumbar spine multi-level bulges concisely (real workstation case)', () => {
      const text = `L4-L5 and L5-S1 diffuse disc bulges with bilateral lateral recess narrowing (more pronounced on the left) and neural exit foramina compromise`;
      const result = extractDiagnosisHighlight(text);
      expect(result).toBe('L4-L5 and L5-S1 diffuse disc bulges');
    });

    it('strips redundant prefixes like "Impression:" and prunes "without" secondary clauses', () => {
      const text = `Impression: Normal CT brain without acute territorial infarction or intracranial hemorrhage.`;
      const result = extractDiagnosisHighlight(text);
      expect(result).toBe('Normal CT brain');
    });

    it('decodes HTML entities properly (&nbsp;, &amp;, &quot;, &#39;)', () => {
      const html = `<p>1.&nbsp;Severe&nbsp;L3-L4&nbsp;&amp;&nbsp;L4-L5&nbsp;canal&nbsp;stenosis&nbsp;with&nbsp;&quot;hourglass&quot;&nbsp;deformity.</p>`;
      const result = extractDiagnosisHighlight(html);
      expect(result).toBe('Severe L3-L4 & L4-L5 canal stenosis');
    });

    it('truncates cleanly at word boundaries with ellipsis when text exceeds ~55 characters', () => {
      const longText = `Large destructive osteolytic mass involving the sacrum and bilateral iliac bones with extensive soft tissue component extending into the pelvic cavity.`;
      const result = extractDiagnosisHighlight(longText);

      expect(result.length).toBeLessThanOrEqual(60);
      expect(result.endsWith('...')).toBe(true);
      expect(result.startsWith('Large destructive osteolytic mass')).toBe(true);
      // Ensures it does not truncate mid-word
      expect(result).not.toMatch(/\s\.\.\.$/);
    });

    it('returns empty string for empty, whitespace, or invalid inputs', () => {
      expect(extractDiagnosisHighlight('')).toBe('');
      expect(extractDiagnosisHighlight('   ')).toBe('');
      expect(extractDiagnosisHighlight(null as any)).toBe('');
      expect(extractDiagnosisHighlight(undefined as any)).toBe('');
      expect(extractDiagnosisHighlight('<ol><li>   </li></ol>')).toBe('');
    });
  });

  describe('generateAiDiagnosisHighlight (AI Synthesis & Fallback)', () => {
    it('uses AI completion output when available', async () => {
      vi.spyOn(aiRouter, 'callAICompletion').mockResolvedValue('L4-L5 disc extrusion');

      const result = await generateAiDiagnosisHighlight(
        'Extruded disc at L4-L5 with inferior migration.',
        '1. L4-L5 disc extrusion.'
      );

      expect(result).toBe('L4-L5 disc extrusion');
    });

    it('falls back to deterministic extraction when AI call returns empty or fails', async () => {
      vi.spyOn(aiRouter, 'callAICompletion').mockRejectedValue(new Error('AI engine offline'));

      const result = await generateAiDiagnosisHighlight(
        'Findings text',
        '<ol><li>Acute ischemic stroke in left MCA territory.</li></ol>'
      );

      expect(result).toBe('Acute ischemic stroke in left MCA territory');
    });

    it('returns empty string when both findings and impression are empty', async () => {
      const result = await generateAiDiagnosisHighlight('', '');
      expect(result).toBe('');
    });
  });
});
