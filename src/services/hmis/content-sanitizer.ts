/**
 * HMIS Content Sanitizer & Read-Back Verification Helper
 * Pure functions for cleaning clinical text and verifying persistence.
 */

/**
 * Strips redundant section headers that cause duplicate headings on official HMIS PDFs.
 */
export function stripDuplicateHeadings(text: string, section: 'history' | 'report' | 'impression'): string {
  if (!text) return '';
  let cleaned = text.trim();

  if (section === 'history') {
    // Remove leading <p><strong>HISTORY:?</strong></p> or raw HISTORY: / CLINICAL HISTORY:
    cleaned = cleaned.replace(/^(<p>)?(<strong>)?(clinical\s+history|history)\s*:?(<\/strong>)?(<\/p>)?\s*(<br\s*\/?>)?/i, '');
  } else if (section === 'impression') {
    // Remove leading <p><strong>IMPRESSION:?</strong></p> or raw IMPRESSION:
    cleaned = cleaned.replace(/^(<p>)?(<strong>)?(diagnostic\s+impression|impression)\s*:?(<\/strong>)?(<\/p>)?\s*(<br\s*\/?>)?/i, '');
  } else if (section === 'report') {
    // Keep findings clean while removing redundant outer wrapping
    cleaned = cleaned.replace(/^(<p>)?(<strong>)?(report|findings|diagnostic\s+findings)\s*:?(<\/strong>)?(<\/p>)?\s*(<br\s*\/?>)?/i, '');
  }

  return cleaned.trim();
}

/**
 * Normalizes HTML/rich-text down to clean canonical plain text for robust equality comparison.
 */
export function normalizeHtmlForComparison(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Compares intended report text with actual text read back from the HMIS portal.
 */
export function compareHmisContent(
  intended: string,
  actual: string
): { matches: boolean; similarity: number; intendedNorm: string; actualNorm: string } {
  const intendedNorm = normalizeHtmlForComparison(intended);
  const actualNorm = normalizeHtmlForComparison(actual);

  if (!intendedNorm && !actualNorm) {
    return { matches: true, similarity: 1, intendedNorm, actualNorm };
  }

  if (!intendedNorm || !actualNorm) {
    return { matches: false, similarity: 0, intendedNorm, actualNorm };
  }

  // Exact normalized match
  if (intendedNorm === actualNorm) {
    return { matches: true, similarity: 1, intendedNorm, actualNorm };
  }

  // Substring containment (HMIS might append attribution footers or boilerplate)
  if (actualNorm.includes(intendedNorm) || intendedNorm.includes(actualNorm)) {
    const ratio = Math.min(intendedNorm.length, actualNorm.length) / Math.max(intendedNorm.length, actualNorm.length);
    if (ratio > 0.7) {
      return { matches: true, similarity: ratio, intendedNorm, actualNorm };
    }
  }

  // Dice coefficient on word tokens
  const wordsA = new Set(intendedNorm.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(actualNorm.split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) {
    return { matches: false, similarity: 0, intendedNorm, actualNorm };
  }

  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++;
  });

  const similarity = (2 * intersection) / (wordsA.size + wordsB.size);
  const matches = similarity >= 0.85;

  return { matches, similarity, intendedNorm, actualNorm };
}
