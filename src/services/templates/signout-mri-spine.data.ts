// Layer 2: Sign-Out Master Anatomical Templates (Spine)
import { SignoutTemplate } from '@/types/signout';
import { LUMBAR_DISC_ABNORMALITIES, CERVICAL_DISC_ABNORMALITIES } from './signout-presets.data';

export const MRI_LS_SPINE_TEMPLATE: SignoutTemplate = {
  id: 'mri-ls-spine',
  modalityKey: 'MRI Lumbosacral Spine',
  title: 'MRI Lumbosacral Spine',
  techniqueStandardized:
    'Sagittal T1W, Sagittal T2W, Sagittal STIR, and Axial T2W sequences acquired through the lumbosacral junction from T12 through S1.',
  techniqueHmis: 'Multiplanar, multisequential MRI lumbosacral spine without contrast.',
  defaultHistory: '48Y Male presenting with lower backache radiating to right lower limb for 3 months.',
  quickLevels: ['Alignment', 'L1-L3', 'L3-L4', 'L4-L5', 'L5-S1', 'Conus'],
  sections: [
    {
      id: 'alignment_vertebrae',
      heading: 'Curvature, Alignment & Vertebrae',
      shortLabel: 'Alignment',
      normalStandardized:
        'Normal lumbar lordosis is maintained. Vertebral body alignment is preserved without spondylolisthesis or retrolisthesis. Vertebral heights, cortical margins, and marrow signal intensity are normal.',
      normalHmis:
        'The lumbar vertebral bodies demonstrate normal alignment, height, and marrow signal intensity. No focal marrow replacing lesion, compression deformity, fracture, or spondylolisthesis is identified.',
      commonAbnormalities: [
        {
          label: 'Loss of Lumbar Lordosis',
          text: 'Straightening of the normal lumbar lordosis, likely secondary to paraspinal muscle spasm.',
          impression: 'Straightening of lumbar lordosis.',
        },
        {
          label: 'L4-L5 Spondylolisthesis (Grade 1)',
          text: 'Grade 1 anterior spondylolisthesis of L4 over L5 secondary to bilateral pars interarticularis defects.',
          impression: 'Grade 1 anterolisthesis of L4 over L5 with bilateral spondylolysis.',
        },
        {
          label: 'Endplate Modic 1 Changes',
          text: 'Modic type 1 (inflammatory / edematous) subchondral endplate marrow signal changes present at L4-L5 and L5-S1.',
          impression: 'Modic type 1 degenerative endplate changes at L4-L5 and L5-S1.',
        },
      ],
    },
    {
      id: 'l1_l2_l2_l3',
      heading: 'Upper Lumbar Levels (L1-L2 & L2-L3)',
      shortLabel: 'L1-L3',
      normalStandardized:
        'L1-L2 and L2-L3 intervertebral disc spaces demonstrate preserved heights and T2 hydration signal without disc bulge, herniation, canal stenosis, or neural foraminal narrowing.',
      normalHmis:
        'L1-L2 and L2-L3 intervertebral discs demonstrate preserved height and signal intensity without evidence of disc desiccation/bulge, canal stenosis or neural foraminal narrowing.',
      commonAbnormalities: LUMBAR_DISC_ABNORMALITIES('L1-L3'),
    },
    {
      id: 'l3_l4',
      heading: 'L3-L4 Disc Level',
      shortLabel: 'L3-L4',
      normalStandardized:
        'L3-L4 intervertebral disc space demonstrates preserved height and hydration without posterior disc bulge, protrusion, central canal stenosis, or neural exit foraminal compromise.',
      normalHmis:
        'L3-L4 intervertebral disc shows normal height and signal intensity without evidence of disc bulge, canal stenosis, or neural foraminal narrowing.',
      commonAbnormalities: LUMBAR_DISC_ABNORMALITIES('L3-L4'),
    },
    {
      id: 'l4_l5',
      heading: 'L4-L5 Disc Level',
      shortLabel: 'L4-L5',
      normalStandardized:
        'L4-L5 intervertebral disc space demonstrates preserved height and T2 signal without disc herniation, lateral recess narrowing, or traversing nerve root compression.',
      normalHmis:
        'L4-L5 intervertebral disc demonstrates preserved height and signal intensity without disc bulge, canal stenosis, or neural foraminal narrowing.',
      commonAbnormalities: LUMBAR_DISC_ABNORMALITIES('L4-L5'),
    },
    {
      id: 'l5_s1',
      heading: 'L5-S1 Disc Level',
      shortLabel: 'L5-S1',
      normalStandardized:
        'L5-S1 intervertebral disc space demonstrates normal height and contour without posterior bulge, thecal sac indentation, or exiting nerve root impingement.',
      normalHmis:
        'L5-S1 intervertebral disc shows preserved height and signal intensity without disc protrusion, canal stenosis, or neural foraminal narrowing.',
      commonAbnormalities: LUMBAR_DISC_ABNORMALITIES('L5-S1'),
    },
    {
      id: 'conus_cauda',
      heading: 'Conus Medullaris & Cauda Equina',
      shortLabel: 'Conus',
      normalStandardized:
        'The conus medullaris terminates normally at the L1/L2 level with normal caliber and homogeneous signal. Cauda equina nerve roots are symmetrically suspended within the CSF without clumping.',
      normalHmis:
        'The conus medullaris terminates at normal level and demonstrates normal signal intensity. The cauda equina nerve roots are unremarkable. No evidence of syringomyelia, tethered cord, or epidural collection is identified.',
    },
    {
      id: 'posterior_soft_tissue',
      heading: 'Posterior Elements & Facet Joints',
      shortLabel: 'Facets',
      normalStandardized:
        'Facet joints and ligamenta flava are unremarkable. Psoas and paraspinal muscles demonstrate normal bulk and signal. Visualized bilateral sacroiliac joints are unremarkable.',
      normalHmis:
        'The visualized posterior elements are unremarkable. The visualized paraspinal soft tissues demonstrate normal signal intensity without edema, collection, or mass lesion. Bilateral sacroiliac joints appear unremarkable.',
    },
  ],
  normalImpression: [
    'Normal MRI of the lumbosacral spine with preserved disc heights and hydration.',
    'No evidence of disc herniation, central spinal stenosis, or nerve root impingement.',
  ],
};

