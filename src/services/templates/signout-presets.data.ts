// Layer 2: Common Abnormality Presets for Quick Sign-Out Dropdowns
import { AbnormalityPreset } from '@/types/signout';

export const LUMBAR_DISC_ABNORMALITIES: (level: string) => AbnormalityPreset[] = (lvl: string) => [
  {
    label: 'Mild Diffuse Bulge',
    text: `${lvl} intervertebral disc demonstrates mild diffuse posterior bulge indenting the anterior thecal sac without significant neural foraminal narrowing.`,
    impression: `Mild diffuse disc desiccation and posterior bulge at ${lvl}.`,
  },
  {
    label: 'Rt Paracentral Protrusion',
    text: `${lvl} intervertebral disc demonstrates right paracentral protrusion indenting the thecal sac and narrowing the right lateral recess with traversing nerve root impingement.`,
    impression: `Right paracentral disc protrusion at ${lvl} compromising right lateral recess and traversing nerve root.`,
  },
  {
    label: 'Lt Paracentral Protrusion',
    text: `${lvl} intervertebral disc demonstrates left paracentral protrusion indenting the thecal sac and narrowing the left lateral recess with traversing nerve root impingement.`,
    impression: `Left paracentral disc protrusion at ${lvl} compromising left lateral recess and traversing nerve root.`,
  },
  {
    label: 'Posterior Central Extrusion',
    text: `${lvl} intervertebral disc demonstrates posterior central extrusion with inferior migration, causing marked central spinal canal stenosis and thecal sac compression.`,
    impression: `Posterior central disc extrusion at ${lvl} causing central spinal canal stenosis.`,
  },
  {
    label: 'Bilateral Foraminal Stenosis',
    text: `${lvl} intervertebral disc shows broad-based posterior bulge with facet arthropathy and ligamentum flavum thickening, resulting in bilateral neural exit foraminal stenosis.`,
    impression: `Broad-based disc bulge at ${lvl} with bilateral neural exit foraminal narrowing.`,
  },
];

export const CERVICAL_DISC_ABNORMALITIES: (level: string) => AbnormalityPreset[] = (lvl: string) => [
  {
    label: 'Mild Diffuse Bulge',
    text: `${lvl} disc demonstrates mild diffuse posterior bulge effacing the anterior subarachnoid space without cord compression.`,
    impression: `Mild posterior disc bulge at ${lvl}.`,
  },
  {
    label: 'Posterior Ridge / Bar Complex',
    text: `${lvl} level demonstrates posterior disc-osteophyte bar causing central canal narrowing and indenting the anterior thecal sac.`,
    impression: `Posterior disc-osteophyte complex at ${lvl} causing central canal stenosis.`,
  },
  {
    label: 'Right Foraminal Protrusion',
    text: `${lvl} disc demonstrates right uncovertebral arthropathy and right foraminal disc protrusion narrowing the exit foramen with nerve root abutment.`,
    impression: `Right foraminal disc protrusion and uncovertebral hypertrophy at ${lvl}.`,
  },
  {
    label: 'Left Foraminal Protrusion',
    text: `${lvl} disc demonstrates left uncovertebral arthropathy and left foraminal disc protrusion narrowing the exit foramen with nerve root abutment.`,
    impression: `Left foraminal disc protrusion and uncovertebral hypertrophy at ${lvl}.`,
  },
  {
    label: 'Cord Abutment / Myelopathy',
    text: `${lvl} demonstrates large disc protrusion indenting the ventral spinal cord with focal T2 cord hyperintensity indicating compressive myelopathy.`,
    impression: `Marked disc protrusion at ${lvl} with compressive cervical myelopathy.`,
  },
];

export const BRAIN_ISCHEMIA_ABNORMALITIES: AbnormalityPreset[] = [
  {
    label: 'Acute MCA Territorial Infarction',
    text: 'Restricted diffusion with high DWI and low ADC signal in the left MCA territory involving left fronto-parietal cortex and white matter, in keeping with acute territorial infarction.',
    impression: 'Acute territorial ischemic infarct in left MCA distribution.',
  },
  {
    label: 'Acute Lacunar Infarct',
    text: 'Focal restricted diffusion on DWI with corresponding low ADC in the posterior limb of right internal capsule, indicating acute small vessel lacunar infarct.',
    impression: 'Acute lacunar infarct in posterior limb of right internal capsule.',
  },
  {
    label: 'Chronic Microvascular Ischemia (Fazekas 2)',
    text: 'Multiple punctate T2/FLAIR hyperintensities in bilateral periventricular and deep white matter without restricted diffusion, representing chronic small vessel ischemic changes.',
    impression: 'Moderate chronic microvascular white matter ischemic changes (Fazekas grade 2).',
  },
  {
    label: 'Hypoxic-Ischemic Encephalopathy (HIE)',
    text: 'Bilateral symmetric diffusion restriction involving the basal ganglia, thalami, and peri-Rolandic cortex, consistent with severe global hypoxic-ischemic injury.',
    impression: 'Bilateral deep gray and cortical changes consistent with hypoxic-ischemic encephalopathy.',
  },
];

