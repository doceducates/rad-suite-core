/**
 * Clinical Reporting Text & HTML Formatting Utilities
 * Ensures lossless conversion between rich-text HTML (TipTap) and
 * structured plain text (Textareas, Clipboard, HMIS exports, Word/Notepad).
 */

export interface FullClinicalReportParams {
  patientName: string;
  patientMrn?: string;
  accessionNumber?: string;
  modality: string;
  studyDescription: string;
  studyDate?: string;
  clinicalHistory?: string;
  technique?: string;
  findings: string;
  impression: string;
  authorName?: string;
  authorRole?: string;
  consultantName?: string;
}

/**
 * Decodes standard HTML entities into plain characters
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Converts rich-text clinical HTML into clean, readable, newline-separated plain text.
 * Preserves paragraphs, bullet points, numbers, and headings without eating spaces.
 */
export function htmlToClinicalText(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  const trimmed = html.trim();
  if (!trimmed) return '';

  // If already plain text (no HTML tags detected), return as-is
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return decodeHtmlEntities(trimmed);
  }

  let text = trimmed;

  // 1. Line breaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');

  // 2. Headings
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n$1\n');

  // 3. List items (bullet or numbered)
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1');

  // 4. Blockquotes and callouts
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

  // 5. Paragraphs and divs
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n');

  // 6. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 7. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 8. Normalize spacing: remove trailing spaces per line, collapse 3+ newlines to 2
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Converts an array of finding paragraphs/sentences into rich HTML paragraphs with bold anatomical subheadings.
 */
export function findingsListToHtml(findings: string[]): string {
  return findings
    .map((f) => {
      if (/<[a-z][\s\S]*>/i.test(f)) return `<p>${f}</p>`;
      const colonMatch = f.match(/^([^:\n]{2,60}:)\s*([\s\S]*)$/);
      if (colonMatch) {
        return `<p><strong>${colonMatch[1]}</strong> ${colonMatch[2]}</p>`;
      }
      return `<p>${f}</p>`;
    })
    .join('');
}

/**
 * Converts multiline plain text (e.g. from textarea or clipboard) into clean semantic HTML paragraphs.
 */
export function clinicalTextToHtml(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // If already contains paragraph tags, return trimmed
  if (/<p[^>]*>[\s\S]*<\/p>/i.test(trimmed)) {
    return trimmed;
  }

  // Split on double newlines for paragraphs, or single newlines if no double newlines exist
  const paragraphs = trimmed.split(/\n\s*\n/);

  return paragraphs
    .map((para) => {
      const pClean = para.trim();
      if (!pClean) return '';
      // If starts with an anatomical subheading like "Kidneys: ...", bold the heading
      const colonMatch = pClean.match(/^([^:\n]{2,60}:)\s*([\s\S]*)$/);
      if (colonMatch) {
        const escapedLabel = colonMatch[1]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const escapedBody = colonMatch[2]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />');
        return `<p><strong>${escapedLabel}</strong> ${escapedBody}</p>`;
      }
      // Escape raw HTML entities to prevent injection
      const escaped = pClean
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br />');
      return `<p>${escaped}</p>`;
    })
    .filter(Boolean)
    .join('');
}

/**
 * Builds a standardized, publication-grade plain text report for clipboard copying.
 */
