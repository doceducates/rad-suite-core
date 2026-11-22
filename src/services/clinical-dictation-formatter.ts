/**
 * Clinical Radiology Dictation Formatter & Parser
 * Layer 2 (Domain/Services) - Strictly under 250 lines invariant.
 *
 * Deterministically normalizes spoken punctuation, phonetic medical errors,
 * separates history, findings, and impressions, and formats findings into
 * structured HTML paragraphs (<p><strong>[Organ/Region]:</strong> ...</p>).
 */

export const SPOKEN_PUNCTUATION_MAP: [RegExp, string][] = [
  [/\b(?:full stop|period)\b/gi, '.'],
  [/\b(?:comma)\b/gi, ','],
  [/\b(?:colon)\b/gi, ':'],
  [/\b(?:semicolon)\b/gi, ';'],
  [/\b(?:new paragraph|next paragraph)\b/gi, '\n\n'],
  [/\b(?:new line|next line)\b/gi, '\n'],
  [/\b(?:open parenthesis|open bracket)\b/gi, '('],
  [/\b(?:close parenthesis|close bracket)\b/gi, ')'],
  [/\b(?:question mark)\b/gi, '?'],
];

export const PHONETIC_CORRECTIONS_MAP: [RegExp, string][] = [
  [/\b(?:call ladder|gall bladder)\b/gi, 'gallbladder'],
  [/\b(?:thecal sack)\b/gi, 'thecal sac'],
  [/\b(?:status post)\b/gi, 'S/p'],
  [/\b(?:history of)\b/gi, 'H/o'],
  [/\b(?:complaints of|complaining of)\b/gi, 'C/o'],
  [/\b(?:right more than left)\b/gi, '(R > L)'],
  [/\b(?:left more than right)\b/gi, '(L > R)'],
  [/(\d+)\s*(?:by|into|x)\s*(\d+)\s*(mm|cm)/gi, '$1 x $2 $3'],
];

const MODALITY_ANATOMY_PATTERNS: Record<string, { header: string; pattern: RegExp }[]> = {
  SPINE: [
    { header: 'Alignment & Curvature', pattern: /alignment|lordosis|kyphosis|scoliosis|straightening|spine/i },
    { header: 'Vertebral Bodies', pattern: /vertebral bod|vertebra|marrow|height|endplate/i },
    { header: 'Intervertebral Discs', pattern: /disc|bulge|protrusion|extrusion|herniation|l1|l2|l3|l4|l5|s1|cervical/i },
    { header: 'Spinal Canal & Neural Foramina', pattern: /canal|thecal sac|recess|foramin|nerve root|stenosis/i },
    { header: 'Posterior Elements', pattern: /facet|ligamentum flavum|posterior element|lamina|pedicle/i },
  ],
  BRAIN: [
    { header: 'Brain Parenchyma', pattern: /parenchyma|cerebr|infarct|hemorrhage|gray-white|gliosis|edema/i },
    { header: 'Ventricles & Cisterns', pattern: /ventricle|cistern|sulc|hydrocephalus|midline/i },
    { header: 'Extra-Axial Spaces', pattern: /subdural|epidural|subarachnoid|extra-axial/i },
    { header: 'Bones & Calvarium', pattern: /calvarium|skull base|sella|paranasal|orbit/i },
  ],
  CHEST: [
    { header: 'Lungs & Airways', pattern: /lung|airway|trachea|consolidation|opacity|nodule|infiltrate/i },
    { header: 'Pleura & Spaces', pattern: /pleura|effusion|pneumothorax/i },
    { header: 'Mediastinum & Heart', pattern: /mediastin|heart|cardiomegaly|hila|aorta|pericard/i },
    { header: 'Chest Wall & Bones', pattern: /rib|chest wall|sternum|clavicle/i },
  ],
  ABDOMEN: [
    { header: 'Liver & Biliary Tree', pattern: /liver|gallbladder|biliary|cholelith/i },
    { header: 'Spleen', pattern: /spleen|spleno/i },
    { header: 'Pancreas', pattern: /pancreas|pancreatic/i },
    { header: 'Kidneys & Ureters', pattern: /kidney|renal|calculus|hydronephrosis|ureter/i },
    { header: 'Bowel & Peritoneum', pattern: /bowel|appendix|peritoneum|ascites|mesenter/i },
  ],
};

