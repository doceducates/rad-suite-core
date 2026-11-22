/**
 * Case Insights Formatters & Cache Utilities (Layer 4/Lib)
 * Client-safe pure functions - zero Node.js/server dependencies.
 */

import type {
  CaseInsightsData,
  DifferentialItem,
  RecommendedInvestigation,
} from '@/types/case-insights';

export function extractPrecachedInsights(params: {
  contentJson?: any;
  clinicalNotes?: string | null;
}): CaseInsightsData | null {
  const { contentJson, clinicalNotes } = params;

  // 1. Direct cache in reports.content_json
  if (contentJson?.caseInsights && typeof contentJson.caseInsights === 'object') {
    const cached = contentJson.caseInsights as CaseInsightsData;
    if (cached.primaryDifferential && Array.isArray(cached.differentials)) {
      return { ...cached, source: 'cached' };
    }
  }

  // 2. Extract from patients.clinical_notes if structured notes exist
  if (clinicalNotes && clinicalNotes.trim().length > 15) {
    const text = clinicalNotes.trim();
    if (/differential|ddx|impression/i.test(text)) {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const diffItems: DifferentialItem[] = [];
      const recInvs: RecommendedInvestigation[] = [];

      for (const line of lines) {
        const diffMatch = line.match(/^\d+[\.\)]\s*(.*?)(?:\s*\((High|Moderate|Consider)\))?(?:\s*[-–:]\s*(.*))?$/i);
        if (diffMatch) {
          diffItems.push({
            diagnosis: diffMatch[1]?.trim() || line,
            likelihood: (diffMatch[2] ? (diffMatch[2].charAt(0).toUpperCase() + diffMatch[2].slice(1).toLowerCase()) : 'Consider') as any,
            rationale: diffMatch[3]?.trim() || 'Documented in prior clinical evaluation.',
          });
        }
        if (/HLA-B27|ESR|CRP|ANA|biomarker|creatinine/i.test(line)) {
          recInvs.push({
            type: 'laboratory',
            name: line.replace(/^[A-Za-z\s]+:\s*/, ''),
            rationale: 'Follow-up laboratory correlation noted in patient history.',
          });
        }
      }

      if (diffItems.length > 0) {
        return {
          primaryDifferential: diffItems[0].diagnosis,
          differentials: diffItems,
          vivaBriefing: {
            demographics: 'Historical clinical record presentation.',
            hallmarkSigns: ['Findings recorded in historical case notes.'],
            discriminativeFeatures: ['Correlate with active cross-sectional findings.'],
          },
          recommendedInvestigations: recInvs,
          source: 'cached',
        };
      }
    }
  }

  return null;
}

export function formatDifferentialForImpression(item: DifferentialItem): string {
  const discrim = item.discriminativeFeatures ? ` <em>(${item.discriminativeFeatures})</em>` : '';
  return `<p><strong>${item.diagnosis}</strong> (${item.likelihood} probability) &mdash; ${item.rationale}.${discrim}</p>`;
}

export function formatAllDifferentialsForImpression(data: CaseInsightsData): string {
  const header = `<p><strong>Prioritized Differential Considerations:</strong></p>`;
  const items = data.differentials
    .map((item, idx) => `<p><strong>${idx + 1}. ${item.diagnosis}</strong> (${item.likelihood}) &mdash; ${item.rationale}</p>`)
    .join('');
  return `${header}${items}`;
}

export function formatInvestigationsForReport(investigations: RecommendedInvestigation[]): string {
  if (!investigations || investigations.length === 0) return '';
  const listItems = investigations
    .map((inv) => `<li><strong>${inv.name}</strong> (${inv.type}): ${inv.rationale}</li>`)
    .join('');
  return `<p><strong>Recommended Investigations:</strong></p><ul>${listItems}</ul>`;
}