export function formatFullClinicalReport(params: FullClinicalReportParams): string {
  const { technique: splitTech, findings: splitFindings } = splitTechniqueAndFindings(
    params.findings,
    params.technique
  );

  const plainFindings = htmlToClinicalText(splitFindings);
  const cleanImp = params.authorName ? stripAttributionFromText(params.impression) : params.impression;
  const plainImpression = htmlToClinicalText(cleanImp);
  const dateStr = params.studyDate ? new Date(params.studyDate).toLocaleDateString() : new Date().toLocaleDateString();

  const sections: string[] = [
    `==================================================`,
    `RADIOLOGY CONSULTATION REPORT`,
    `==================================================`,
    `PATIENT:     ${params.patientName}`,
    `MRN:         ${params.patientMrn || 'N/A'}`,
  ];

  if (params.accessionNumber?.trim()) {
    sections.push(`ACCESSION:   ${params.accessionNumber.trim()}`);
  }

  sections.push(
    `STUDY:       ${params.studyDescription} (${params.modality})`,
    `DATE:        ${dateStr}`,
  );

  if (params.clinicalHistory?.trim()) {
    sections.push(`CLINICAL HISTORY:\n${params.clinicalHistory.trim()}`);
  }

  if (splitTech?.trim()) {
    sections.push(`TECHNIQUE:\n${splitTech.trim()}`);
  }

  sections.push(`FINDINGS:\n${plainFindings}`);
  sections.push(`IMPRESSION:\n${plainImpression}`);

  const signers: string[] = [];
  if (params.authorName?.trim()) {
    signers.push(`Reporting Radiologist: ${params.authorName} ${params.authorRole ? `(${params.authorRole.toUpperCase()})` : ''}`);
  }
  if (params.consultantName?.trim()) {
    const rawConsultant = params.consultantName.trim();
    const formattedConsultant = /consultant|fcps|mcps|frcr/i.test(rawConsultant)
      ? rawConsultant
      : `${rawConsultant} (Consultant Radiologist)`;
    signers.push(`Verified / Signed by:  ${formattedConsultant}`);
  }
  if (signers.length > 0) {
    sections.push(`--------------------------------------------------\n${signers.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Strips any embedded clinician signature or attribution lines from raw text.
 * Used when capturing templates from active reports to guarantee templates are clean,
 * and when sanitizing impressions to eliminate duplicate or malformed signatures.
 */
export function stripAttributionFromText(text: string): string {
  if (!text) return '';
  return text
    // 1. Matches and removes signature blocks in HTML (Reported by, Attribution, Verified by)
    .replace(/(?:<p[^>]*>)?(?:\s*<br\s*[\/]?>\s*)*(?:<strong>|<em>)*\s*(?:Reported\s+by|Attribution|Verified\s+by):?[\s\S]*?(?:<\/p>|$)/gi, '')
    // 2. Matches and removes plain text signature lines
    .replace(/(?:^|\n)\s*(?:_{0,2}|\*{0,2})\s*(?:Reported\s+by|Attribution|Verified\s+by):?[^\n]*(?:\n|$)/gi, '')
    // 3. Cleans up any orphaned closing tags or stray doctor mentions left behind
    .replace(/(?:<\/strong>|<\/em>|\s)+(?:<em>)?\s*Dr\.?[^<]+<\/em>(?:<\/p>)?/gi, '')
    // 4. Cleans trailing empty paragraphs, breaks, and whitespace
    .replace(/(?:<p[^>]*>(?:\s*<br\s*[\/]?>|\s*&nbsp;|\s*)*<\/p>\s*)+$/gi, '')
    .trim();
}

/**
 * Normalizes or updates the embedded signature in impression HTML to match the active doctor name.
 */
export function normalizeImpressionSignatureHtml(html: string, doctorName: string): string {
  if (!html) return '';
  const stripped = stripAttributionFromText(html);
  if (!doctorName || !doctorName.trim() || doctorName.trim() === 'Resident Radiologist') {
    return stripped;
  }
  return `${stripped}<p><br></p><p><strong>Reported by: </strong><em>${doctorName.trim()}</em></p>`;
}

/**
 * Normalizes clinical history, stripping any raw HTML tags (e.g. <p>, <br>) into clean plain text.
 */
export function cleanClinicalHistory(history: string | null | undefined): string {
  if (!history || typeof history !== 'string') return '';
  return htmlToClinicalText(history).trim();
}

/**
 * Splits and cleans technique and findings sections, preventing duplicate "Technique"
 * and duplicate "Findings" headers that occur when templates or saved cases embed both in findings.
 */
export function splitTechniqueAndFindings(
  rawFindings: string | null | undefined,
  rawTechnique?: string | null | undefined
): { technique: string; findings: string } {
  let technique = cleanClinicalHistory(rawTechnique);
  let findings = (rawFindings || '').trim();

  if (!findings) {
    return { technique, findings: '' };
  }

  // 1. Dual Match HTML (Technique header ... Findings header)
  const htmlDualMatch = findings.match(
    /^\s*(?:<h[1-6][^>]*>(?:<strong[^>]*>)?|<p[^>]*><strong[^>]*>|<strong[^>]*>)\s*Technique(?:\s*&amp;\s*Protocol|\s*Protocol)?\s*[:\s]*(?:<\/strong>)?(?:<\/h[1-6]>|<\/p>|<\/strong>[:\s]*)([\s\S]*?)(?:<h[1-6][^>]*>(?:<strong[^>]*>)?|<p[^>]*><strong[^>]*>|<strong[^>]*>)\s*Findings\s*[:\s]*(?:<\/strong>)?(?:<\/h[1-6]>|<\/p>|<\/strong>[:\s]*)([\s\S]*)$/i
  );
  if (htmlDualMatch) {
    if (!technique) {
      technique = htmlToClinicalText(htmlDualMatch[1]).trim();
    }
    findings = htmlDualMatch[2].trim();
  }

  // 2. Standalone Leading HTML Technique paragraph or header
  const leadingHtmlTech = findings.match(
    /^\s*(?:<h[1-6][^>]*>(?:<strong[^>]*>)?\s*Technique(?:\s*&amp;\s*Protocol|\s*Protocol)?\s*(?:<\/strong>)?<\/h[1-6]>\s*<p>([\s\S]*?)<\/p>|<p[^>]*><strong[^>]*>\s*Technique(?:\s*&amp;\s*Protocol|\s*Protocol)?\s*[:<][^>]*>\s*([\s\S]*?)<\/p>)([\s\S]*)$/i
  );
  if (leadingHtmlTech) {
    const extractedTech = (leadingHtmlTech[1] || leadingHtmlTech[2] || '').trim();
    if (!technique && extractedTech) {
      technique = htmlToClinicalText(extractedTech).trim();
    }
    findings = (leadingHtmlTech[3] || '').trim();
  }

  // 3. Plain text Dual Match (Technique ... Findings)
  const textDualMatch = findings.match(
    /^\s*Technique(?:\s*&amp;\s*Protocol|\s*Protocol)?\s*[:\n]+([\s\S]*?)\s*(?:\n|\r\n)\s*Findings\s*[:\n]+([\s\S]*)$/i
  );
  if (textDualMatch) {
    if (!technique) {
      technique = textDualMatch[1].trim();
    }
    findings = textDualMatch[2].trim();
  }

  // 4. Standalone Leading Plain Text Technique line
  const leadingPlainTech = findings.match(
    /^\s*Technique(?:\s*&amp;\s*Protocol|\s*Protocol)?\s*[:\s]+([\s\S]*?)(?:\n\s*\n|\r\n\s*\r\n)([\s\S]*)$/i
  );
  if (leadingPlainTech) {
    const extractedTech = leadingPlainTech[1].trim();
    if (!technique && extractedTech) {
      technique = extractedTech;
    }
    findings = leadingPlainTech[2].trim();
  }

  // 5. Strip redundant leading "Findings:" or "FINDINGS:" header
  findings = findings
    .replace(/^\s*(?:<h[1-6][^>]*>(?:<strong[^>]*>)?|<p[^>]*><strong[^>]*>|<strong[^>]*>)?\s*Findings\s*[:\n]*(?:<\/strong>)?(?:<\/h[1-6]>|<\/p>|<\/strong>)?\s*/i, '')
    .trim();

  // 6. If technique exists, check if first paragraph of findings duplicates technique text (even without label)
  if (technique) {
    const normTech = technique.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normTech.length > 15) {
      const htmlParaMatch = findings.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>([\s\S]*)$/i);
      if (htmlParaMatch) {
        const firstText = htmlToClinicalText(htmlParaMatch[1]).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (firstText && (firstText === normTech || firstText.startsWith(normTech) || normTech.startsWith(firstText))) {
          findings = (htmlParaMatch[2] || '').trim();
        }
      } else {
        const plainLines = findings.split(/\n\s*\n/);
        if (plainLines.length > 1) {
          const firstLineNorm = plainLines[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          if (firstLineNorm && (firstLineNorm === normTech || firstLineNorm.startsWith(normTech) || normTech.startsWith(firstLineNorm))) {
            findings = plainLines.slice(1).join('\n\n').trim();
          }
        }
      }
    }
  }

  if (technique) {
    technique = htmlToClinicalText(technique).trim();
  }

  return { technique, findings };
}

/**
 * Strips clinical comment mark spans while keeping internal report text intact.
 * Used when copying rich-text HTML into external portals (HMIS, Word, Google Docs).
 */
export function stripClinicalCommentMarks(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<span\s+[^>]*data-comment-id="[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
}

/**
 * Strips HTML heading tags and normalizes technique text.
 */
export function cleanTechniqueText(tech?: string | null): string {
  if (!tech) return '';
  return tech
    .replace(/^\s*(?:<h[1-6][^>]*>(?:<strong[^>]*>)?|<p[^>]*><strong[^>]*>)?\s*Technique(?:\s*&amp;\s*Protocol|\s*Protocol)?\s*[:\s]*(?:<\/strong>)?(?:<\/h[1-6]>|<\/p>)?\s*/i, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Combines technique and findings ensuring exactly one Technique and one Findings header (LGH bold standard).
 */
export function buildFindingsWithTechnique(
  rawFindings: string | null | undefined,
  rawTechnique?: string | null | undefined
): string {
  if (!rawFindings) return '';
  const cleanTech = cleanTechniqueText(rawTechnique);

  // Check if findings already contains a Technique section (with or without strong)
  const hasTechnique = /<h[1-6][^>]*>(?:<strong[^>]*>)?\s*Technique|<strong[^>]*>\s*Technique\s*[:<]/i.test(rawFindings);
  if (hasTechnique || !cleanTech) {
    return rawFindings;
  }

  // Check if findings already starts with a Findings header (with or without strong)
  const hasLeadingFindings = /^\s*<h[1-6][^>]*>(?:<strong[^>]*>)?\s*Findings/i.test(rawFindings);
  if (hasLeadingFindings) {
    return `<h3><strong>Technique</strong></h3><p>${cleanTech}</p>${rawFindings.trim()}`;
  }

  return `<h3><strong>Technique</strong></h3><p>${cleanTech}</p><h3><strong>Findings</strong></h3>${rawFindings.trim()}`;
}



