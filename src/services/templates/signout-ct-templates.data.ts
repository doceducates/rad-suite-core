// Layer 2: Sign-Out Master Anatomical Templates (CT Protocols)
import { SignoutTemplate } from '@/types/signout';
import {
  BRAIN_HEMORRHAGE_ABNORMALITIES,
  BRAIN_ISCHEMIA_ABNORMALITIES,
  CHEST_PULMONARY_ABNORMALITIES,
  CHEST_PLEURAL_ABNORMALITIES,
} from './signout-presets.data';

export const CT_BRAIN_PLAIN_TEMPLATE: SignoutTemplate = {
  id: 'ct-brain-plain',
  modalityKey: 'CT Brain',
  title: 'CT Brain Plain / Trauma',
  techniqueStandardized:
    'Contiguous volumetric axial non-contrast CT from skull base to vertex with 1.25 mm slices and bone/soft tissue reformats.',
  techniqueHmis: 'Axial non-contrast CT scan of the brain.',
  defaultHistory: 'Head trauma / headache / suspected intracranial event.',
  quickLevels: ['Parenchyma', 'Hemorrhage', 'Ventricles', 'Posterior Fossa', 'Bones'],
  sections: [
    {
      id: 'cerebral_parenchyma',
      heading: 'Cerebral Hemispheres & Parenchyma',
      shortLabel: 'Parenchyma',
      normalStandardized:
        'Normal gray-white matter differentiation is preserved bilaterally. No focal hypoattenuation, acute territorial infarction, edema, or mass effect.',
      normalHmis:
        'Normal cerebral parenchymal attenuation with preserved gray-white differentiation. No focal intra or extra-axial lesion identified.',
      commonAbnormalities: BRAIN_ISCHEMIA_ABNORMALITIES,
    },
    {
      id: 'intracranial_hemorrhage',
      heading: 'Intracranial Hemorrhage',
      shortLabel: 'Hemorrhage',
      normalStandardized:
        'No acute intra-axial, intraventricular, subarachnoid, subdural, or epidural intracranial hemorrhage.',
      normalHmis:
        'No evidence of acute intracranial hemorrhage, extra-axial collection, or blood fluid level in the ventricles.',
      commonAbnormalities: BRAIN_HEMORRHAGE_ABNORMALITIES,
    },
    {
      id: 'ventricles_midline',
      heading: 'Ventricular System & Midline',
      shortLabel: 'Ventricles',
      normalStandardized:
        'Ventricular system and basal cisterns demonstrate normal age-appropriate caliber and symmetry without hydrocephalus or midline shift.',
      normalHmis:
        'The ventricular system and basal cisterns are normal in size and configuration. No midline shift seen.',
      commonAbnormalities: [
        {
          label: 'Communicating Hydrocephalus',
          text: 'Marked symmetric dilatation of the lateral and third ventricles with transependymal CSF seepage.',
          impression: 'Communicating hydrocephalus with periventricular transependymal edema.',
        },
        {
          label: 'Subfalcine Herniation / Shift',
          text: 'Significant mass effect resulting in 6 mm midline shift of septum pellucidum to the contralateral side.',
          impression: 'Mass effect with 6 mm midline shift.',
        },
      ],
    },
    {
      id: 'posterior_fossa',
      heading: 'Posterior Fossa & Brainstem',
      shortLabel: 'Post Fossa',
      normalStandardized:
        'Cerebellar hemispheres, fourth ventricle, and brainstem demonstrate normal attenuation without focal lesion.',
      normalHmis: 'Posterior fossa structures and fourth ventricle appear unremarkable.',
    },
    {
      id: 'calvarium_bones',
      heading: 'Calvarium, Base of Skull & Soft Tissues',
      shortLabel: 'Bones/Soft Tissue',
      normalStandardized:
        'Calvarium and skull base demonstrate intact cortical margins without acute fracture, lytic, or sclerotic lesions. Paranasal sinuses and mastoid air cells are clear.',
      normalHmis:
        'The visualized skull bones and base of skull are intact without fracture. Visualized paranasal sinuses are clear.',
      commonAbnormalities: [
        {
          label: 'Linear Calvarial Fracture',
          text: 'Linear undisplaced fracture involving the right parietal bone extending towards the lambdoid suture.',
          impression: 'Linear undisplaced fracture of the right parietal bone.',
        },
        {
          label: 'Depressed Skull Fracture',
          text: 'Comminuted depressed skull fracture of the left frontal bone with 8 mm inward cortical displacement.',
          impression: 'Depressed left frontal skull fracture (inward displacement approx 8 mm).',
        },
      ],
    },
  ],
  normalImpression: [
    'No acute intracranial hemorrhage, territorial acute infarct, or space-occupying lesion.',
    'Preserved gray-white differentiation with normal ventricular size and no midline shift.',
    'Calvarium and skull base are intact without fracture.',
  ],
};