export function cleanSpokenPunctuation(text: string): string {
  if (!text) return '';
  let cleaned = text;

  for (const [regex, replacement] of SPOKEN_PUNCTUATION_MAP) {
    cleaned = cleaned.replace(regex, replacement);
  }
  for (const [regex, replacement] of PHONETIC_CORRECTIONS_MAP) {
    cleaned = cleaned.replace(regex, replacement);
  }

  return cleaned
    .replace(/\s+([.,;:?])/g, '$1')
    .replace(/([.,;:?])(?=[A-Za-z])/g, '$1 ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function extractClinicalSections(rawText: string): {
  clinicalHistory?: string;
  technique?: string;
  findings: string;
  impression?: string;
} {
  const cleaned = cleanSpokenPunctuation(rawText);
  let clinicalHistory: string | undefined;
  let technique: string | undefined;
  let impression: string | undefined;
  let findings = cleaned;

  // 1. Extract Impression / Conclusion
  const impMatch = findings.match(
    /\b(?:impression|conclusion|opinion|summary)\s*[:\-]\s*([\s\S]+)$/i
  );
  if (impMatch) {
    impression = impMatch[1].trim();
    findings = findings.substring(0, impMatch.index).trim();
  }

  // 2. Extract Clinical History / Indication
  const histMatch = findings.match(
    /\b(?:clinical history|history|indication|clinical profile)\s*[:\-]\s*([\s\S]+?)(?=(?:\b(?:technique|findings|mri findings|ct findings|scan findings)\b|[:\-]|$))/i
  );
  if (histMatch) {
    clinicalHistory = histMatch[1].trim();
    findings = findings.replace(histMatch[0], '').trim();
  } else {
    const directHist = findings.match(
      /^(?:there is\s+)?(?:history of|h\/o|c\/o|complaints of)[\s\S]+?(?=(?:mri findings|ct findings|scan findings|findings\s*[:\-]|\n\n|$))/i
    );
    if (directHist && directHist[0].length < findings.length - 10) {
      clinicalHistory = directHist[0].trim();
      findings = findings.substring(directHist[0].length).trim();
    }
  }

  findings = findings
    .replace(/^(?:mri findings|ct findings|scan findings|findings)\s*(?:are|show|include)?\s*[:\-]?\s*/i, '')
    .trim();

  return { clinicalHistory, technique, findings, impression };
}

function parseMarkdownToHtml(markdown: string): string {
  let content = markdown
    .replace(/^#{1,4}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  const lines = content.split('\n');
  const out: string[] = [];
  let inMain = false;
  let inSub = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const subMatch = /^(?:\s{2,}|\t)[-*+]\s+(.*)$/.exec(line);
    const mainMatch = /^[-*+]\s+(.*)$/.exec(line);

    if (subMatch) {
      if (!inMain) { out.push('<ul>'); inMain = true; }
      if (!inSub) { out.push('<ul>'); inSub = true; }
      out.push(`<li>${subMatch[1].trim()}</li>`);
    } else if (mainMatch) {
      if (inSub) { out.push('</ul></li>'); inSub = false; }
      if (!inMain) { out.push('<ul>'); inMain = true; }
      const nextLine = lines[i + 1] || '';
      const nextIsSub = /^(?:\s{2,}|\t)[-*+]\s+/.test(nextLine);
      out.push(nextIsSub ? `<li>${mainMatch[1].trim()}` : `<li>${mainMatch[1].trim()}</li>`);
    } else {
      if (inSub) { out.push('</ul></li>'); inSub = false; }
      if (inMain) { out.push('</ul>'); inMain = false; }
      const trimmed = line.trim();
      if (trimmed) {
        out.push(/^<(?:h[1-6]|p|div|ul|ol|li)[^>]*>/i.test(trimmed) ? trimmed : `<p>${trimmed}</p>`);
      }
    }
  }
  if (inSub) out.push('</ul></li>');
  if (inMain) out.push('</ul>');
  return out.join('');
}

export function formatClinicalFindingsHtml(
  findingsText: string,
  modality = 'CT',
  technique?: string
): string {
  if (!findingsText) return '';

  let formatted = '';

  // 1. If input contains markdown list or headings, parse into structured HTML
  if (/(?:^|\n)\s*[-*+]\s+|(?:^|\n)#{1,4}\s+/.test(findingsText)) {
    formatted = parseMarkdownToHtml(findingsText);
  }
  // 2. If already rich HTML with lists/headings, preserve tags and normalize bolding
  else if (/<(?:ul|li|ol|h[1-6])[\s>]/i.test(findingsText)) {
    formatted = findingsText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  // 3. If already structured with <p><strong>
  else if (/<p><strong>(?!(?:Organ|Section):)[^<]+:<\/strong>/i.test(findingsText)) {
    formatted = findingsText;
  }
  // 4. Fallback: Parse spoken/plain text via colon sections or anatomical rules
  else {
    const cleaned = cleanSpokenPunctuation(findingsText);
    let text = cleaned.replace(/<p><strong>(?:Organ|Section):<\/strong>\s*([^<]+)<\/p>/gi, '$1\n');
    text = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // 4a. Explicit "Header: details" colon pattern
    const colonSections = text.split(/(?<=[.!?]|^)\s*([A-Za-z0-9\s/&–-]+?)\s*:\s*/g);
    if (colonSections.length > 2) {
      const blocks: string[] = [];
      for (let i = 1; i < colonSections.length; i += 2) {
        const header = colonSections[i].trim();
        const body = (colonSections[i + 1] || '').trim();
        if (header && body) {
          blocks.push(`<p><strong>${header}:</strong> ${body}</p>`);
        }
      }
      if (blocks.length > 0) formatted = blocks.join('');
    }

    // 4b. Modality anatomical rule matching
    if (!formatted) {
      const upperMod = (modality || 'CT').toUpperCase();
      const cat = upperMod.includes('SPINE') || /spine|disc|lumbar|vertebra/i.test(text)
        ? 'SPINE'
        : upperMod.includes('BRAIN') || /brain|infarct|ventricle/i.test(text)
        ? 'BRAIN'
        : upperMod.includes('CHEST') || /lung|pleura/i.test(text)
        ? 'CHEST'
        : 'ABDOMEN';

      const rules = MODALITY_ANATOMY_PATTERNS[cat] || MODALITY_ANATOMY_PATTERNS.ABDOMEN;
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      const matchedBlocks: { header: string; content: string[] }[] = [];
      let currentHeader = 'General Findings';
      let currentSentences: string[] = [];

      for (const sentence of sentences) {
        const matchedRule = rules.find((r) => r.pattern.test(sentence));
        if (matchedRule && currentSentences.length > 0) {
          matchedBlocks.push({ header: currentHeader, content: [...currentSentences] });
          currentHeader = matchedRule.header;
          currentSentences = [sentence];
        } else {
          if (matchedRule && currentSentences.length === 0) {
            currentHeader = matchedRule.header;
          }
          currentSentences.push(sentence);
        }
      }

      if (currentSentences.length > 0) {
        matchedBlocks.push({ header: currentHeader, content: currentSentences });
      }

      formatted = matchedBlocks.length > 0
        ? matchedBlocks.map((b) => `<p><strong>${b.header}:</strong> ${b.content.join(' ')}</p>`).join('')
        : `<p><strong>General Findings:</strong> ${text}</p>`;
    }
  }

  // 5. Prepend technique if provided and not already present
  if (technique && technique.trim() && !/<h3>\s*Technique\s*<\/h3>|<strong[^>]*>\s*Technique\s*[:<]/i.test(formatted)) {
    const techBlock = `<h3>Technique</h3><p>${technique.trim()}</p>`;
    if (/<h3>\s*Findings\s*<\/h3>/i.test(formatted)) {
      formatted = formatted.replace(/<h3>\s*Findings\s*<\/h3>/i, `${techBlock}<h3>Findings</h3>`);
    } else {
      formatted = `${techBlock}<h3>Findings</h3>${formatted}`;
    }
  }

  // 6. Ensure Findings header exists if Technique header is present
  if (/<h3>\s*Technique\s*<\/h3>/i.test(formatted) && !/<h3>\s*Findings\s*<\/h3>/i.test(formatted)) {
    formatted = formatted.replace(/(<h3>\s*Technique\s*<\/h3>\s*<p>[\s\S]*?<\/p>)/i, '$1<h3>Findings</h3>');
  }

  return highlightCriticalFindings(formatted);
}

export function highlightCriticalFindings(html: string): string {
  if (!html) return '';
  const parts = html.split(/(<[^>]+>)/g);
  let insideStrong = false;

  const acuteRegex = /\b(diffuse disc bulge[s]?|disc protrusion[s]?|disc extrusion[s]?|annular fissure[s]?|annular tear[s]?|nerve root (?:compression|impingement)|lateral recess (?:narrowing|stenosis)|(?:canal|foraminal|exit foraminal) stenosis|spondylolisthesis|retrolisthesis|(?:acute|compression) fracture[s]?|acute (?:territorial )?infarct(?:ion)?|cytotoxic edema|intracranial hemorrhage|subdural hematoma|subarachnoid hemorrhage|midline shift|mass effect|(?:full|partial)-thickness tear[s]?|bone marrow edema|pulmonary embolism|pneumothorax|hydronephrosis|appendicitis)\b/gi;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      if (/^<strong\b/i.test(part)) insideStrong = true;
      else if (/^<\/strong>/i.test(part)) insideStrong = false;
    } else if (!insideStrong && part.trim()) {
      parts[i] = part.replace(acuteRegex, (match, _p1, offset, fullStr) => {
        const preceding = fullStr.slice(0, offset);
        if (/(?:without|no|absence of|free of|negative for|ruled out)\s+(?:[A-Za-z0-9,\s–-]{1,30}\s+)?$/i.test(preceding)) {
          return match;
        }
        return `<strong>${match}</strong>`;
      });
    }
  }
  return parts.join('');
}

