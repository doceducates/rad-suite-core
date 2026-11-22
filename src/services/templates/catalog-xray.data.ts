// Layer 2: Plain Film Radiography (X-Ray) Master Templates Catalog
// Invariant: Target < 250 lines, max 350 lines (AGENTS.md Rule 1)

import { CrossSectionalTemplate } from '@/types/templates';

export const CATALOG_XRAY_TEMPLATES: CrossSectionalTemplate[] = [
  {
    id: 'xr-chest-pa',
    name: 'X-Ray Chest PA (Erect)',
    modality: 'X-Ray',
    subspecialty: 'Thoracic',
    description: 'Standard posteroanterior erect chest radiograph.',
    technique: 'Standard posteroanterior (PA) erect projection of the chest taken in full suspended inspiration.',
    normalFindings: [
      'Lungs & Pleura: The lungs are clear and symmetrically aerated. No focal consolidation, suspicious pulmonary nodule, mass, or active parenchymal infiltrate. Both costophrenic angles and cardiophrenic sulci are sharp. No pleural effusion or pneumothorax.',
      'Mediastinum & Heart: Cardiac silhouette is normal in position and dimensions with cardiothoracic ratio < 50%. Aortic knob, mediastinal contours, and hilar regions are unremarkable. Trachea is central.',
      'Thoracic Cage & Diaphragms: Visualized bony thorax (clavicles, ribs, and visualized spine) shows normal architecture with no fracture or focal osseous lesion. Both hemidiaphragms are smooth and convex with no subdiaphragmatic free air.',
    ],
    defaultImpression: 'Normal posteroanterior (PA) erect chest radiograph. No acute cardiopulmonary pathology.',
  },
  {
    id: 'xr-cervical-spine',
    name: 'X-Ray Cervical Spine AP & Lateral',
    modality: 'X-Ray',
    subspecialty: 'Musculoskeletal',
    description: 'Routine radiographic evaluation of cervical alignment and vertebral heights.',
    technique: 'Anteroposterior (AP) and lateral erect radiographs of the cervical spine.',
    normalFindings: [
      'Alignment: Normal cervical lordosis is maintained. Anterior and posterior vertebral lines, spinolaminar line, and spinous process alignment are preserved without subluxation or listhesis.',
      'Vertebrae: Vertebral body heights are maintained throughout C1 to C7. No acute compression fracture or focal osseous lytic/sclerotic lesion. Cortical margins are smooth.',
      'Disc Spaces & Foramina: Intervertebral disc spaces are well preserved without narrowing or osteophyte formation.',
      'Prevertebral Soft Tissues: Normal prevertebral soft tissue thickness (retropharyngeal and retrotracheal spaces are within physiological limits).',
    ],
    defaultImpression: 'Normal cervical spine radiographs without evidence of acute fracture, dislocation, or degenerative spondylosis.',
  },
  {
    id: 'xr-lumbar-spine',
    name: 'X-Ray Lumbar Spine AP & Lateral',
    modality: 'X-Ray',
    subspecialty: 'Musculoskeletal',
    description: 'Radiographic evaluation of lumbar lordosis, vertebral bodies, and disc spaces.',
    technique: 'Anteroposterior (AP) and lateral projections of the lumbosacral spine in recumbent/erect position.',
    normalFindings: [
      'Alignment: Normal lumbar lordosis is preserved. No scoliosis or listhesis on neutral lateral view.',
      'Vertebral Bodies: Vertebral body heights and disc spaces from L1 to S1 are well maintained without acute fracture, collapse, or erosive change.',
      'Pedicles & Processes: Bilateral pedicles, transverse processes, and posterior neural arch elements are intact.',
      'Sacroiliac Joints & Psoas: Visualized sacroiliac joints are symmetric with sharp cortical margins. Psoas muscle outlines are symmetrically preserved.',
    ],
    defaultImpression: 'Normal lumbosacral spine radiographs. No acute fracture, significant disc space loss, or spondylolisthesis.',
  },
  {
    id: 'xr-abdomen-erect-supine',
    name: 'X-Ray Abdomen Erect & Supine (Plain)',
    modality: 'X-Ray',
    subspecialty: 'Abdominal',
    description: 'Plain abdominal radiograph protocol for bowel obstruction or perforation triage.',
    technique: 'Plain radiographs of the abdomen in supine and erect projections.',
    normalFindings: [
      'Bowel Gas Pattern: Normal physiological distribution of bowel gas in the stomach, small bowel, and large bowel. No dilated bowel loops or multiple air-fluid levels to suggest mechanical obstruction.',
      'Free Intraperitoneal Gas: No crescentic subdiaphragmatic free air or Rigler sign to suggest gastrointestinal perforation.',
      'Visceral Outlines & Soft Tissues: Hepatic, splenic, and renal silhouettes appear within normal limits. Flank fat stripes and psoas margins are distinct.',
      'Calcifications & Bones: No radiopaque calculus or abnormal vascular calcification in the renal or biliary tracts. Pelvic and lumbar bones are unremarkable.',
    ],
    defaultImpression: 'Normal plain abdominal radiographs. No evidence of mechanical bowel obstruction or pneumoperitoneum.',
  },
];
