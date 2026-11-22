/**
 * Smart Dictation & Medical Vocabulary Biasing Engine
 * Real-time phonetic correction and voice command processing for Cross-Sectional CT/MRI
 */
import { VoiceCommandResult } from '@/types/dictation';

export const MEDICAL_VOCABULARY_BIASING_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // Common speech recognizer mishearings in radiology
  { pattern: /\b(calories\s+motor\s+in\s+the|calories\s+noted\s+in\s+the|calories\s+in\s+the)\b/gi, replacement: 'calculus noted in the' },
  { pattern: /\b(calories\s+motor|calories\s+noted)\b/gi, replacement: 'calculus noted' },
  { pattern: /\b(calories\s+size|size\s+calories)\b/gi, replacement: 'calculus size' },
  { pattern: /\b(calories)\b(?=\s+(?:noted|seen|measuring|measures|in\s+the|at\s+the|within|size|of\s+size|\d+))/gi, replacement: 'calculus' },
  { pattern: /(?<=(?:renal|kidney|gallbladder|gall\s*bladder|gb|urinary|bladder|ureteric|ureter|biliary|duct|cbd|pelvis|calyx|calyceal)\s+)\bcalories\b/gi, replacement: 'calculus' },
  { pattern: /(?<=\d+(?:\.\d+)?\s*(?:mm|cm|x\s*\d+\s*(?:mm|cm))\s+(?:size\s+)?)\bcalories\b/gi, replacement: 'calculus' },
  { pattern: /\b(gall\s+ladder|call\s+ladder|gall\s*ladder)\b/gi, replacement: 'gallbladder' },
  { pattern: /\b(call\s+bladder|gall\s+bladder)\b/gi, replacement: 'gallbladder' },
  { pattern: /\b(urinary\s+ladder)\b/gi, replacement: 'urinary bladder' },
  { pattern: /\b(call\s*stones?)\b/gi, replacement: 'gallstone' },
  { pattern: /\b(liver\s+sis|liver\s+cyst|liver\s+cysts)\b/gi, replacement: 'hepatic cyst' },
  { pattern: /\b(kidney\s+sis|renal\s+sis)\b/gi, replacement: 'renal cyst' },
  { pattern: /\b(hydro\s*nephrosis|hydra\s*nephrosis)\b/gi, replacement: 'hydronephrosis' },
  { pattern: /\b(chole\s*cystitis)\b/gi, replacement: 'cholecystitis' },
  { pattern: /\b(chole\s*lithiasis)\b/gi, replacement: 'cholelithiasis' },
  { pattern: /\b(choledo\s*cho\s*lithiasis|choledo\s*cholithiasis)\b/gi, replacement: 'choledocholithiasis' },
  { pattern: /\b(nephro\s*lithiasis)\b/gi, replacement: 'nephrolithiasis' },
  { pattern: /\b(lymph\s*adenopathy)\b/gi, replacement: 'lymphadenopathy' },
  { pattern: /\b(spleno\s*megaly)\b/gi, replacement: 'splenomegaly' },
  { pattern: /\b(hepato\s*megaly)\b/gi, replacement: 'hepatomegaly' },
  { pattern: /\b(sub\s*dural)\b/gi, replacement: 'subdural' },
  { pattern: /\b(extra\s*dural)\b/gi, replacement: 'extradural' },
  { pattern: /\b(intra\s*axial)\b/gi, replacement: 'intra-axial' },
  { pattern: /\b(extra\s*axial)\b/gi, replacement: 'extra-axial' },
  { pattern: /\b(thecal\s+sack)\b/gi, replacement: 'thecal sac' },
  { pattern: /\b(c\s*\.?\s*p\s*\.?\s*angles?|cp\s*angles?)\b/gi, replacement: 'C.P. angle' },
  { pattern: /\b(c\s*\.?\s*t\s*\.?\s*scan|ct\s*scan)\b/gi, replacement: 'CT scan' },
  { pattern: /\b(m\s*\.?\s*r\s*\.?\s*i|mri\s*scan)\b/gi, replacement: 'MRI' },
  { pattern: /\b(d\s*w\s*i)\b/gi, replacement: 'DWI' },
  { pattern: /\b(a\s*d\s*c)\b/gi, replacement: 'ADC' },
  { pattern: /\b(s\s*w\s*i)\b/gi, replacement: 'SWI' },
  { pattern: /\b(flare|flair\s+sequence)\b/gi, replacement: 'FLAIR' },
];

