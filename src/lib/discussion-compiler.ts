// Layer 2 / Library: Pure Clinical Discussion Compiler & Formatters
// Zero Node.js / database dependencies so it is 100% safe to import in Client Components

export interface DiscussionFinding {
  id: string;
  label: string;
  text: string;
}

export interface CaseDiscussionPayload {
  positiveFindings: DiscussionFinding[];
  positiveFindingsHtml?: string;
  consultantNotes: string;
  updatedAt?: string;
}

/**
 * Converts structured DiscussionFinding array to rich-text clinical bullet list HTML
 */
export function findingsToBulletHtml(findings: DiscussionFinding[]): string {
  if (!findings || findings.length === 0) return '';
  const items = findings
    .map((f) => {
      const label = (f.label || '').trim();
      const text = (f.text || '').trim();
      if (label && text) {
        return `<li><p><strong>${label}:</strong> ${text}</p></li>`;
      } else if (text) {
        return `<li><p>${text}</p></li>`;
      } else if (label) {
        return `<li><p><strong>${label}</strong></p></li>`;
      }
      return '';
    })
    .filter(Boolean);

  return items.length > 0 ? `<ul>${items.join('')}</ul>` : '';
}

/**
 * Compiles positive findings and consultant notes into structured clinical report HTML
 */
export function compileDiscussionToReportHtml(
  findingsOrHtml: DiscussionFinding[] | string,
  consultantNotes: string,
  pgrName?: string,
  _existingTechnique?: string
): { findingsHtml: string; impressionHtml: string } {
  let findingsList: DiscussionFinding[] = [];
  let findingsHtml = '';

  if (typeof findingsOrHtml === 'string') {
    findingsHtml = findingsOrHtml.trim();
    findingsList = extractFindingsFromHtml(findingsHtml);
    if (!findingsHtml || findingsHtml === '<p></p>') {
      findingsHtml = '<p>Standard unremarkable baseline preserved.</p>';
    }
  } else {
    findingsList = findingsOrHtml;
    const findingsItems = findingsList.map((f) => {
      const label = f.label.trim();
      const text = f.text.trim();
      return `<li><p><strong>${label}:</strong> ${text}</p></li>`;
    });
    findingsHtml =
      findingsItems.length > 0
        ? `<ul>${findingsItems.join('')}</ul>`
        : '<p>Standard unremarkable baseline preserved.</p>';
  }

  // 2. Impression Section: high-yield summary bullets + consultant edits/notes + signature
  const impressionItems: string[] = [];

  findingsList.forEach((f) => {
    if (f.text.toLowerCase().includes('normal') && !f.text.toLowerCase().includes('abnormal')) {
      return;
    }
    const cleanLabel = f.label.trim();
    const cleanText = f.text.trim();
    if (cleanLabel && cleanText) {
      impressionItems.push(`<li><p><strong>${cleanLabel}:</strong> ${cleanText}</p></li>`);
    } else if (cleanText) {
      impressionItems.push(`<li><p>${cleanText}</p></li>`);
    }
  });

  if (consultantNotes && consultantNotes.trim()) {
    impressionItems.push(
      `<li><p><strong>Consultant Note / Clinical Takeaway:</strong> ${consultantNotes.trim()}</p></li>`
    );
  }

  const signatureHtml = pgrName && pgrName.trim() && pgrName.trim() !== 'Resident Radiologist'
    ? `<p><br></p><p><strong>Reported by: </strong><em>${pgrName.trim()}</em></p>`
    : '';

  const impressionHtml =
    impressionItems.length > 0
      ? `<ul>${impressionItems.join('')}</ul>${signatureHtml}`
      : `<p>No focal acute abnormal findings identified.</p>${signatureHtml}`;

  return { findingsHtml, impressionHtml };
}

/**
 * Intelligent helper to extract level-based findings from existing report HTML
 */
export function extractFindingsFromHtml(html: string): DiscussionFinding[] {
  if (!html || !html.trim()) return [];
  const results: DiscussionFinding[] = [];
  let idx = 0;

  // First try parsing structured <li> items
  const liRegex = /<li[^>]*>(.*?)<\/li>/gis;
  let liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const liContent = liMatch[1];
    // Check if item contains <strong>Label:</strong> Text
    const labelMatch = /<strong[^>]*>\s*([^:<]+?)\s*:?\s*<\/strong>\s*:?\s*(.*)/is.exec(liContent);
    if (labelMatch) {
      const label = labelMatch[1].replace(/<[^>]+>/g, '').trim();
      const rawText = labelMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (/^(?:reported\s+by|attribution|verified\s+by|advice|advise)$/i.test(label)) {
        continue;
      }
      if (label && (rawText.length > 2 || label.length > 2)) {
        results.push({
          id: `extracted-${idx++}`,
          label,
          text: rawText,
        });
        continue;
      }
    }

    // Generic list item without strong tag
    const plainText = liContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText.length > 3) {
      const colonIdx = plainText.indexOf(':');
      if (colonIdx > 0 && colonIdx < 50) {
        results.push({
          id: `extracted-${idx++}`,
          label: plainText.slice(0, colonIdx).trim(),
          text: plainText.slice(colonIdx + 1).trim(),
        });
      } else {
        results.push({
          id: `extracted-${idx++}`,
          label: `Finding ${idx + 1}`,
          text: plainText,
        });
      }
    }
  }

  // Fallback: regex for inline <strong>Label:</strong> Text outside <li>
  if (results.length === 0) {
    const regex = /<strong>\s*([^:<]+?)\s*:\s*<\/strong>\s*([^<]+)/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const label = match[1].trim();
      const text = match[2].trim();
      if (/^(?:reported\s+by|attribution|verified\s+by|advice|advise)$/i.test(label)) {
        continue;
      }
      if (label && text && text.length > 3) {
        results.push({
          id: `extracted-${idx++}`,
          label,
          text,
        });
      }
    }
  }

  return results;
}