export const MRI_CERVICAL_SPINE_TEMPLATE: SignoutTemplate = {
  id: 'mri-cervical-spine',
  modalityKey: 'MRI Cervical Spine',
  title: 'MRI Cervical Spine',
  techniqueStandardized:
    'Dedicated high-resolution multiplanar MRI of the cervical spine including Sagittal T1W, T2W, STIR, and Axial T2W/Gradient-Echo sequences.',
  techniqueHmis: 'Multiplanar, multisequential non-contrast MRI cervical spine.',
  defaultHistory: '42Y Female with neck pain radiating to right arm and hand numbness for 2 months.',
  quickLevels: ['Alignment', 'C3-C4', 'C4-C5', 'C5-C6', 'C6-C7', 'Cord'],
  sections: [
    {
      id: 'c_alignment',
      heading: 'Curvature, Alignment & Craniocervical Junction',
      shortLabel: 'Alignment',
      normalStandardized:
        'Normal cervical lordosis is preserved. Vertebral body alignment is intact without subluxation. Craniocervical junction is unremarkable with normal cerebellar tonsillar position.',
      normalHmis:
        'The atlanto-occipital and atlantoaxial articulations are maintained. The craniocervical junction appears unremarkable. No tonsillar herniation is noted.',
    },
    {
      id: 'c3_c4',
      heading: 'C3-C4 Disc Level',
      shortLabel: 'C3-C4',
      normalStandardized:
        'C3-C4 intervertebral disc demonstrates preserved height and hydration without focal bulge, herniation, central canal stenosis, or neural foraminal narrowing.',
      normalHmis:
        'C3-C4 disc demonstrates preserved height and signal intensity without disc bulge or canal stenosis.',
      commonAbnormalities: CERVICAL_DISC_ABNORMALITIES('C3-C4'),
    },
    {
      id: 'c4_c5',
      heading: 'C4-C5 Disc Level',
      shortLabel: 'C4-C5',
      normalStandardized:
        'C4-C5 intervertebral disc demonstrates preserved height and hydration without focal bulge, herniation, central canal stenosis, or neural foraminal narrowing.',
      normalHmis:
        'C4-C5 disc demonstrates preserved height and signal intensity without disc bulge or canal stenosis.',
      commonAbnormalities: CERVICAL_DISC_ABNORMALITIES('C4-C5'),
    },
    {
      id: 'c5_c6',
      heading: 'C5-C6 Disc Level',
      shortLabel: 'C5-C6',
      normalStandardized:
        'C5-C6 intervertebral disc space demonstrates preserved height and hydration without posterior disc bulge, protrusion, spinal canal stenosis, or neural exit foraminal compromise.',
      normalHmis:
        'C5-C6 disc demonstrates preserved height and signal intensity without disc bulge, canal stenosis, or foraminal narrowing.',
      commonAbnormalities: CERVICAL_DISC_ABNORMALITIES('C5-C6'),
    },
    {
      id: 'c6_c7',
      heading: 'C6-C7 Disc Level',
      shortLabel: 'C6-C7',
      normalStandardized:
        'C6-C7 intervertebral disc space demonstrates normal height and contour without posterior bulge, thecal sac indentation, or exiting nerve root impingement.',
      normalHmis:
        'C6-C7 disc shows preserved height and signal intensity without disc protrusion, canal stenosis, or neural foraminal narrowing.',
      commonAbnormalities: CERVICAL_DISC_ABNORMALITIES('C6-C7'),
    },
    {
      id: 'c_cord',
      heading: 'Cervical Spinal Cord & Soft Tissues',
      shortLabel: 'Cord',
      normalStandardized:
        'Cervical spinal cord is normal in caliber, course, and signal intensity without intramedullary syrinx, myelomalacia, or edema. Paraspinal and prevertebral soft tissues are unremarkable.',
      normalHmis:
        'The cervical spinal cord demonstrates normal caliber and signal intensity throughout its course with no focal cord edema, syrinx, or intramedullary lesion. Visualized paraspinal soft tissues are normal.',
    },
  ],
  normalImpression: [
    'Normal MRI cervical spine without evidence of disc protrusion, spinal canal stenosis, or neural exit foraminal compromise.',
    'Normal cervical cord signal intensity.',
  ],
};
