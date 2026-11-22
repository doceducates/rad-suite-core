// Layer 2: Sign-Out Master Anatomical Templates (Brain, MSK, Body & MRCP)
import { SignoutTemplate } from '@/types/signout';
import { BRAIN_ISCHEMIA_ABNORMALITIES, BRAIN_HEMORRHAGE_ABNORMALITIES } from './signout-presets.data';

export const MRI_BRAIN_TEMPLATE: SignoutTemplate = {
  id: 'mri-brain',
  modalityKey: 'MRI Brain',
  title: 'MRI Brain (Routine Multiparametric)',
  techniqueStandardized:
    'Multiplanar multisequence MRI of the brain including Axial T1W, T2W, FLAIR, DWI/ADC, Coronal T2W, and Sagittal T1W sequences.',
  techniqueHmis: 'Multiplanar, Multi Echo, Axial and Sagittal, T1 and T2 WIs without contrast.',
  defaultHistory: '62Y Male with sudden onset weakness and slurred speech. Known hypertensive.',
  quickLevels: ['Parenchyma', 'DWI/Ischemia', 'Ventricles/Midline', 'Posterior Fossa', 'Sinuses/Vessels'],
  sections: [
    {
      id: 'cerebral_parenchyma',
      heading: 'Cerebral Parenchyma & Cortex',
      shortLabel: 'Parenchyma',
      normalStandardized:
        'Cerebral hemispheres demonstrate expected signal characteristics on all sequences with preserved gray-white matter differentiation. No focal cortical dysplasia, gliosis, or white matter lesion.',
      normalHmis:
        'Normal cerebral parenchymal signal intensity on all sequences, with preserved grey-white matter differentiation. No focal intra/extra-axial mass lesion is identified.',
      commonAbnormalities: BRAIN_ISCHEMIA_ABNORMALITIES,
    },
    {
      id: 'ischemia_hemorrhage',
      heading: 'Ischemia (DWI/ADC) & Hemorrhage',
      shortLabel: 'DWI/ADC',
      normalStandardized:
        'No area of restricted diffusion on DWI with corresponding low signal on ADC map to suggest acute cytotoxic edema or acute territorial infarction. Susceptibility sequences demonstrate no intracranial hemorrhage.',
      normalHmis:
        'No abnormal area of restricted diffusion is seen to suggest acute infarction. No evidence of intracranial haemorrhage is noted.',
      commonAbnormalities: BRAIN_HEMORRHAGE_ABNORMALITIES,
    },
    {
      id: 'deep_gray_posterior',
      heading: 'Deep Gray Matter & Posterior Fossa',
      shortLabel: 'Brainstem/Post Fossa',
      normalStandardized:
        'Bilateral basal ganglia, internal capsules, and thalami demonstrate normal signal intensity. Midbrain, pons, medulla, and cerebellar hemispheres are unremarkable.',
      normalHmis:
        'The posterior cranial fossa, midbrain and brainstem appear unremarkable.',
    },
    {
      id: 'ventricles_cisterns',
      heading: 'Ventricular System & Cisterns',
      shortLabel: 'Ventricles/Midline',
      normalStandardized:
        'Ventricular system, basal cisterns, and cortical sulcal spaces demonstrate age-appropriate caliber and symmetry. No hydrocephalus, transependymal edema, or midline shift.',
      normalHmis:
        'The ventricular and extra-ventricular spaces are normal with no evidence of hydrocephalus. No midline shift or mass effect is seen.',
    },
    {
      id: 'sella_orbits_sinuses',
      heading: 'Sella, Orbits, Sinuses & Flow Voids',
      shortLabel: 'Vessels/Sinuses',
      normalStandardized:
        'Pituitary gland and infundibular stalk are midline. Bilateral orbits appear symmetric. Major intracranial flow voids are preserved. Visualized paranasal sinuses and mastoid air cells are clear.',
      normalHmis:
        'The sellar and suprasellar regions appear unremarkable. Bilateral orbits appear normal. Paranasal sinuses and mastoid air cells are clear. Major flow voids are preserved.',
    },
  ],
  normalImpression: [
    'No acute intra-axial or extra-axial intracranial abnormality.',
    'Preserved gray-white differentiation with no acute territorial infarction, hemorrhage, or mass effect.',
  ],
};

