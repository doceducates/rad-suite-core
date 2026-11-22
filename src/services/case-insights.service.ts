/**
 * Case Insights & Viva Briefing Domain Service (Layer 2)
 * Strictly under 250 lines invariant.
 * Server-only service executing AI Router completions and deterministic fallback.
 */

import { callAICompletion, extractJsonFromModelResponse } from './ai-router.service';
import { generateShadowDifferentials } from './report-analysis.service';
import type {
  DifferentialItem,
  RecommendedInvestigation,
  CaseInsightsData,
  GenerateCaseInsightsOptions,
} from '@/types/case-insights';

// Re-export types and client-safe formatters for server callers
export * from '@/types/case-insights';
export {
  extractPrecachedInsights,
  formatDifferentialForImpression,
  formatAllDifferentialsForImpression,
  formatInvestigationsForReport,
} from '@/lib/case-insights-format';

export async function generateCaseInsights(
  options: GenerateCaseInsightsOptions
): Promise<CaseInsightsData> {
  const { findings, modality = 'CT', clinicalHistory = '', patientAge, patientGender, studyDescription } = options;

  const prompt = `You are an academic radiologist examiner.
Analyze these ${modality} findings and provide a structured Viva & DDx briefing:
${studyDescription ? `Exam: ${studyDescription}. ` : ''}${patientAge || patientGender ? `Demographics: ${patientAge || ''} ${patientGender || ''}. ` : ''}${clinicalHistory ? `History: ${clinicalHistory}. ` : ''}
Findings: "${findings}"

Return STRICT JSON:
{
  "primaryDifferential": "Most definitive primary diagnosis",
  "differentials": [{"diagnosis": "Name", "likelihood": "High"|"Moderate"|"Consider", "rationale": "Findings", "discriminativeFeatures": "Distinguish from mimics"}],
  "vivaBriefing": {
    "demographics": "Typical epidemiology",
    "hallmarkSigns": ["Named signs"],
    "discriminativeFeatures": ["Examiner question/criteria"],
    "narrowingQuestions": ["Targeted questions to ask patient/clinician to narrow down differentials"],
    "examinerTraps": ["Common pitfall"],
    "guidelinePearl": "Classification criteria"
  },
  "recommendedInvestigations": [{"type": "imaging"|"laboratory"|"clinical", "name": "Investigation name", "rationale": "Clinical rationale"}]
}`;

  const responseText = await callAICompletion(
    {
      systemPrompt: 'You are an academic radiologist examiner preparing candidate viva talking points and differential diagnosis pearls. Return strict JSON only.',
      userPrompt: prompt,
      jsonMode: true,
      maxTokens: 1400,
    },
    'copilot'
  );

  if (responseText) {
    const parsed = extractJsonFromModelResponse<any>(responseText);
    if (parsed && Array.isArray(parsed.differentials) && parsed.differentials.length > 0) {
      return {
        primaryDifferential: parsed.primaryDifferential || parsed.differentials[0].diagnosis,
        differentials: parsed.differentials,
        vivaBriefing: parsed.vivaBriefing || {
          demographics: `${patientAge ? `${patientAge}Y ` : ''}${patientGender || 'Adult'} presentation`,
          hallmarkSigns: ['Characteristic morphological pattern on ' + modality],
          discriminativeFeatures: ['Correlate with chronicity and prior imaging'],
          narrowingQuestions: [
            'Correlate clinical symptom duration with mechanical vs inflammatory features.',
            'Inquire regarding past surgical or intervention history.',
          ],
        },
        recommendedInvestigations: Array.isArray(parsed.recommendedInvestigations) ? parsed.recommendedInvestigations : [],
        generatedAt: new Date().toISOString(),
        source: 'ai',
      };
    }
  }

  // Deterministic rule-based fallback when AI is offline
  return generateDeterministicInsights(findings, modality, clinicalHistory);
}