export const CT_CHEST_TEMPLATE: SignoutTemplate = {
  id: 'ct-chest',
  modalityKey: 'CT Chest',
  title: 'CT Chest (High-Resolution / Contrast)',
  techniqueStandardized:
    'Helical volumetric CT from lung apices to adrenal glands with 1.25 mm multiplanar reformats in lung and mediastinal windows.',
  techniqueHmis: 'Helical CT scan of the chest.',
  defaultHistory: 'Cough, dyspnea, suspected pulmonary or mediastinal pathology.',
  quickLevels: ['Lungs', 'Pleura', 'Mediastinum', 'Cardiovascular', 'Bones'],
  sections: [
    {
      id: 'lung_parenchyma',
      heading: 'Lungs & Tracheobronchial Tree',
      shortLabel: 'Lungs',
      normalStandardized:
        'Both lungs are clear and normally expanded without consolidation, ground-glass opacities, suspicious nodule, or mass. Tracheobronchial tree is widely patent.',
      normalHmis:
        'Lungs are clear bilaterally without consolidation, collapse, suspicious nodule, or masses. Trachea and major bronchi are patent.',
      commonAbnormalities: CHEST_PULMONARY_ABNORMALITIES,
    },
    {
      id: 'pleural_spaces',
      heading: 'Pleural Spaces',
      shortLabel: 'Pleura',
      normalStandardized:
        'No pleural effusion, pleural thickening, calcification, or pneumothorax is identified bilaterally.',
      normalHmis: 'No evidence of pleural effusion, thickening, or pneumothorax bilaterally.',
      commonAbnormalities: CHEST_PLEURAL_ABNORMALITIES,
    },
    {
      id: 'mediastinum_lymph',
      heading: 'Mediastinum & Lymph Nodes',
      shortLabel: 'Mediastinum',
      normalStandardized:
        'Mediastinal contours are normal without mass. No pathological mediastinal, hilar, or axillary lymphadenopathy.',
      normalHmis: 'Mediastinal contours are normal. No significant mediastinal or hilar lymphadenopathy.',
      commonAbnormalities: [
        {
          label: 'Mediastinal Lymphadenopathy',
          text: 'Enlarged matted subcarinal and right paratracheal lymph nodes measuring up to 2.4 cm in short axis.',
          impression: 'Significant mediastinal (subcarinal and paratracheal) lymphadenopathy.',
        },
        {
          label: 'Anterior Mediastinal Mass',
          text: 'Well-defined soft tissue mass in the anterior mediastinum measuring 4.5 x 3.2 cm; differential includes thymoma, lymphoma, or germ cell tumor.',
          impression: 'Anterior mediastinal soft tissue mass.',
        },
      ],
    },
    {
      id: 'cardiovascular',
      heading: 'Heart & Great Vessels',
      shortLabel: 'Cardiovascular',
      normalStandardized:
        'Heart size is normal. Pericardium is thin without effusion. Thoracic aorta and main pulmonary artery are normal in caliber.',
      normalHmis: 'Heart size is normal. No pericardial effusion. Major thoracic vessels are unremarkable.',
      commonAbnormalities: [
        {
          label: 'Pericardial Effusion',
          text: 'Moderate pericardial effusion measuring up to 18 mm in thickness without cardiac chamber collapse.',
          impression: 'Moderate pericardial effusion.',
        },
        {
          label: 'Cardiomegaly',
          text: 'Generalized cardiomegaly with thoracic aortic calcification and dilatation of main pulmonary artery (32 mm).',
          impression: 'Cardiomegaly with pulmonary arterial hypertension.',
        },
      ],
    },
    {
      id: 'chest_wall_bones',
      heading: 'Chest Wall & Thoracic Skeleton',
      shortLabel: 'Chest Wall',
      normalStandardized:
        'Thoracic cage osseous structures demonstrate intact cortical margins without acute fracture, lytic, or sclerotic lesions.',
      normalHmis: 'Visualized osseous structures of the thorax are intact without focal lesion or fracture.',
    },
  ],
  normalImpression: [
    'Clear lung parenchyma bilaterally without consolidation, suspicious pulmonary nodule, or mass.',
    'No mediastinal or hilar lymphadenopathy.',
    'No pleural effusion or pneumothorax.',
  ],
};

