import { describe, it, expect } from 'vitest';
import {
  extractPrecachedInsights,
  generateCaseInsights,
  formatDifferentialForImpression,
  formatAllDifferentialsForImpression,
  formatInvestigationsForReport,
  CaseInsightsData,
  DifferentialItem,
} from '@/services/case-insights.service';

describe('Case Insights & Viva Briefing Service', () => {
  describe('1. Pre-cached Insights Extraction', () => {
    it('should extract pre-cached insights from reports content_json', () => {
      const mockCached: CaseInsightsData = {
        primaryDifferential: 'Lumbar disc herniation with nerve root impingement',
        differentials: [
          {
            diagnosis: 'L4-L5 disc herniation',
            likelihood: 'High',
            rationale: 'Posterocentral extrusion contacting descending L5 nerve root.',
            discriminativeFeatures: 'Acute radiculopathy corresponding to L5 dermatome.',
          },
          {
            diagnosis: 'Facet arthropathy',
            likelihood: 'Moderate',
            rationale: 'Hypertrophic changes at L4-L5.',
            discriminativeFeatures: 'Absence of significant canal stenosis.',
          },
        ],
        vivaBriefing: {
          demographics: 'Common in adults aged 30-50 years, slight male predominance.',
          hallmarkSigns: ['High-intensity zone (HIZ)', 'Nerve root displacement', 'Loss of disc height'],
          discriminativeFeatures: ['Differentiate extrusion from protrusion by neck/base ratio.'],
          examinerTraps: ['Distinguish sequestered disc fragment from epidural hematoma/schwannoma.'],
        },
        recommendedInvestigations: [
          {
            type: 'imaging',
            name: 'Dedicated contrast-enhanced MRI Spine',
            rationale: 'Rule out postoperative epidural scar vs recurrent disc fragment if prior surgery.',
          },
          {
            type: 'laboratory',
            name: 'ESR and CRP',
            rationale: 'Exclude discitis/osteomyelitis in severe unremitting back pain.',
          },
        ],
        generatedAt: '2026-10-18T10:00:00.000Z',
        source: 'cached',
      };

      const result = extractPrecachedInsights({
        contentJson: { caseInsights: mockCached },
      });

      expect(result).toBeDefined();
      expect(result?.primaryDifferential).toBe('Lumbar disc herniation with nerve root impingement');
      expect(result?.differentials.length).toBe(2);
      expect(result?.source).toBe('cached');
      expect(result?.vivaBriefing.hallmarkSigns).toContain('High-intensity zone (HIZ)');
      expect(result?.recommendedInvestigations.some((inv) => inv.name.includes('ESR and CRP'))).toBe(true);
    });

    it('should extract structured differential text from patients clinicalNotes when contentJson is empty', () => {
      const clinicalNotes = `DIFFERENTIAL DIAGNOSIS:
1. Ankylosing Spondylitis (High) - Bilateral symmetric sacroiliac joint erosions.
2. Enteropathic Arthritis (Moderate) - Similar axial findings with GI symptoms.
RECOMMENDED LABS: HLA-B27, ESR, CRP.`;

      const result = extractPrecachedInsights({
        contentJson: null,
        clinicalNotes,
      });

      expect(result).toBeDefined();
      expect(result?.source).toBe('cached');
      expect(result?.differentials.length).toBeGreaterThan(0);
      expect(result?.differentials[0].diagnosis).toContain('Ankylosing Spondylitis');
      expect(result?.recommendedInvestigations.some((inv) => inv.name.includes('HLA-B27'))).toBe(true);
    });

    it('should return null if no cached data exists', () => {
      const result = extractPrecachedInsights({
        contentJson: null,
        clinicalNotes: '',
      });
      expect(result).toBeNull();
    });
  });

  describe('2. Case Insights Generation & Viva Briefing (Offline Rule Engine)', () => {
    it('should generate ranked differentials, viva briefing, and lab markers in offline mode', async () => {
      const findings = 'Ill-defined hyperdense mass with surrounding vasogenic edema in the right frontal lobe.';
      const result = await generateCaseInsights({
        findings,
        modality: 'CT',
        clinicalHistory: 'Headache and progressive left-sided weakness',
      });

      expect(result).toBeDefined();
      expect(result.primaryDifferential).toBeTruthy();
      expect(result.differentials.length).toBeGreaterThanOrEqual(1);

      // Verify ranked differentials structure
      const primary = result.differentials[0];
      expect(primary.diagnosis).toBeTruthy();
      expect(['High', 'Moderate', 'Consider']).toContain(primary.likelihood);
      expect(primary.rationale).toBeTruthy();

      // Verify Viva Talking Points
      expect(result.vivaBriefing).toBeDefined();
      expect(result.vivaBriefing.demographics).toBeTruthy();
      expect(result.vivaBriefing.hallmarkSigns.length).toBeGreaterThan(0);
      expect(result.vivaBriefing.discriminativeFeatures.length).toBeGreaterThan(0);

      // Verify Recommended Investigations (Contrast sequence + Lab markers)
      expect(result.recommendedInvestigations.length).toBeGreaterThan(0);
      const hasImaging = result.recommendedInvestigations.some((inv) => inv.type === 'imaging');
      expect(hasImaging).toBe(true);
    });

    it('should handle specialized spine / sacroiliac keywords with HLA-B27 and inflammatory lab markers', async () => {
      const findings = 'Symmetric sclerosis and erosion of both sacroiliac joints with joint space pseudo-widening.';
      const result = await generateCaseInsights({
        findings,
        modality: 'CT',
        clinicalHistory: 'Chronic inflammatory lower back pain in a 24-year-old male',
      });

      expect(result.primaryDifferential.toLowerCase()).toMatch(/sacroiliitis|ankylosing|spondylo/);
      const hasHlaB27 = result.recommendedInvestigations.some(
        (inv) => inv.name.toUpperCase().includes('HLA-B27') || inv.rationale.toUpperCase().includes('HLA-B27')
      );
      expect(hasHlaB27).toBe(true);
      expect(result.vivaBriefing.narrowingQuestions?.length).toBeGreaterThan(0);
    });

    it('should distinguish degenerative lumbar disc bulge from sacroiliitis when SI joints are unremarkable', async () => {
      const findings = 'L5-S1 diffuse and central disc bulge with posterior annular tear. Visualized sacroiliac joints are unremarkable.';
      const result = await generateCaseInsights({
        findings,
        modality: 'MR',
        clinicalHistory: 'Low back pain radiating to left leg in 43Y male',
      });

      expect(result.primaryDifferential.toLowerCase()).toMatch(/degenerative|disc|spondylosis/);
      expect(result.primaryDifferential.toLowerCase()).not.toContain('sacroiliitis');
      expect(result.vivaBriefing.narrowingQuestions?.length).toBeGreaterThan(0);
    });
  });

  describe('3. Clinical Formatting Helpers for Impression Insertion', () => {
    const sampleItem: DifferentialItem = {
      diagnosis: 'High-grade Glioma',
      likelihood: 'High',
      rationale: 'Heterogeneously enhancing mass with necrotic center and thick irregular rim.',
      discriminativeFeatures: 'Distinguish from solitary cerebral abscess by DWI restriction pattern.',
    };

    it('should format a single differential item into clean HTML for report impression insertion', () => {
      const formatted = formatDifferentialForImpression(sampleItem);
      expect(formatted).toContain('<strong>High-grade Glioma</strong>');
      expect(formatted).toContain('(High probability)');
      expect(formatted).toContain('Heterogeneously enhancing mass');
    });

    it('should format all differentials into a prioritized block', () => {
      const mockData: CaseInsightsData = {
        primaryDifferential: sampleItem.diagnosis,
        differentials: [
          sampleItem,
          {
            diagnosis: 'Cerebral Abscess',
            likelihood: 'Moderate',
            rationale: 'Rim-enhancing lesion with vasogenic edema.',
            discriminativeFeatures: 'Restricted diffusion within cavity center on DWI.',
          },
        ],
        vivaBriefing: {
          demographics: 'Adults 45-70 years.',
          hallmarkSigns: ['Ring enhancement', 'Vasogenic edema'],
          discriminativeFeatures: ['DWI central restriction'],
          examinerTraps: ['Metastasis vs Glioblastoma multiforme'],
        },
        recommendedInvestigations: [],
        generatedAt: '2026-10-18T10:00:00.000Z',
        source: 'ai',
      };

      const block = formatAllDifferentialsForImpression(mockData);
      expect(block).toContain('<strong>1. High-grade Glioma</strong>');
      expect(block).toContain('<strong>2. Cerebral Abscess</strong>');
    });

    it('should format recommended investigations into report recommendation HTML', () => {
      const investigations = [
        {
          type: 'imaging' as const,
          name: 'Contrast-enhanced MRI Brain with Perfusion and MRS',
          rationale: 'Assess choline/NAA ratio and rCBV elevated perfusion.',
        },
        {
          type: 'laboratory' as const,
          name: 'Serum ESR, CRP and Blood Cultures',
          rationale: 'Rule out pyogenic or infectious etiology.',
        },
      ];

      const html = formatInvestigationsForReport(investigations);
      expect(html).toContain('Recommended Investigations');
      expect(html).toContain('Contrast-enhanced MRI Brain');
      expect(html).toContain('Serum ESR, CRP');
    });
  });
});