export const MRI_KNEE_TEMPLATE: SignoutTemplate = {
  id: 'mri-knee',
  modalityKey: 'MRI Knee',
  title: 'MRI Knee Joint',
  techniqueStandardized:
    'High-resolution multiplanar knee MRI including Sagittal T1W, Sagittal T2W FS, Coronal T2W FS, Coronal PD, and Axial PD FS sequences.',
  techniqueHmis: 'Multiplanar, multisequential non-contrast MRI knee joint.',
  defaultHistory: '27Y Male with twisting injury to knee during sports; pain and instability.',
  quickLevels: ['ACL', 'PCL', 'Medial Meniscus', 'Lateral Meniscus', 'Cartilage/Effusion'],
  sections: [
    {
      id: 'cruciate_ligaments',
      heading: 'Cruciate Ligaments (ACL & PCL)',
      shortLabel: 'Cruciates',
      normalStandardized:
        'Anterior cruciate ligament (ACL) demonstrates normal taut orientation and low signal without tear. Posterior cruciate ligament (PCL) is intact with normal posterior curvature.',
      normalHmis:
        'The anterior cruciate ligament (ACL) and posterior cruciate ligament (PCL) are intact with normal signal characteristics.',
    },
    {
      id: 'menisci',
      heading: 'Medial & Lateral Menisci',
      shortLabel: 'Menisci',
      normalStandardized:
        'Medial and lateral menisci demonstrate normal triangular morphology and low signal intensity without intrameniscal tear, root tear, or extrusion.',
      normalHmis:
        'The medial and lateral menisci are normal in morphology and signal intensity with no evidence of meniscal tear or extrusion.',
    },
    {
      id: 'collaterals_extensor',
      heading: 'Collateral Ligaments & Extensor Mechanism',
      shortLabel: 'Collaterals',
      normalStandardized:
        'MCL complex and LCL / posterolateral corner are intact. Quadriceps tendon, patellar tendon, and retinacula demonstrate normal caliber and signal.',
      normalHmis:
        'The medial collateral ligament (MCL), lateral collateral ligament (LCL), quadriceps tendon, and patellar tendon are intact.',
    },
    {
      id: 'cartilage_effusion',
      heading: 'Articular Cartilage & Joint Effusion',
      shortLabel: 'Cartilage/Effusion',
      normalStandardized:
        'Femorotibial and patellofemoral compartments demonstrate preserved joint spaces and intact articular cartilage. No joint effusion or loose bodies.',
      normalHmis:
        'Compartments demonstrate preserved joint space and intact articular cartilage. No significant joint effusion is identified.',
    },
  ],
  normalImpression: [
    'Normal MRI knee joint. No cruciate ligament or meniscal tear.',
    'Preserved articular cartilage without significant joint effusion.',
  ],
};