export const CT_ABDOMEN_PELVIS_TEMPLATE: SignoutTemplate = {
  id: 'ct-abdomen-pelvis',
  modalityKey: 'CT Abdomen Pelvis',
  title: 'CT Abdomen & Pelvis',
  techniqueStandardized:
    'Helical volumetric CT from lung bases through pubic symphysis with multiplanar coronal and sagittal reformats.',
  techniqueHmis: 'CT scan of abdomen and pelvis with contrast.',
  defaultHistory: 'Abdominal pain, suspected acute abdomen, or organ pathology.',
  quickLevels: ['Liver/GB', 'Pancreas/Spleen', 'Kidneys/GU', 'Bowel/Appendix', 'Peritoneum/Pelvis'],
  sections: [
    {
      id: 'liver_gallbladder',
      heading: 'Liver, Gallbladder & Biliary Tree',
      shortLabel: 'Liver/GB',
      normalStandardized:
        'Liver is normal in size, contour, and attenuation without focal lesion. Gallbladder is well-distended with thin wall and no calculi. Biliary tree is not dilated.',
      normalHmis: 'Liver and gallbladder are unremarkable. No focal hepatic lesion or biliary dilatation seen.',
      commonAbnormalities: [
        {
          label: 'Acute Cholecystitis',
          text: 'Distended gallbladder with thickened hyperenhancing wall (5 mm), calculus impacted in the neck, and pericholecystic fat stranding.',
          impression: 'Acute calculus cholecystitis with pericholecystic inflammatory changes.',
        },
        {
          label: 'Hepatic Steatosis',
          text: 'Diffuse hypoattenuation of liver parenchyma relative to spleen (< 40 HU), consistent with diffuse hepatic steatosis.',
          impression: 'Diffuse hepatic steatosis (fatty liver).',
        },
        {
          label: 'Cholelithiasis',
          text: 'Multiple radiopaque calculi in gallbladder without wall thickening or pericholecystic fluid.',
          impression: 'Cholelithiasis without evidence of acute cholecystitis.',
        },
      ],
    },
    {
      id: 'spleen_pancreas_adrenals',
      heading: 'Spleen, Pancreas & Adrenal Glands',
      shortLabel: 'Panc/Spleen',
      normalStandardized:
        'Spleen, pancreas, and bilateral adrenal glands demonstrate normal size, morphology, and parenchymal attenuation.',
      normalHmis: 'Spleen, pancreas, and adrenal glands appear unremarkable.',
    },
    {
      id: 'urinary_tract',
      heading: 'Kidneys, Ureters & Urinary Bladder',
      shortLabel: 'Kidneys/GU',
      normalStandardized:
        'Both kidneys demonstrate normal size and parenchymal thickness without calculus, hydronephrosis, or mass. Ureters and urinary bladder are unremarkable.',
      normalHmis: 'Both kidneys show normal size and cortical enhancement. No hydronephrosis or calculus.',
      commonAbnormalities: [
        {
          label: 'Obstructing Ureteric Calculus',
          text: '5 mm dense hyperdense calculus in the right distal ureter / VUJ with moderate upstream hydroureteronephrosis and perinephric fat stranding.',
          impression: 'Obstructing right distal ureteric calculus with moderate upstream hydronephrosis.',
        },
        {
          label: 'Renal Cyst (Bosniak I)',
          text: 'Simple fluid-attenuation, thin-walled non-enhancing cortical cyst measuring 2.5 cm in the left kidney lower pole (Bosniak category I).',
          impression: 'Simple left renal cortical cyst (Bosniak category I).',
        },
      ],
    },
    {
      id: 'bowel_mesentery',
      heading: 'Bowel, Appendix & Mesentery',
      shortLabel: 'Bowel/Appendix',
      normalStandardized:
        'Stomach, small bowel, and colon demonstrate normal caliber and wall thickness without obstruction or inflammation. Appendix is normal.',
      normalHmis: 'Bowel loops are unremarkable without wall thickening or obstruction. Appendix is normal.',
      commonAbnormalities: [
        {
          label: 'Acute Appendicitis',
          text: 'Dilated fluid-filled appendix measuring 11 mm in diameter with circumferential wall thickening, appendicolith, and periappendiceal fat stranding.',
          impression: 'Acute appendicitis with prominent periappendiceal inflammatory fat stranding.',
        },
        {
          label: 'Small Bowel Obstruction',
          text: 'Dilated jejunal and proximal ileal loops with air-fluid levels up to 3.8 cm with transition point in the right lower quadrant.',
          impression: 'Mechanical small bowel obstruction with transition point in RLQ.',
        },
      ],
    },
    {
      id: 'peritoneum_pelvis',
      heading: 'Peritoneum, Retroperitoneum & Pelvis',
      shortLabel: 'Peritoneum',
      normalStandardized:
        'No free intraperitoneal air, ascites, or pathological lymphadenopathy. Pelvic viscera and osseous structures appear unremarkable.',
      normalHmis: 'No free air or fluid. Visualized pelvic structures and bones are intact.',
    },
  ],
  normalImpression: [
    'No acute abdominal or pelvic inflammatory, infectious, or obstructive pathology.',
    'Solid upper abdominal viscera appear unremarkable without focal mass lesion.',
    'No free air, ascites, or pathological retroperitoneal lymphadenopathy.',
  ],
};
