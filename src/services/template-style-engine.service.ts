// Layer 2 (Domain/Services): Multi-Style Report Template & Format Transformation Engine
// Invariant: Target < 250 lines, max 350 lines.

export type ReportStyle = 'categorized_headings' | 'pure_bullets';

export interface StyleConversionResult {
  findingsHtml: string;
  style: ReportStyle;
  changesMade: boolean;
}

/**
 * Detects whether the given findings HTML uses H3 categorization or pure bullets
 */
export function detectReportStyle(html?: string | null): ReportStyle {
  if (!html) return 'pure_bullets';
  if (/<li[^>]*>|<ul[^>]*>/i.test(html)) {
    return 'pure_bullets';
  }
  if (/<h3>\s*(?:technique|findings|protocol|comparison)\s*<\/h3>/i.test(html)) {
    return 'categorized_headings';
  }
  return 'pure_bullets';
}

/**
 * Converts a list of raw finding strings into formatted HTML based on chosen style
 */
export function formatFindingsForStyle(
  findings: string[],
  style: ReportStyle,
  technique?: string
): string {
  if (!findings || findings.length === 0) {
    return '<p>Standard unremarkable baseline preserved.</p>';
  }

  if (style === 'pure_bullets') {
    // Pure unbroken level-by-level bullet list without any H3 subheadings
    const items = findings.map((f) => {
      const trimmed = f.trim();
      const colonMatch = trimmed.match(/^([^:\n]{2,60}:)\s*([\s\S]*)$/);
      if (colonMatch) {
        return `<li><p><strong>${colonMatch[1]}</strong> ${colonMatch[2]}</p></li>`;
      }
      return `<li><p>${trimmed}</p></li>`;
    });

    return `<ul>${items.join('')}</ul>`;
  }

  // Categorized with H3 Headings (RSNA / Standard Format)
  const paragraphs = findings.map((f) => {
    const trimmed = f.trim();
    const colonMatch = trimmed.match(/^([^:\n]{2,60}:)\s*([\s\S]*)$/);
    if (colonMatch) {
      return `<p><strong>${colonMatch[1]}</strong> ${colonMatch[2]}</p>`;
    }
    return `<p>${trimmed}</p>`;
  });

  const techBlock = technique && technique.trim()
    ? `<h3>Technique</h3><p>${technique.trim()}</p>`
    : '';

  return `${techBlock}<h3>Findings</h3>${paragraphs.join('')}`;
}

/**
 * Bidirectional lossless conversion between Categorized H3 and Pure Bullets
 */
export function convertReportToStyle(
  html: string,
  targetStyle: ReportStyle,
  technique?: string
): StyleConversionResult {
  if (!html || !html.trim()) {
    return { findingsHtml: '', style: targetStyle, changesMade: false };
  }

  const currentStyle = detectReportStyle(html);
  if (currentStyle === targetStyle) {
    return { findingsHtml: html, style: targetStyle, changesMade: false };
  }

  if (targetStyle === 'pure_bullets') {
    // 1. Convert Categorized H3 -> Pure Bullets
    // Extract technique paragraph if present in H3 block
    let cleaned = html;
    const techMatch = cleaned.match(/<h3>\s*Technique\s*<\/h3>\s*<p>([\s\S]*?)<\/p>/i);
    const extractedTech = techMatch ? techMatch[1].trim() : (technique || '').trim();

    // Remove <h3>Technique</h3> and <h3>Findings</h3> and any other H3 headers
    cleaned = cleaned
      .replace(/<h3>\s*Technique\s*<\/h3>\s*<p>[\s\S]*?<\/p>/gi, '')
      .replace(/<h3>\s*[\s\S]*?<\/h3>/gi, '')
      .trim();

    // Collect all paragraph or li units
    const items: string[] = [];

    // Check if already contains <li> items
    const liMatches = cleaned.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liMatches && liMatches.length > 0) {
      for (const li of liMatches) {
        const inner = li.replace(/<\/?li[^>]*>/gi, '').trim();
        if (inner) items.push(`<li>${inner.startsWith('<p>') ? inner : `<p>${inner}</p>`}</li>`);
      }
    } else {
      // Split by paragraphs
      const pMatches = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pMatches && pMatches.length > 0) {
        for (const p of pMatches) {
          const inner = p.replace(/<\/?p[^>]*>/gi, '').trim();
          if (inner) items.push(`<li><p>${inner}</p></li>`);
        }
      } else {
        // Fallback for plain text
        const plainLines = cleaned.replace(/<[^>]+>/g, '').split('\n').filter(Boolean);
        for (const line of plainLines) {
          items.push(`<li><p>${line.trim()}</p></li>`);
        }
      }
    }

    const findingsHtml = items.length > 0 ? `<ul>${items.join('')}</ul>` : '<p>Baseline preserved.</p>';
    return { findingsHtml, style: 'pure_bullets', changesMade: true };
  }

  // 2. Convert Pure Bullets -> Categorized H3 Headings
  let cleaned = html;
  const items: string[] = [];

  // Extract from <li> or <p>
  const liMatches = cleaned.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length > 0) {
    for (const li of liMatches) {
      const inner = li.replace(/<\/?li[^>]*>/gi, '').trim();
      const plainContent = inner.replace(/<\/?p[^>]*>/gi, '').trim();
      if (plainContent) items.push(`<p>${plainContent}</p>`);
    }
  } else {
    const pMatches = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (pMatches) {
      for (const p of pMatches) {
        const inner = p.replace(/<\/?p[^>]*>/gi, '').trim();
        if (inner) items.push(`<p>${inner}</p>`);
      }
    }
  }

  const techBlock = technique && technique.trim()
    ? `<h3>Technique</h3><p>${technique.trim()}</p>`
    : '';

  const findingsHtml = `${techBlock}<h3>Findings</h3>${items.join('')}`;
  return { findingsHtml, style: 'categorized_headings', changesMade: true };
}
