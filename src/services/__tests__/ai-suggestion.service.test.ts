import { describe, it, expect } from 'vitest';
import {
  generateReportSuggestion,
  heuristicSuggestionFallback,
} from '../ai-suggestion.service';

describe('AI Suggestion Service (Layer 2 Domain)', () => {
  it('falls back gracefully to offline heuristic for gallbladder keywords', () => {
    const res = heuristicSuggestionFallback({
      draftText: 'gb: 4mm stone',
      modality: 'CT',
      activeSection: 'findings',
    });

    expect(res.category).toBe('structured_finding');
    expect(res.matchedOrgan).toBe('Gallbladder');
    expect(res.suggestion).toContain('gallbladder');
  });

  it('generates impression-oriented suggestions for active impression section', () => {
    const res = heuristicSuggestionFallback({
      draftText: 'calculus in gb',
      modality: 'US',
      activeSection: 'impression',
    });

    expect(res.category).toBe('impression');
    expect(res.suggestion).toContain('1.');
  });

  it('handles general survey completion when text has no specific organ keyword', async () => {
    const res = await generateReportSuggestion({
      draftText: 'unremarkable scan',
      modality: 'CT',
    });

    expect(res.suggestion).toBeDefined();
    expect(res.suggestion.length).toBeGreaterThan(10);
  });
});
