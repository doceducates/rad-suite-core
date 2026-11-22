// Layer 2 / Library: Pure Zero-Dependency Clinical Git-Style Diff Engine
// Invariant: Target < 250 lines, max 350 lines. Client & Server safe.

export interface DiffToken {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

export interface DiffStats {
  addedWords: number;
  removedWords: number;
  unchangedWords: number;
}

export interface LevelDiffItem {
  level: string;
  oldText: string;
  newText: string;
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  tokens: DiffToken[];
}

export interface SidebarDiscrepancy {
  key: string;
  label: string;
  sidebarText: string;
  reportText: string;
  status: 'synced' | 'sidebar_only' | 'report_only' | 'conflict';
  details?: string;
}

export function cleanHtmlText(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Standard Longest Common Subsequence (LCS) for word arrays
 */
export function diffWords(oldStr: string, newStr: string): DiffToken[] {
  const oldWords = oldStr.trim().split(/\s+/).filter(Boolean);
  const newWords = newStr.trim().split(/\s+/).filter(Boolean);

  const m = oldWords.length;
  const n = newWords.length;

  if (m === 0 && n === 0) return [];
  if (m === 0) return newWords.map((w) => ({ type: 'added', value: w }));
  if (n === 0) return oldWords.map((w) => ({ type: 'removed', value: w }));

  // Build LCS matrix (bounded for practical clinical paragraph lengths)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1].toLowerCase() === newWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff tokens
  const tokens: DiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1].toLowerCase() === newWords[j - 1].toLowerCase()) {
      tokens.unshift({ type: 'equal', value: newWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ type: 'added', value: newWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      tokens.unshift({ type: 'removed', value: oldWords[i - 1] });
      i--;
    }
  }

  return tokens;
}

export function computeDiffStats(tokens: DiffToken[]): DiffStats {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const t of tokens) {
    if (t.type === 'added') added++;
    else if (t.type === 'removed') removed++;
    else unchanged++;
  }
  return { addedWords: added, removedWords: removed, unchangedWords: unchanged };
}

/**
 * Parses report HTML or plain text into anatomical sections / spinal levels
 */
export function extractAnatomicalSections(html: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!html) return map;

  const clean = cleanHtmlText(html);
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  const levelPattern = /^((?:[CLTS]\d+(?:[–-][CLTS]?\d+)?)|(?:alignment|curvature|cord|conus|soft tissues|extrinsics|extraneural|extrathoracic|brain parenchyma|ventricles|cisterns|hemorrhage|infarct|bones|technique|impression|findings|vertebrae|marrow)):?\s*(.*)$/i;

  let currentKey = 'General';
  for (const line of lines) {
    const match = line.match(levelPattern);
    if (match) {
      currentKey = match[1].trim();
      const body = match[2].trim();
      map.set(currentKey, body || line);
    } else {
      const existing = map.get(currentKey);
      map.set(currentKey, existing ? `${existing} ${line}` : line);
    }
  }

  return map;
}

/**
 * Structural level-by-level comparison between two report texts
 */
export function diffByLevels(oldHtml: string, newHtml: string): LevelDiffItem[] {
  const oldSections = extractAnatomicalSections(oldHtml);
  const newSections = extractAnatomicalSections(newHtml);

  const allKeys = Array.from(new Set([...oldSections.keys(), ...newSections.keys()]));
  const items: LevelDiffItem[] = [];

  for (const key of allKeys) {
    const oldVal = (oldSections.get(key) || '').trim();
    const newVal = (newSections.get(key) || '').trim();

    if (!oldVal && newVal) {
      items.push({
        level: key,
        oldText: '',
        newText: newVal,
        status: 'added',
        tokens: diffWords('', newVal),
      });
    } else if (oldVal && !newVal) {
      items.push({
        level: key,
        oldText: oldVal,
        newText: '',
        status: 'removed',
        tokens: diffWords(oldVal, ''),
      });
    } else if (oldVal.toLowerCase() === newVal.toLowerCase()) {
      items.push({
        level: key,
        oldText: oldVal,
        newText: newVal,
        status: 'unchanged',
        tokens: diffWords(oldVal, newVal),
      });
    } else {
      items.push({
        level: key,
        oldText: oldVal,
        newText: newVal,
        status: 'modified',
        tokens: diffWords(oldVal, newVal),
      });
    }
  }

  return items;
}

/**
 * Compares sidebar positive findings against report text to detect discrepancies
 */
export function compareSidebarWithReport(
  sidebarFindings: Array<{ id?: string; label: string; text: string }>,
  consultantNotes: string,
  reportFindingsHtml: string,
  reportImpressionHtml: string
): SidebarDiscrepancy[] {
  const fullReportText = cleanHtmlText(`${reportFindingsHtml} ${reportImpressionHtml}`).toLowerCase();
  const reportSections = extractAnatomicalSections(reportFindingsHtml);
  const results: SidebarDiscrepancy[] = [];

  // Check each sidebar finding
  for (const item of sidebarFindings) {
    const label = item.label.trim();
    const text = item.text.trim();
    const labelLower = label.toLowerCase();
    const textLower = text.toLowerCase();

    // Check if label or keywords exist in report
    const matchedReportSection = reportSections.get(label) || '';
    const sectionLower = matchedReportSection.toLowerCase();

    if (!fullReportText.includes(labelLower) && (!textLower || !fullReportText.includes(textLower.slice(0, 20)))) {
      results.push({
        key: `sidebar-${item.id || label}`,
        label,
        sidebarText: text || label,
        reportText: matchedReportSection || 'Not mentioned in main report',
        status: 'sidebar_only',
        details: 'Finding present in sidebar notes but omitted from main report body.',
      });
    } else if (matchedReportSection && sectionLower !== textLower) {
      // Both exist but texts differ
      results.push({
        key: `conflict-${label}`,
        label,
        sidebarText: text,
        reportText: matchedReportSection,
        status: 'conflict',
        details: 'Wording or acuity differs between sidebar notes and main report.',
      });
    } else {
      results.push({
        key: `synced-${label}`,
        label,
        sidebarText: text,
        reportText: matchedReportSection || text,
        status: 'synced',
      });
    }
  }

  // Check consultant notes
  if (consultantNotes && consultantNotes.trim()) {
    const notesLower = consultantNotes.trim().toLowerCase();
    const isPresent = fullReportText.includes(notesLower.slice(0, 30));
    results.push({
      key: 'consultant-notes',
      label: 'Consultant Takeaway',
      sidebarText: consultantNotes.trim(),
      reportText: isPresent ? 'Present in report' : 'Missing from report',
      status: isPresent ? 'synced' : 'sidebar_only',
      details: isPresent ? undefined : 'Consultant round notes are not yet compiled into impression.',
    });
  }

  return results;
}
