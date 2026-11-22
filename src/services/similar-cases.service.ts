export interface SimilarCase {
  id: string;
  title: string;
  modality: 'CT' | 'MRI' | 'XR';
  bodyPart: 'Brain' | 'Spine' | 'Chest' | 'Abdomen' | 'MSK';
  radiopaediaId: string;
  radiopaediaUrl: string;
  demographics: string;
  keyFindings: string[];
  diagnosticPearls: string;
  differentialDiagnoses: string[];
}

export const RADIOPAEDIA_CASES: SimilarCase[] = [
  {
    id: 'rad-case-01',
    title: 'Acute Middle Cerebral Artery (MCA) Infarct',
    modality: 'CT',
    bodyPart: 'Brain',
    radiopaediaId: 'cases/74921',
    radiopaediaUrl: 'https://radiopaedia.org/cases/middle-cerebral-artery-infarct-hyperdense-mca-sign',
    demographics: '64y M, sudden right hemiparesis & expressive aphasia 2h prior',
    keyFindings: [
      'Dense hyperdense MCA sign in the left M1 segment.',
      'Loss of gray-white matter differentiation in left lentiform nucleus.',
      'Effacement of cortical sulci over the left fronto-parietal operculum.',
      'No acute intracranial hemorrhage or mass effect.',
    ],
    diagnosticPearls: 'Early ischemic changes on NCCT within 6h. Calculate ASPECTS score (here 7/10). STAT mechanical thrombectomy candidate.',
    differentialDiagnoses: ['Seizure with Todd postictal paresis', 'Hemiplegic migraine', 'Herpes simplex encephalitis'],
  },
  {
    id: 'rad-case-02',
    title: 'Acute Subdural Hematoma (SDH) with Midline Shift',
    modality: 'CT',
    bodyPart: 'Brain',
    radiopaediaId: 'cases/48192',
    radiopaediaUrl: 'https://radiopaedia.org/cases/acute-subdural-haematoma',
    demographics: '72y F, ground-level fall on anticoagulation, GCS 11',
    keyFindings: [
      'Crescentic hyperdense extra-axial collection along right cerebral convexity (12mm max thickness).',
      'Crosses cranial suture lines, bounded by falx cerebri.',
      'Severe mass effect with 8mm right-to-left midline shift.',
      'Partial effacement of right lateral ventricle and uncal herniation risk.',
    ],
    diagnosticPearls: 'Urgent neurosurgical consultation for evacuation when thickness > 10mm or shift > 5mm.',
    differentialDiagnoses: ['Epidural hematoma (lentiform, suture-limited)', 'Chronic/subacute SDH with rebleed', 'Dural metastasis'],
  },
  {
    id: 'rad-case-03',
    title: 'L5-S1 Extruded Lumbar Disc Herniation',
    modality: 'MRI',
    bodyPart: 'Spine',
    radiopaediaId: 'cases/61902',
    radiopaediaUrl: 'https://radiopaedia.org/cases/lumbar-disc-extrusion-l5-s1',
    demographics: '42y M, severe right S1 radicular pain & absent ankle jerk',
    keyFindings: [
      'Large posterior right paracentral disc extrusion at L5-S1 measuring 8 x 11 mm.',
      'Marked compression and posterior displacement of traversing right S1 nerve root.',
      'Severe right lateral recess stenosis.',
      'Associated high-intensity zone (HIZ) in posterior annulus fibrosus.',
    ],
    diagnosticPearls: 'Differentiate protrusion vs extrusion: extrusion anteroposterior diameter is greater than the base at disc margin.',
    differentialDiagnoses: ['Synovial cyst', 'Conjoined nerve root variant', 'Schwannoma'],
  },
  {
    id: 'rad-case-04',
    title: 'Multiple Sclerosis: Active Demyelinating Plaque',
    modality: 'MRI',
    bodyPart: 'Brain',
    radiopaediaId: 'cases/52310',
    radiopaediaUrl: 'https://radiopaedia.org/cases/multiple-sclerosis-dawson-fingers',
    demographics: '31y F, subacute optic neuritis & lower extremity paresthesias',
    keyFindings: [
      'Multiple periventricular perpendicular ovoid T2/FLAIR hyperintensities (Dawson fingers).',
      'Involvement of corpus callosum callososeptal interface and middle cerebellar peduncles.',
      'Incomplete peripheral ring enhancement on post-contrast T1, indicating active blood-brain barrier disruption.',
    ],
    diagnosticPearls: 'Dissemination in space (DIS) and dissemination in time (DIT) per 2017 McDonald Criteria.',
    differentialDiagnoses: ['Neuromyelitis optica (NMOSD)', 'Acute disseminated encephalomyelitis (ADEM)', 'CNS vasculitis'],
  },
  {
    id: 'rad-case-05',
    title: 'Acute Appendicitis with Appendicolith',
    modality: 'CT',
    bodyPart: 'Abdomen',
    radiopaediaId: 'cases/89124',
    radiopaediaUrl: 'https://radiopaedia.org/cases/acute-appendicitis-with-appendicolith',
    demographics: '28y M, right lower quadrant tenderness & leukocytosis',
    keyFindings: [
      'Dilated, fluid-filled appendix measuring 11mm in outer diameter.',
      'High-attenuation calcified appendicolith (6mm) at the appendiceal base.',
      'Periappendiceal fat stranding and circumferential wall thickening with hyperenhancement.',
      'No extraluminal air or drainable abscess collection.',
    ],
    diagnosticPearls: 'Diameter > 6mm with mural thickening and secondary inflammation is diagnostic of acute appendicitis.',
    differentialDiagnoses: ['Mesenteric adenitis', 'Cecal diverticulitis', 'Terminal ileitis / Crohn disease'],
  },
  {
    id: 'rad-case-06',
    title: 'Acute Pulmonary Embolism (Saddle & Lobar)',
    modality: 'CT',
    bodyPart: 'Chest',
    radiopaediaId: 'cases/39104',
    radiopaediaUrl: 'https://radiopaedia.org/cases/pulmonary-thromboembolism',
    demographics: '59y F, sudden pleuritic chest pain & tachycardia, post-op day 5',
    keyFindings: [
      'Large saddle pulmonary embolus straddling main pulmonary bifurcation.',
      'Extensive non-occlusive filling defects in right and left main pulmonary arteries.',
      'Right ventricular to left ventricular diameter ratio RV/LV = 1.4, indicating RV strain.',
      'Interventricular septum flattening in diastole.',
    ],
    diagnosticPearls: 'RV/LV diameter > 1.0 on transverse CT predicts acute right ventricular failure and adverse outcomes.',
    differentialDiagnoses: ['Pulmonary artery sarcoma', 'Mucus plugging in atelectatic lobe', 'Respiratory artifact'],
  },
];

export function getSimilarCasesByModalityAndBodyPart(
  modality?: string,
  bodyPart?: string
): SimilarCase[] {
  const normMod = (modality || '').toUpperCase();
  const normModClean = normMod.includes('MR') ? 'MRI' : normMod.includes('CT') ? 'CT' : null;

  return RADIOPAEDIA_CASES.filter((c) => {
    if (normModClean && c.modality !== normModClean) return false;
    if (bodyPart && !c.bodyPart.toLowerCase().includes(bodyPart.toLowerCase())) return false;
    return true;
  });
}

export function searchSimilarCases(query: string, modality?: string): SimilarCase[] {
  const q = query.toLowerCase().trim();
  const base = getSimilarCasesByModalityAndBodyPart(modality);
  if (!q) return base;

  return RADIOPAEDIA_CASES.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.bodyPart.toLowerCase().includes(q) ||
      c.keyFindings.some((k) => k.toLowerCase().includes(q)) ||
      c.diagnosticPearls.toLowerCase().includes(q) ||
      c.differentialDiagnoses.some((d) => d.toLowerCase().includes(q))
  );
}
