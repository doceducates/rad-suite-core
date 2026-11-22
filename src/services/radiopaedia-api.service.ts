import {
  SimilarCase,
  RADIOPAEDIA_CASES,
  getSimilarCasesByModalityAndBodyPart,
  searchSimilarCases as searchCuratedCases,
} from './similar-cases.service';
import { getActiveRadiopaediaAccount } from './radiopaedia-pool.service';

export interface RadiopaediaSearchResult {
  cases: SimilarCase[];
  source: 'live_api' | 'curated_offline';
  accountUsed?: string;
}

export async function fetchRadiopaediaCases(
  query: string,
  modality = 'CT',
  bodyPart?: string
): Promise<RadiopaediaSearchResult> {
  const activeAccount = await getActiveRadiopaediaAccount();

  // If no account connected or offline, use our rich curated library
  if (!activeAccount) {
    const local = query ? searchCuratedCases(query, modality) : getSimilarCasesByModalityAndBodyPart(modality, bodyPart);
    return { cases: local, source: 'curated_offline' };
  }

  try {
    const qParam = encodeURIComponent(query || `${modality} ${bodyPart || ''}`.trim());
    const res = await fetch(`https://radiopaedia.org/api/v1/cases?q=${qParam}`, {
      headers: {
        Authorization: `Bearer ${activeAccount.accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.cases) && data.cases.length > 0) {
        const mappedCases: SimilarCase[] = data.cases.slice(0, 10).map((c: any, idx: number) => ({
          id: `live-${c.id || idx}`,
          title: c.title || c.name || 'Radiopaedia Diagnostic Case',
          modality: (c.modality || modality || 'CT') as any,
          bodyPart: (c.system || bodyPart || 'Brain') as any,
          radiopaediaId: `cases/${c.id}`,
          radiopaediaUrl: c.url || `https://radiopaedia.org/cases/${c.id}`,
          demographics: c.patient_presentation || c.subtitle || 'Clinical diagnostic presentation',
          keyFindings: Array.isArray(c.findings) && c.findings.length > 0
            ? c.findings
            : [c.summary || 'Typical imaging presentation documented on Radiopaedia.'],
          diagnosticPearls: c.discussion || 'Review radiological hallmarks and diagnostic criteria.',
          differentialDiagnoses: Array.isArray(c.differentials) ? c.differentials : ['Clinical correlation recommended'],
        }));

        return { cases: mappedCases, source: 'live_api', accountUsed: activeAccount.name };
      }
    }
  } catch (err) {
    console.warn('[RadiopaediaAPI] Live API call failed, falling back to curated library:', err);
  }

  // Graceful fallback to curated cases
  const fallback = query ? searchCuratedCases(query, modality) : getSimilarCasesByModalityAndBodyPart(modality, bodyPart);
  return { cases: fallback, source: 'curated_offline', accountUsed: activeAccount.name };
}

export async function getRadiopaediaCaseDetails(
  caseId: string
): Promise<SimilarCase | null> {
  // Check curated cases first
  const existing = RADIOPAEDIA_CASES.find((c) => c.id === caseId || c.radiopaediaId === caseId);
  if (existing) return existing;

  const activeAccount = await getActiveRadiopaediaAccount();
  if (!activeAccount) return null;

  try {
    const rawId = caseId.replace('cases/', '').replace('live-', '');
    const res = await fetch(`https://radiopaedia.org/api/v1/cases/${rawId}`, {
      headers: {
        Authorization: `Bearer ${activeAccount.accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: `live-${data.id}`,
        title: data.title || 'Diagnostic Case',
        modality: (data.modality || 'CT') as any,
        bodyPart: (data.system || 'Brain') as any,
        radiopaediaId: `cases/${data.id}`,
        radiopaediaUrl: data.url || `https://radiopaedia.org/cases/${data.id}`,
        demographics: data.patient_presentation || '',
        keyFindings: Array.isArray(data.findings) ? data.findings : [data.summary || 'Diagnostic findings present.'],
        diagnosticPearls: data.discussion || '',
        differentialDiagnoses: Array.isArray(data.differentials) ? data.differentials : [],
      };
    }
  } catch {}

  return null;
}