export const MRI_FISTULA_TEMPLATE: SignoutTemplate = {
  id: 'mri-fistulogram',
  modalityKey: 'MRI Fistulogram',
  title: 'MRI Perianal Fistula (Fistulogram)',
  techniqueStandardized:
    'Dedicated high-resolution multiplanar MRI of the perineum and anal canal including Oblique Axial, Coronal T2W, STIR, and DWI sequences.',
  techniqueHmis: 'High-resolution multiplanar MRI fistulogram of the perineum and anal canal.',
  defaultHistory: '35Y Male presenting with recurrent perianal discharge and swelling for 4 months.',
  quickLevels: ['Sphincter Complex', 'Fistula Tract', 'Ischioanal Fossae', 'Levator & Pelvis'],
  sections: [
    {
      id: 'sphincter_complex',
      heading: 'Anal Sphincter Complex',
      shortLabel: 'Sphincters',
      normalStandardized:
        'Internal anal sphincter (IAS) and external anal sphincter (EAS) complexes are intact, symmetric, and uniform. The intersphincteric plane is sharp and preserved bilaterally.',
      normalHmis:
        'The internal and external anal sphincter complexes are intact. Intersphincteric plane appears unremarkable.',
    },
    {
      id: 'fistula_screen',
      heading: 'Fistula & Sinus Tract Evaluation',
      shortLabel: 'Fistula Tract',
      normalStandardized:
        'No fluid-filled or hyperintense T2/STIR tract-like lesion in the perianal region, intersphincteric space, or ischioanal fossa. No internal mucosal or external cutaneous opening.',
      normalHmis:
        'Normal appearance of perianal region. No abnormal tract-like signal is identified in the anal verge or perineum.',
    },
    {
      id: 'ischioanal_fossae',
      heading: 'Ischioanal & Ischiorectal Fossae',
      shortLabel: 'Ischioanal Fossae',
      normalStandardized:
        'Bilateral ischioanal and ischiorectal fossae demonstrate homogeneous fat signal without fluid collection, phlegmon, abscess, or inflammatory stranding.',
      normalHmis:
        'Ischioanal and ischiorectal fossae are clear, with preserved fat planes and no inflammatory collection or abscess.',
    },
  ],
  normalImpression: [
    'Normal MRI perianal fistulogram with no active fistulous tract or abscess (St. James Grade 0).',
    'Intact internal and external anal sphincter complexes.',
  ],
};

export const MRCP_TEMPLATE: SignoutTemplate = {
  id: 'mrcp',
  modalityKey: 'MRCP',
  title: 'MRCP (Magnetic Resonance Cholangiopancreatography)',
  techniqueStandardized:
    'Targeted non-contrast MRCP utilizing thin-slice 2D Coronal/Axial Breath-hold T2W, thick-slab 3D MRCP radial projections, and 3D MIP reconstructions.',
  techniqueHmis: 'Multiplanar, Multi Echo T2W SENSE & MIP sequences.',
  defaultHistory: '52Y Female with right upper quadrant pain and elevated alkaline phosphatase.',
  quickLevels: ['Intrahepatic Ducts', 'Common Bile Duct', 'Gallbladder', 'Pancreas & MPD'],
  sections: [
    {
      id: 'intrahepatic_biliary',
      heading: 'Intrahepatic Biliary Radicles',
      shortLabel: 'IHBR',
      normalStandardized:
        'Right and left hepatic ducts and intrahepatic biliary branches demonstrate normal caliber without dilatation, stricture, or filling defect.',
      normalHmis:
        'Intrahepatic biliary channels are normal in caliber and course. The right and left hepatic ducts are unremarkable.',
    },
    {
      id: 'extrahepatic_cbd',
      heading: 'Extrahepatic Biliary System (CBD)',
      shortLabel: 'CBD',
      normalStandardized:
        'Common bile duct (CBD) is normal in course and caliber throughout with smooth tapering toward ampulla. No intraluminal calculus or stricture.',
      normalHmis:
        'Common bile duct is normal in caliber with no evidence of stricture, filling defect, or signal voids.',
    },
    {
      id: 'gallbladder_cystic',
      heading: 'Gallbladder & Cystic Duct',
      shortLabel: 'Gallbladder',
      normalStandardized:
        'Gallbladder is distended with thin walls and homogeneous fluid signal. No calculi or sludge. Cystic duct is patent.',
      normalHmis:
        'Gallbladder is distended with normal wall thickness and no intraluminal calculi or sludge.',
    },
    {
      id: 'pancreas_mpd',
      heading: 'Pancreas & Main Pancreatic Duct',
      shortLabel: 'Pancreas/MPD',
      normalStandardized:
        'Main pancreatic duct demonstrates uniform caliber (<3 mm) without dilatation or filling defect. Pancreatic parenchyma is unremarkable.',
      normalHmis:
        'Pancreas appears normal in size and signal characteristics. Pancreatic duct is normal in caliber and course.',
    },
  ],
  normalImpression: [
    'Normal MRCP with non-dilated intra- and extrahepatic biliary tree and main pancreatic duct.',
    'No choledocholithiasis, cholelithiasis, or biliary stricture.',
  ],
};