function generateDeterministicInsights(findings: string, modality: string, history: string): CaseInsightsData {
  const lowerF = `${findings} ${history}`.toLowerCase();
  const shadowDiffs = generateShadowDifferentials(`${findings} ${history}`, modality);

  const isSacroiliacNormal = /sacroiliac joints? (are|is)? ?unremarkable|normal sacroiliac|unremarkable sacroiliac/i.test(lowerF);
  const isSacroiliitis = !isSacroiliacNormal && /(sacroili|spondylo|ankylos|si joint)/i.test(lowerF);
  const isDegenerativeSpine = /disc (bulge|herniat|protrus|extrusion)|canal stenosis|thecal sac|radiculopath|annular tear|spondylosis/i.test(lowerF);
  const isNeuroMass = /brain|edema|mass|ring enhance|midline shift|glioma/i.test(lowerF);
  const isChest = /nodule|consolidation|infiltrate|ground[- ]glass|pulmonary/i.test(lowerF);

  const primary = isDegenerativeSpine
    ? 'Degenerative Disc Disease & Spondylosis with Neural Compromise'
    : isSacroiliitis
    ? 'Sacroiliitis (Axial Spondyloarthritis / Ankylosing Spondylitis)'
    : isNeuroMass
    ? 'Intracranial Space-Occupying Lesion (Neoplasm vs Infection)'
    : isChest
    ? 'Indeterminate Pulmonary Nodule / Parenchymal Infiltrate'
    : shadowDiffs[0] || 'Indeterminate cross-sectional finding';

  const differentials: DifferentialItem[] = isDegenerativeSpine
    ? [
        { diagnosis: 'Lumbar / Cervical Disc Bulge / Herniation with Nerve Root Impingement', likelihood: 'High', rationale: 'Annular contour alteration with thecal sac or exiting/traversing nerve root abutment.', discriminativeFeatures: 'Correlate with specific dermatomal radicular symptoms.' },
        { diagnosis: 'Facet Joint Arthropathy & Ligamentum Flavum Hypertrophy', likelihood: 'Moderate', rationale: 'Bony hypertrophic changes and soft tissue thickening narrowing lateral recesses.', discriminativeFeatures: 'Mechanical back pain accentuated by extension; absence of acute disc extrusion.' },
        { diagnosis: 'Concomitant Spondylolisthesis / Lateral Recess Stenosis', likelihood: 'Consider', rationale: 'Vertebral alignment shift or sagittal dimension reduction.', discriminativeFeatures: 'Dynamic instability on standing or flexion-extension views.' },
      ]
    : isSacroiliitis
    ? [
        { diagnosis: 'Ankylosing Spondylitis (Axial SpA)', likelihood: 'High', rationale: 'Symmetric iliac side sclerosis, erosions, and joint space alterations.', discriminativeFeatures: 'Bilateral symmetric involvement with syndesmophytes.' },
        { diagnosis: 'Infectious / Septic Sacroiliitis', likelihood: 'Moderate', rationale: 'Erosive changes with capsular or periarticular edema.', discriminativeFeatures: 'Typically unilateral; marked pain and rapid destruction.' },
        { diagnosis: 'Osteitis Condensans Ilii', likelihood: 'Consider', rationale: 'Triangular sclerosis limited to the iliac bone.', discriminativeFeatures: 'Preserved joint space without erosions, usually in multiparous females.' },
      ]
    : shadowDiffs.map((d, idx) => ({
        diagnosis: d,
        likelihood: idx === 0 ? 'High' : idx === 1 ? 'Moderate' : 'Consider',
        rationale: `Cross-sectional imaging features on ${modality} suggest ${d.toLowerCase()}.`,
        discriminativeFeatures: 'Correlate with clinical presentation, progression, and prior studies.',
      }));

  const recommendedInvestigations: RecommendedInvestigation[] = isDegenerativeSpine
    ? [
        { type: 'clinical', name: 'Neurological Examination (L4, L5, S1 motor/reflex testing)', rationale: 'Map specific functional nerve root deficit and assess motor power.' },
        { type: 'imaging', name: 'Erect Flexion-Extension Dynamic Radiographs', rationale: 'Assess dynamic spinal instability and translational subluxation.' },
        { type: 'clinical', name: 'Electromyography & Nerve Conduction Studies (EMG/NCS)', rationale: 'Differentiate true radiculopathy from peripheral neuropathy.' },
      ]
    : isSacroiliitis
    ? [
        { type: 'imaging', name: 'Contrast-enhanced MRI Sacroiliac Joints (STIR/T1)', rationale: 'Detect active sacroiliitis bone marrow edema per ASAS.' },
        { type: 'laboratory', name: 'Serum HLA-B27 genotype', rationale: 'Strong diagnostic marker for axial spondyloarthropathies.' },
        { type: 'laboratory', name: 'Serum ESR and High-Sensitivity CRP', rationale: 'Quantify active systemic and articular inflammatory burden.' },
      ]
    : isNeuroMass
    ? [
        { type: 'imaging', name: 'Multimodal MRI Brain with Perfusion, DWI and MRS', rationale: 'Differentiate high-grade neoplasm from abscess or demyelination.' },
        { type: 'laboratory', name: 'Serum Inflammatory Markers (ESR/CRP) & Blood Cultures', rationale: 'Rule out occult pyogenic or fungal intracranial infection.' },
      ]
    : [
        { type: 'imaging', name: `Dedicated contrast-enhanced ${modality} protocol`, rationale: 'Optimize tissue contrast and enhancement kinetics.' },
        { type: 'laboratory', name: 'Routine metabolic and inflammatory panel (ESR, CRP)', rationale: 'Correlate with systemic laboratory markers.' },
      ];

  const narrowingQuestions: string[] = isDegenerativeSpine
    ? [
        'Ask about cauda equina red flags: Acute urinary retention/incontinence, saddle anesthesia, or progressive bilateral foot drop?',
        'Ask dermatomal distribution: Does pain radiate past the knee into the great toe (L5) or lateral foot/heel (S1)?',
        'Ask response to conservative management: Duration of symptoms and previous physical therapy or epidural injections?',
      ]
    : isSacroiliitis
    ? [
        'Ask regarding inflammatory vs mechanical back pain: Is stiffness worse in the morning (>30 min) and relieved by activity?',
        'Ask about extra-articular features: Personal or family history of psoriasis, inflammatory bowel disease, or uveitis?',
        'Ask about acute unilateral onset, fever, or prior pelvic surgery to rule out septic sacroiliitis.',
        'In females with bilateral triangular iliac sclerosis, ask obstetric history and parity (favors Osteitis Condensans Ilii).',
      ]
    : [
        'Ask regarding duration, acute vs insidious onset, and response to previous therapy.',
        'Ask regarding constitutional signs: Unexplained weight loss, night sweats, or history of primary neoplasm.',
      ];

  return {
    primaryDifferential: primary,
    differentials: differentials.length > 0 ? differentials : [{ diagnosis: primary, likelihood: 'High', rationale: 'Imaging features consistent with presentation.' }],
    vivaBriefing: {
      demographics: isDegenerativeSpine ? 'Adults 35-70y with mechanical or radicular symptoms.' : isSacroiliitis ? 'Young adults (20-40y), male predominance in AS.' : 'Evaluate based on patient age and co-morbidities.',
      hallmarkSigns: isDegenerativeSpine ? ['Disc protrusion/extrusion', 'High-intensity zone (annular tear)', 'Thecal sac indent', 'Neuroforaminal narrowing'] : isSacroiliitis ? ['Subchondral sclerosis', 'SI joint pseudo-widening', 'Ankylosis'] : ['Characteristic signal pattern on ' + modality],
      discriminativeFeatures: isDegenerativeSpine ? ['Disc herniation with radiculopathy vs facet arthropathy (extension-aggravated axial pain).'] : isSacroiliitis ? ['Bilateral symmetric (AS/Enteropathic) vs Asymmetric (Psoriatic/Reactive/Septic).'] : ['Compare with previous studies to establish stability.'],
      narrowingQuestions,
      examinerTraps: isDegenerativeSpine ? ['Always confirm the symptomatic side: an anatomical disc protrusion may be asymptomatic while contralateral foraminal stenosis causes pain.'] : isSacroiliitis ? ['Do not confuse osteitis condensans ilii (normal joint space) with true sacroiliitis.'] : ['Always scrutinize blind spots.'],
    },
    recommendedInvestigations,
    generatedAt: new Date().toISOString(),
    source: 'fallback',
  };
}
