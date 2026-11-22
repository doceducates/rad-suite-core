import { describe, it, expect } from 'vitest';
import {
  applyMedicalBiasing,
  formatMedicalAbbreviations,
  applyVoicePunctuation,
  parseVoiceCommands,
} from '../smart-dictation.service';

describe('Smart Dictation & Medical Biasing Service', () => {
  it('corrects speech recognizer phonetic errors for radiology terms', () => {
    const input = 'calories noted in the right kidney and gall ladder normal with liver sis';
    const output = applyMedicalBiasing(input);
    expect(output).toContain('calculus noted in the right kidney');
    expect(output).toContain('gallbladder');
    expect(output).toContain('hepatic cyst');
  });

  it('corrects thecal sack to thecal sac', () => {
    const input = 'effacement of the anterior thecal sack';
    const output = applyMedicalBiasing(input);
    expect(output).toContain('thecal sac');
  });

  it('formats medical dimensions and abbreviations accurately', () => {
    const text1 = 'status post cholecystectomy measuring 16 by 17 mm';
    const formatted1 = formatMedicalAbbreviations(text1);
    expect(formatted1).toBe('S/p cholecystectomy measuring 16 x 17 mm');

    const text2 = 'mass measuring 3.5 by 2.1 by 1.8 cm with r > l asymmetry';
    const formatted2 = formatMedicalAbbreviations(text2);
    expect(formatted2).toBe('mass measuring 3.5 x 2.1 x 1.8 cm with (R > L) asymmetry');
  });

  it('applies voice punctuation and removes surrounding whitespace', () => {
    const input = 'right kidney calculus full stop gall bladder normal comma no hydronephrosis full stop';
    const biased = applyMedicalBiasing(input);
    const punctuated = applyVoicePunctuation(biased);
    expect(punctuated).toBe('right kidney calculus. gallbladder normal, no hydronephrosis.');
  });

  it('parses voice commands for structural delimiters', () => {
    const cmd1 = parseVoiceCommands('scratch that');
    expect(cmd1.action).toBe('DELETE_LAST_FINDING');

    const cmd2 = parseVoiceCommands('start impression acute non-hemorrhagic infarct full stop');
    expect(cmd2.action).toBe('DELIMITER_IMPRESSION');
    expect(cmd2.remainingText).toContain('acute non-hemorrhagic infarct');

    const cmd3 = parseVoiceCommands('new line next finding');
    expect(cmd3.action).toBe('DELIMITER_NEW_LINE');
  });
});