export function formatMedicalAbbreviations(text: string): string {
  let formatted = text
    .replace(/\b(status\s+post|s\/p)\b/gi, 'S/p')
    .replace(/\b(complaints\s+of|c\/o)\b/gi, 'C/o')
    .replace(/\b(history\s+of|h\/o)\b/gi, 'H/o')
    .replace(/\b(query)\b/gi, '?')
    .replace(/\b(right\s+more\s+than\s+left|r\s*>\s*l)\b/gi, '(R > L)')
    .replace(/\b(left\s+more\s+than\s+right|l\s*>\s*r)\b/gi, '(L > R)');

  // Dimension formatting: "16 by 17 mm" -> "16 x 17 mm", "3.5 by 2.1 by 1.8 cm" -> "3.5 x 2.1 x 1.8 cm"
  formatted = formatted.replace(
    /(\d+(?:\.\d+)?)\s*(?:by|into|x|\*)\s*(\d+(?:\.\d+)?)\s*(?:by|into|x|\*)\s*(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/gi,
    '$1 x $2 x $3 $4'
  );
  formatted = formatted.replace(
    /(\d+(?:\.\d+)?)\s*(?:by|into|x|\*)\s*(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/gi,
    '$1 x $2 $3'
  );

  return formatted;
}

export function applyMedicalBiasing(text: string): string {
  let result = text;
  for (const rule of MEDICAL_VOCABULARY_BIASING_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return formatMedicalAbbreviations(result);
}

export function applyVoicePunctuation(text: string): string {
  if (!text) return '';

  let cleaned = text
    .replace(/\b(full stop|period)\b/gi, '.')
    .replace(/\b(comma)\b/gi, ',')
    .replace(/\b(colon)\b/gi, ':')
    .replace(/\b(semi-colon|semicolon)\b/gi, ';')
    .replace(/\b(question mark)\b/gi, '?')
    .replace(/\b(open bracket|open parenthesis|open paren)\b/gi, ' (')
    .replace(/\b(close bracket|close parenthesis|close paren)\b/gi, ') ')
    .replace(/\b(hyphen|dash)\b/gi, ' - ')
    .replace(/\b(forward slash|slash)\b/gi, '/')
    .replace(/\b(percent|percentage)\b/gi, '%')
    .replace(/\b(plus minus|plus or minus)\b/gi, ' ± ')
    .replace(/\b(greater than)\b/gi, ' > ')
    .replace(/\b(less than)\b/gi, ' < ');

  // Clean spacing around punctuation
  cleaned = cleaned
    .replace(/\s+([,.:;?!%°\)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ');

  return cleaned;
}

export function parseVoiceCommands(rawText: string): VoiceCommandResult {
  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();

  if (/\b(delete last sentence|scratch that|undo last sentence)\b/i.test(lower)) {
    return { action: 'DELETE_LAST_FINDING', remainingText: '' };
  }
  if (/\b(delete last word|scratch last word)\b/i.test(lower)) {
    return { action: 'DELETE_LAST_WORD', remainingText: '' };
  }
  if (/\b(clear all|clear report|start over)\b/i.test(lower)) {
    return { action: 'CLEAR_ALL', remainingText: '' };
  }
  if (/^(start impression|new impression|impression section|goto impression)\b/i.test(lower)) {
    return {
      action: 'DELIMITER_IMPRESSION',
      remainingText: trimmed.replace(/^(start impression|new impression|impression section|goto impression)\s*:?/i, '').trim(),
    };
  }
  if (/^(clinical profile|patient history|clinical history)\b/i.test(lower)) {
    return {
      action: 'DELIMITER_CLINICAL_PROFILE',
      remainingText: trimmed.replace(/^(clinical profile|patient history|clinical history)\s*:?/i, '').trim(),
    };
  }
  if (/^(next line|new line|new paragraph)\b/i.test(lower)) {
    return {
      action: 'DELIMITER_NEW_LINE',
      remainingText: trimmed.replace(/^(next line|new line|new paragraph)\s*/i, '').trim(),
    };
  }

  return {
    action: 'NONE',
    remainingText: applyVoicePunctuation(applyMedicalBiasing(trimmed)),
  };
}
