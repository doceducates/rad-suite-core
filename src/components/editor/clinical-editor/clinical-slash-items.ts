import { Editor } from '@tiptap/core';
import { SlashMenuItem } from './clinical-editor-types';

export function getClinicalSlashItems(
  editor: Editor,
  modality = 'CT',
  onTriggerAi?: (action: string) => void
): SlashMenuItem[] {
  return [
    {
      title: 'Synthesize Impression',
      subtext: 'Analyze drafted findings to generate numbered impressions',
      aliases: ['ai', 'impression', 'imp', 'diagnose'],
      group: 'AI Actions',
      badge: 'AI',
      iconName: 'Sparkles',
      action: async (ed) => {
        onTriggerAi?.('impression');
      },
    },
    {
      title: 'Standardize & Clean Phrasing',
      subtext: 'Normalize dimensions (X x Y mm), laterality, and ACR terms',
      aliases: ['standardize', 'clean', 'fix', 'discrepancy'],
      group: 'AI Actions',
      badge: 'AI',
      iconName: 'CheckCircle2',
      action: async (ed) => {
        onTriggerAi?.('standardize');
      },
    },
    {
      title: 'Patient Discharge Summary',
      subtext: 'Generate reassuring, 2-3 sentence patient-friendly summary',
      aliases: ['patient', 'simplify', 'discharge'],
      group: 'AI Actions',
      badge: 'AI',
      iconName: 'HeartHandshake',
      action: async (ed) => {
        onTriggerAi?.('simplify');
      },
    },
    {
      title: 'Suggest Differential Diagnoses (DDx)',
      subtext: 'Generate prioritized differential list with discriminative features',
      aliases: ['differential', 'ddx', 'differentials', 'diagnoses'],
      group: 'AI Actions',
      badge: 'DDx',
      iconName: 'Lightbulb',
      action: async (ed) => {
        onTriggerAi?.('differential');
      },
    },
    {
      title: 'Normal CT Chest Survey',
      subtext: 'Insert normal parenchyma, airways, mediastinum, and pleura',
      aliases: ['normchest', 'chest', 'lungs', 'thorax', 'ctchest'],
      group: 'Templates',
      badge: 'CT',
      iconName: 'FileText',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p><strong>Lungs:</strong> Clear bilaterally without focal consolidation, pneumothorax, or pleural effusion.</p>' +
          '<p><strong>Mediastinum & Hila:</strong> Normal in contour. No lymphadenopathy. Great vessels intact.</p>' +
          '<p><strong>Chest Wall:</strong> Osseous structures unremarkable.</p>'
        ).run();
      },
    },
    {
      title: 'Normal CT Abdomen & Pelvis Survey',
      subtext: 'Standard survey of liver, biliary, spleen, pancreas, kidneys, bowel',
      aliases: ['normabd', 'abdomen', 'pelvis', 'abd', 'ctabd'],
      group: 'Templates',
      badge: 'CT',
      iconName: 'FileText',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p><strong>Liver:</strong> Normal size and attenuation without focal lesion.</p>' +
          '<p><strong>Gallbladder & Biliary:</strong> No radio-opaque calculus or ductal dilatation.</p>' +
          '<p><strong>Spleen, Pancreas, Adrenals:</strong> Unremarkable.</p>' +
          '<p><strong>Kidneys & Ureters:</strong> Symmetric enhancement. No hydronephrosis or calculi.</p>' +
          '<p><strong>Bowel & Mesentery:</strong> No bowel obstruction or free peritoneal fluid.</p>'
        ).run();
      },
    },
    {
      title: 'Normal MRI Lumbar Spine (LS Spine)',
      subtext: 'Normal lordosis, vertebrae, discs, thecal sac, and conus medullaris',
      aliases: ['normls', 'lsspine', 'lumbar', 'spine', 'mrilumber'],
      group: 'Templates',
      badge: 'MRI',
      iconName: 'FileText',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p><strong>Alignment:</strong> Physiological lumbar lordosis is maintained without spondylolisthesis.</p>' +
          '<p><strong>Vertebrae:</strong> Normal vertebral heights and marrow signal intensities. No aggressive osseous lesion.</p>' +
          '<p><strong>Intervertebral Discs:</strong> Discs demonstrate preserved heights and T2 hydration signals without significant bulge or herniation.</p>' +
          '<p><strong>Spinal Canal & Foramina:</strong> Thecal sac, bilateral exit neural foramina, and traversing nerve roots are unremarkable at all lumbar levels.</p>' +
          '<p><strong>Conus Medullaris:</strong> Terminates normally at L1-L2 level with normal morphology.</p>'
        ).run();
      },
    },
    {
      title: 'Normal MRI Cervical Spine (C-Spine)',
      subtext: 'Normal cervical lordosis, disc heights, cord signal, and canal',
      aliases: ['normcervical', 'cspine', 'cervical', 'mricervical'],
      group: 'Templates',
      badge: 'MRI',
      iconName: 'FileText',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p><strong>Alignment:</strong> Normal cervical lordosis is preserved without listhesis.</p>' +
          '<p><strong>Vertebral Bodies:</strong> Normal vertebral heights and bone marrow signals without fracture or marrow infiltration.</p>' +
          '<p><strong>Discs & Canal:</strong> Cervical intervertebral discs show preserved height without significant extrusion, canal stenosis, or foraminal compromise.</p>' +
          '<p><strong>Spinal Cord:</strong> Normal caliber and intrinsic signal intensity throughout the visualized cervical cord.</p>'
        ).run();
      },
    },
    {
      title: 'Normal MRI Knee Survey',
      subtext: 'Intact menisci, cruciate/collateral ligaments, and extensor mechanism',
      aliases: ['normknee', 'knee', 'meniscus', 'mriknee'],
      group: 'Templates',
      badge: 'MRI',
      iconName: 'FileText',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p><strong>Menisci:</strong> Medial and lateral menisci demonstrate normal morphology and low signal without tear.</p>' +
          '<p><strong>Cruciate Ligaments:</strong> ACL and PCL are intact with normal course, caliber, and signal intensity.</p>' +
          '<p><strong>Collateral Ligaments:</strong> MCL and LCL complexes are intact.</p>' +
          '<p><strong>Extensor Mechanism:</strong> Quadriceps and patellar tendons are intact. No joint effusion or Baker cyst.</p>'
        ).run();
      },
    },
    {
      title: 'Negative Acute Pulmonary Embolism (CTPA)',
      subtext: 'Clear main, lobar, and segmental pulmonary arteries without RV strain',
      aliases: ['normpe', 'pe', 'ctpa', 'embolism'],
      group: 'Templates',
      badge: 'CTA',
      iconName: 'ShieldCheck',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p><strong>Pulmonary Arteries:</strong> Adequate contrast opacification. No filling defect identified within the pulmonary trunk, main pulmonary arteries, lobar, or segmental branches to suggest pulmonary thromboembolism.</p>' +
          '<p><strong>Right Heart Strain:</strong> RV/LV chamber ratio is normal (&lt; 1.0). Interventricular septum is not flattened or bowed.</p>'
        ).run();
      },
    },
    {
      title: 'Normal Brain Survey Negatives',
      subtext: 'Insert baseline pertinent negatives for intracranial study',
      aliases: ['normbrain', 'brain', 'head', 'neuro', 'mribrain', 'ctbrain'],
      group: 'Pertinent Negatives',
      badge: 'Neuro',
      iconName: 'ShieldCheck',
      action: (ed) => {
        ed.chain().focus().insertContent(
          '<p>No acute intracranial hemorrhage, territorial acute infarct, or midline shift.</p>' +
          '<p>Ventricles, basal cisterns, and cortical sulcal pattern are within normal limits for age.</p>' +
          '<p>Major intracranial vascular flow-voids appear preserved.</p>'
        ).run();
      },
    },
    {
      title: 'Heading 2 (Section Title)',
      subtext: 'Large section heading for organ or anatomic region',
      aliases: ['h2', 'heading', 'title', 'organ'],
      group: 'Formatting',
      iconName: 'Heading2',
      action: (ed) => {
        ed.chain().focus().setHeading({ level: 2 }).run();
      },
    },
    {
      title: 'Heading 3 (Sub-section)',
      subtext: 'Medium heading for sub-structures or specific lesions',
      aliases: ['h3', 'subheading', 'sub'],
      group: 'Formatting',
      iconName: 'Heading3',
      action: (ed) => {
        ed.chain().focus().setHeading({ level: 3 }).run();
      },
    },
    {
      title: 'Bulleted List',
      subtext: 'Standard bulleted item list for qualitative findings',
      aliases: ['bullet', 'ul', 'list'],
      group: 'Formatting',
      iconName: 'List',
      action: (ed) => {
        ed.chain().focus().toggleBulletList().run();
      },
    },
    {
      title: 'Numbered Impression List',
      subtext: 'Insert formatted numbered list for clinical conclusions',
      aliases: ['numbered', 'list', 'conclusions', 'ol'],
      group: 'Formatting',
      iconName: 'ListOrdered',
      action: (ed) => {
        ed.chain().focus().toggleOrderedList().run();
      },
    },
    {
      title: 'Critical Finding Callout Box',
      subtext: 'Notion-style highlight card for red-flag acute findings',
      aliases: ['critical', 'alert', 'urgent', 'callout', 'red'],
      group: 'Formatting',
      badge: 'Alert',
      iconName: 'AlertTriangle',
      action: (ed) => {
        ed.chain().focus().toggleCallout({ type: 'critical' }).run();
      },
    },
    {
      title: 'Recommendation Callout Box',
      subtext: 'Notion-style highlight card for actionable clinician guidance',
      aliases: ['recommendation', 'rec', 'guidance', 'suggestion'],
      group: 'Formatting',
      badge: 'Action',
      iconName: 'Lightbulb',
      action: (ed) => {
        ed.chain().focus().toggleCallout({ type: 'recommendation' }).run();
      },
    },
    {
      title: 'Clinical Note Callout Box',
      subtext: 'Notion-style subtle card for informative contextual notes',
      aliases: ['note', 'info', 'comment'],
      group: 'Formatting',
      badge: 'Note',
      iconName: 'Info',
      action: (ed) => {
        ed.chain().focus().toggleCallout({ type: 'info' }).run();
      },
    },
  ];
}
