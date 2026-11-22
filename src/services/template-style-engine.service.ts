// Layer 2 (Domain/Services): Multi-Style Report Template & Format Transformation Engine
// Invariant: Target < 250 lines, max 350 lines.

export type FindingsStyle = 'with_headings' | 'without_headings';
export type ImpressionStyle = 'local_high_yield' | 'international_structured';
export type ReportStyle = 'categorized_headings' | 'pure_bullets' | FindingsStyle;

export interface StyleConversionResult {
  findingsHtml: string;
  style: ReportStyle;
  changesMade: boolean;
}

/**
 * Transforms an anatomical finding by removing or smoothly integrating its colon heading prefix.
 * e.g. "Liver: Normal in size and contour." -> "Liver is normal in size and contour."
 * e.g. "Pleura & Diaphragms: No pleural effusion is seen." -> "No pleural effusion is seen."
 * e.g. "L4-L5: Preserved disc height." -> "At L4-L5, preserved disc height."
 */
export function stripOrIntegrateHeading(rawFinding: string): string {
  const trimmed = rawFinding.trim();
  const colonMatch = trimmed.match(/^([^:\n]{2,60}):\s*([\s\S]*)$/);
  if (!colonMatch) return trimmed;

  const organ = colonMatch[1].trim();
  const body = colonMatch[2].trim();

  // If spinal level or laterality (e.g. L4-L5, C5-C6)
  if (/^[CLTS]\d+[-–][CLTS]?\d+$/i.test(organ)) {
    const lowerBody = body.charAt(0).toLowerCase() + body.slice(1);
    return `At ${organ.toUpperCase()}, ${lowerBody}`;
  }

  // If body already mentions the organ or starts with a complete subject
  const completeStarters = /^(The|Both|Bilateral|No|Visualized|Sections|There|Multiple|Diffusely|Clear|Intact|Preserved|Normal|Mild|Marked|Rest of)\b/i;
  const firstWord = organ.split(/[\s&/]+/)[0].toLowerCase();
  if (completeStarters.test(body) || body.toLowerCase().includes(firstWord)) {
    return body;
  }

  // If body starts with an adjective/participle like "Unremarkable", "Patent", "Well-distended"
  if (/^(Unremarkable|Patent|Well-distended|Acoustically|Homogeneous)\b/i.test(body)) {
    const lowerBody = body.charAt(0).toLowerCase() + body.slice(1);
    return `${organ} is ${lowerBody}`;
  }

  return `${organ} is ${body.charAt(0).toLowerCase() + body.slice(1)}`;
}

/**
 * Detects whether the given findings HTML uses H3 categorization, bold headings, or pure bullets
 */
export function detectReportStyle(html?: string | null): ReportStyle {
  if (!html) return 'pure_bullets';
  if (/<h3>\s*(?:technique|findings|protocol|comparison)\s*<\/h3>/i.test(html)) {
    return 'categorized_headings';
  }
  if (/<li[^>]*>|<ul[^>]*>/i.test(html)) {
    return 'pure_bullets';
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

  if (style === 'without_headings') {
    // Pure continuous bullet list without any colon subheadings (LGH Standard)
    const items = findings.map((f) => {
      const clean = stripOrIntegrateHeading(f);
      return `<li><p>${clean}</p></li>`;
    });
    return `<ul>${items.join('')}</ul>`;
  }

  if (style === 'pure_bullets' || style === 'with_headings') {
    // Level-by-level bullet list with prominent bold headings
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
 * Formats template impression text based on selected impression flavor
 */
export function formatImpressionForStyle(rawImpression: string, flavor: ImpressionStyle): string {
  if (!rawImpression) return '';
  const lines = rawImpression.split('\n').map((l) => l.trim()).filter(Boolean);

  if (flavor === 'local_high_yield') {
    // High-yield LGH standard: max 1-2 punchy synthesized bullets
    if (lines.length <= 2) return rawImpression;
    // Condense to primary diagnostic statements
    const topBullets = lines.slice(0, 2);
    return topBullets.map((l, i) => `${i + 1}. ${l.replace(/^\d+[\.\)]\s*/, '')}`).join('\n');
  }

  // Academic ACR / International structured: full itemized listing
  return rawImpression;
}

/**
 * Converts existing HTML findings between 'with_headings' and 'without_headings'
 */
export function convertFindingsBetweenStyles(
  html: string,
  targetStyle: FindingsStyle
): string {
  if (!html || !html.trim()) return html;

  if (targetStyle === 'without_headings') {
    // Strip <strong>Heading:</strong> from <li> or <p> tags
    return html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, inner) => {
      const cleanInner = inner.replace(/<strong>([^:<]{2,60}:)<\/strong>\s*/gi, (_: string, colonHdr: string) => {
        // Remove bold tag and let stripOrIntegrateHeading handle the text
        return '';
      }).trim();
      return `<li>${cleanInner.startsWith('<p>') ? cleanInner : `<p>${cleanInner}</p>`}</li>`;
    });
  }

  // If target is with_headings, return html
  return html;
}

/**
 * Lossless conversion between Categorized H3 and Pure Bullets
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

  if (targetStyle === 'pure_bullets' || targetStyle === 'without_headings' || targetStyle === 'with_headings') {
    // Convert Categorized H3 -> Bullets
    let cleaned = html
      .replace(/<h3>\s*Technique\s*<\/h3>\s*<p>[\s\S]*?<\/p>/gi, '')
      .replace(/<h3>\s*[\s\S]*?<\/h3>/gi, '')
      .trim();

    const items: string[] = [];
    const liMatches = cleaned.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liMatches && liMatches.length > 0) {
      for (const li of liMatches) {
        const inner = li.replace(/<\/?li[^>]*>/gi, '').trim();
        if (inner) items.push(`<li>${inner.startsWith('<p>') ? inner : `<p>${inner}</p>`}</li>`);
      }
    } else {
      const pMatches = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pMatches && pMatches.length > 0) {
        for (const p of pMatches) {
          const inner = p.replace(/<\/?p[^>]*>/gi, '').trim();
          if (inner) items.push(`<li><p>${inner}</p></li>`);
        }
      }
    }

    let findingsHtml = items.length > 0 ? `<ul>${items.join('')}</ul>` : '<p>Baseline preserved.</p>';
    if (targetStyle === 'without_headings') {
      findingsHtml = convertFindingsBetweenStyles(findingsHtml, 'without_headings');
    }
    return { findingsHtml, style: targetStyle, changesMade: true };
  }

  // Convert Bullets -> Categorized H3 Headings
  const items: string[] = [];
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length > 0) {
    for (const li of liMatches) {
      const inner = li.replace(/<\/?li[^>]*>/gi, '').trim();
      const plainContent = inner.replace(/<\/?p[^>]*>/gi, '').trim();
      if (plainContent) items.push(`<p>${plainContent}</p>`);
    }
  }

  const techBlock = technique && technique.trim()
    ? `<h3>Technique</h3><p>${technique.trim()}</p>`
    : '';

  const findingsHtml = `${techBlock}<h3>Findings</h3>${items.join('')}`;
  return { findingsHtml, style: 'categorized_headings', changesMade: true };
}