export const BRAIN_HEMORRHAGE_ABNORMALITIES: AbnormalityPreset[] = [
  {
    label: 'Acute Hypertensive ICH',
    text: 'Hyperdense intraparenchymal hematoma measuring approximately 3.5 x 2.8 cm in the right putamen / external capsule with surrounding vasogenic edema and 5 mm midline shift.',
    impression: 'Acute hypertensive intracerebral hemorrhage in right basal ganglia with associated mass effect.',
  },
  {
    label: 'Subarachnoid Hemorrhage (SAH)',
    text: 'Acute hyperattenuation in the basal cisterns, ambient cisterns, and bilateral Sylvian fissures, representing diffuse acute aneurysmal subarachnoid hemorrhage.',
    impression: 'Diffuse acute subarachnoid hemorrhage involving basal cisterns and sylvian fissures.',
  },
  {
    label: 'Acute Subdural Hematoma (SDH)',
    text: 'Crescent-shaped hyperdense extra-axial collection along the right cerebral convexity measuring up to 10 mm in thickness with ipsilateral sulcal effacement.',
    impression: 'Acute right convexital subdural hematoma causing local mass effect.',
  },
  {
    label: 'Chronic Subdural Hematoma',
    text: 'Crescent-shaped hypodense / isodense extra-axial fluid collection along the left frontoparietal convexities with mild effacement of adjacent sulci.',
    impression: 'Chronic subdural hematoma along left cerebral hemisphere.',
  },
  {
    label: 'Epidural Hematoma (EDH)',
    text: 'Biconvex, lentiform hyperdense extra-axial collection in the right temporoparietal region underlying a linear calvarial fracture.',
    impression: 'Acute right temporoparietal epidural hematoma with underlying calvarial fracture.',
  },
];

export const CHEST_PULMONARY_ABNORMALITIES: AbnormalityPreset[] = [
  {
    label: 'Lobar Consolidation (Pneumonia)',
    text: 'Dense airspace consolidation with air bronchograms in the right lower lobe, in keeping with acute bacterial pneumonia.',
    impression: 'Right lower lobe airspace consolidation consistent with acute pneumonia.',
  },
  {
    label: 'Bilateral Ground-Glass Opacities',
    text: 'Bilateral patchy peripheral and subpleural ground-glass opacities with crazy-paving appearance, suspicious for atypical or viral pneumonia / pneumonitis.',
    impression: 'Bilateral subpleural ground-glass opacities; differential includes viral / atypical pneumonia.',
  },
  {
    label: 'Solitary Pulmonary Nodule',
    text: 'Well-circumscribed non-calcified solid pulmonary nodule measuring 8 mm in the right upper lobe without cavitation or spiculated margins.',
    impression: '8 mm solid non-calcified pulmonary nodule in right upper lobe (Fleischner protocol follow-up advised).',
  },
  {
    label: 'Centrilobular Emphysema',
    text: 'Extensive upper-lobe predominant centrilobular and paraseptal emphysematous lucencies with apical bullous formation.',
    impression: 'Severe centrilobular and apical bullous emphysema.',
  },
];

export const CHEST_PLEURAL_ABNORMALITIES: AbnormalityPreset[] = [
  {
    label: 'Moderate Right Pleural Effusion',
    text: 'Moderate right-sided free-flowing pleural effusion with secondary compressive atelectasis of the adjacent right lower lobe.',
    impression: 'Moderate right pleural effusion with compressive atelectasis.',
  },
  {
    label: 'Moderate Left Pleural Effusion',
    text: 'Moderate left-sided free-flowing pleural effusion with secondary compressive atelectasis of the adjacent left lower lobe.',
    impression: 'Moderate left pleural effusion with compressive atelectasis.',
  },
  {
    label: 'Right Pneumothorax',
    text: 'Right-sided pneumothorax with approximately 25% lung volume collapse without mediastinal shift.',
    impression: 'Right pneumothorax (approx 25%).',
  },
  {
    label: 'Bilateral Pleural Effusions',
    text: 'Bilateral mild to moderate pleural effusions, greater on the right, with passive basilar atelectasis.',
    impression: 'Bilateral pleural effusions with basal atelectasis.',
  },
];
