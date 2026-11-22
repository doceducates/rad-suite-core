// Layer 2 (Domain/Services): Clinical Diagnosis Highlight & Summary Extraction

/**
 * Decodes common HTML entities to plain text characters
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#8203;/g, '')
    .replace(/&#160;/g, ' ');
}

/**
 * Strips all HTML tags and normalizes whitespace
 */
function stripHtml(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministically extracts the single, primary high-yield clinical diagnosis takeaway
 * from Saba-standard impression HTML or structured plain text.
 *
 * Focuses strictly on the major primary finding (first few words / ~45-50 chars max),
 * pruning secondary subordinate clauses, parenthetical notes, and verbose elaborations
 * to prevent clutter in table columns and WhatsApp handovers.
 */
export function extractDiagnosisHighlight(impressionHtml: string): string {
  if (!impressionHtml || typeof impressionHtml !== 'string') {
    return '';
  }

  const raw = impressionHtml.trim();
  if (!raw) return '';

  let candidate = '';

  // 1. Check for Saba-standard HTML lists (<ol> / <ul> / <li>)
  const liMatches = Array.from(raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
  if (liMatches.length > 0) {
    for (const match of liMatches) {
      const cleaned = stripHtml(match[1]);
      if (cleaned.length > 2) {
        candidate = cleaned;
        break;
      }
    }
  }

  // 2. Check for paragraph tags (<p>...</p>) if no <li> found
  if (!candidate) {
    const pMatches = Array.from(raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
    if (pMatches.length > 0) {
      for (const match of pMatches) {
        const cleaned = stripHtml(match[1]);
        if (cleaned.length > 2) {
          candidate = cleaned;
          break;
        }
      }
    }
  }

  // 3. Plain text / fallback: split on newlines, <br>, or semicolons
  if (!candidate) {
    const lines = raw
      .split(/(?:\r?\n|<br\s*\/?>)+/i)
      .map((line) => stripHtml(line))
      .filter((line) => line.length > 2);

    if (lines.length > 0) {
      candidate = lines[0];
    } else {
      candidate = stripHtml(raw);
    }
  }

  if (!candidate) return '';

  // 4. Remove list numbering or bullet prefixes: "1.", "1)", "1 -", "•", "-", "*", "[1]"
  candidate = candidate
    .replace(/^(\s*[-•*–—]|\s*\d+[\.\)\-:]|\s*\[\s*\d+\s*\])\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 5. Clean up leading redundant headers like "Impression:", "Diagnosis:", "Findings:"
  candidate = candidate.replace(/^(?:impression|diagnosis|conclusion|findings)\s*:\s*/i, '').trim();

  if (!candidate) return '';

  // 6. Strip parenthetical descriptions (e.g. "(more pronounced on the left)", "(6 mm)")
  candidate = candidate.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  // 7. If multiple sentences exist, take only the first sentence
  const firstSentence = candidate.split(/(?<=[.?!])\s+/)[0];
  if (firstSentence && firstSentence.trim().length > 3) {
    candidate = firstSentence.trim();
  }

  // 8. Prune subordinate/qualifying clauses describing secondary consequences
  // e.g. ", causing...", " causing...", ", resulting in...", " with bilateral...", " with marked..."
  const subordinateKeywords =
    /(?:,\s*|\s+)(?:causing|resulting in|leading to|accompanied by|associated with|secondary to|more pronounced|measuring|extending into|extending to|with bilateral|with resultant|with marked|with severe|with moderate|with mild|with evidence of|with underlying|without acute|without evidence)\b.*$/i;

  candidate = candidate.replace(subordinateKeywords, (match, offset) => {
    return offset >= 12 ? '' : match;
  });

  // 9. Prune general "with" or ", with" if the prefix is at least 14 chars & >= 2 words
  candidate = candidate.replace(/(?:,\s*with\b|\s+with\b)\s*.*$/i, (match, offset) => {
    const prefix = candidate.slice(0, offset).trim();
    const words = prefix.split(/\s+/).filter(Boolean);
    return prefix.length >= 14 && words.length >= 2 ? '' : match;
  });

  // 10. Prune comma-separated secondary findings (e.g., "Acute right MCA territory infarct, mild edema")
  // Only if prefix has >= 3 words and >= 18 chars (avoids cutting "L4-L5, L5-S1 ...")
  candidate = candidate.replace(/,\s*[a-zA-Z].*$/, (match, offset) => {
    const prefix = candidate.slice(0, offset).trim();
    const words = prefix.split(/\s+/).filter(Boolean);
    return prefix.length >= 18 && words.length >= 3 ? '' : match;
  });

  // 11. Clean trailing prepositions, conjunctions, and punctuation
  candidate = candidate
    .replace(/\b(?:with|and|or|of|to|in|for|at|by|on|along|from|as|into|the)\s*$/i, '')
    .replace(/[,\s:;.-]+$/, '')
    .trim();

  if (!candidate) return '';

  // 12. Ultra-concise length cap (~55-58 chars max)
  const MAX_CHARS = 58;
  if (candidate.length <= MAX_CHARS) {
    return candidate;
  }

  const truncated = candidate.slice(0, MAX_CHARS);
  const lastSpace = truncated.lastIndexOf(' ');
  const cleanCut = lastSpace > 25 ? truncated.slice(0, lastSpace) : truncated;

  return (
    cleanCut
      .replace(/\b(?:with|and|or|of|to|in|for|at|by|on|along|from|as|into|the)\s*$/i, '')
      .replace(/[,\s:;.-]+$/, '')
      .trim() + '...'
  );
}