export function normalizeImpressionList(impression: string): string {
  if (!impression) return '';
  // Strip any embedded signatures before bulleting so signatures are never numbered
  const noSig = impression
    .replace(/(?:<p[^>]*>)?(?:\s*<br\s*[\/]?>\s*)*(?:<strong>|<em>)*\s*(?:Reported\s+by|Attribution|Verified\s+by):?[\s\S]*?(?:<\/p>|$)/gi, '')
    .replace(/(?:^|\n)\s*(?:_{0,2}|\*{0,2})\s*(?:Reported\s+by|Attribution|Verified\s+by):?[^\n]*(?:\n|$)/gi, '')
    .replace(/(?:<\/strong>|<\/em>|\s)+(?:<em>)?\s*Dr\.?[^<]+<\/em>(?:<\/p>)?/gi, '');

  const cleaned = cleanSpokenPunctuation(noSig).replace(/<[^>]*>/g, ' ').trim();
  
  // Prefer splitting by newline if already multiline; otherwise split on sentence end followed by capital letter
  const rawLines = cleaned.includes('\n')
    ? cleaned.split(/\r?\n/)
    : cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/);

  const lines = rawLines.map((l) => l.trim()).filter(Boolean);

  let counter = 1;
  const resultLines: string[] = [];
  const adviceLines: string[] = [];

  for (const line of lines) {
    if (/^(?:advise|recommendation|advice)\s*[:\-]/i.test(line)) {
      adviceLines.push(line.replace(/^(?:advise|recommendation|advice)\s*[:\-]\s*/i, 'Advise: '));
      continue;
    }
    // Only strip leading numbered bullets like "1. " or "1) ", NEVER decimal numbers like "2.5 cm"
    const stripped = line.replace(/^\d+[\.\)]\s+/, '').trim();
    if (!stripped) continue;
    // Strictly filter out any leftover signature lines
    if (/^(?:reported\s+by|attribution|verified\s+by)\s*[:\-]/i.test(stripped)) continue;
    if (/^dr\.?\s+[a-z\s\.\(\)]+$/i.test(stripped)) continue;

    resultLines.push(`${counter++}. ${stripped}`);
  }

  const combined = [...resultLines, ...adviceLines];
  return combined.length > 0 ? combined.join('\n') : (cleaned ? `1. ${cleaned}` : '');
}
