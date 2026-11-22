/**
 * HMIS Punjab Radiology Procedure Modules & Resolution Engine
 * Live verified against Punjab Health Department HMIS portal (Lahore General Hospital).
 * Single Source of Truth for HMIS module IDs and anatomical mapping in Rad Suite.
 */

export interface HmisModuleOption {
  value: string;
  text: string;
}

export const HMIS_MRI_MODULE_OPTIONS: readonly HmisModuleOption[] = [
  { value: '773', text: 'MRI Brachial Plexus Plain' },
  { value: '780', text: 'MRV with Contrast' },
  { value: '782', text: 'MRCP' },
  { value: '783', text: 'MRI Shoulder' },
  { value: '784', text: 'MRI UPPER LIMB' },
  { value: '785', text: 'MRI KNEE JOINT' },
  { value: '786', text: 'MRI HIP JOINT' },
  { value: '787', text: 'MRI ABDOMEN and PELVIS' },
  { value: '788', text: 'MRI CHEST WITH CONTRAST' },
  { value: '789', text: 'MRI BRAIN' },
  { value: '790', text: 'MRI BRAIN AND ORBIT' },
  { value: '791', text: 'MRI CERVICAL SPINE' },
  { value: '792', text: 'MRI LS SPINE' },
  { value: '793', text: 'MRI THORACIC SPINE' },
  { value: '794', text: 'MRI NECK' },
  { value: '795', text: 'MRI PELVIS' },
  { value: '796', text: 'MRI BOTH SI JOINTS' },
  { value: '797', text: 'MRI FOOT' },
  { value: '798', text: 'MRI WRIST JOINT' },
  { value: '799', text: 'MRI FEMUR' },
  { value: '800', text: 'MRI ELBOW' },
  { value: '801', text: 'MRI RIGHT ANKLE JOINT' },
  { value: '802', text: 'MRI BILATERAL BREAST' },
  { value: '823', text: 'MRI FACE' },
  { value: '824', text: 'MRI MLC' },
  { value: '899', text: 'MRI FOOT and ANKLE' },
  { value: '900', text: 'MRI FISTULO PROTOCOL' },
  { value: '903', text: 'MRI TIBIA And FIBULA' },
  { value: '904', text: 'MRI WHOLE SPINE' },
  { value: '905', text: 'MRA Brain' },
  { value: '906', text: 'MRS' },
  { value: '907', text: 'MRI HAND' },
  { value: '908', text: 'MRI HUMERUS' },
  { value: '909', text: 'MRI FOREARM' },
  { value: '916', text: 'MRI PNS' },
  { value: '917', text: 'MRI TEMPORAL BONES' },
  { value: '918', text: 'MRI Sacroiliac Joints' },
  { value: '928', text: 'MR Enterogram' },
  { value: '929', text: 'MRI Dorsal Spine' },
] as const;

export const HMIS_CT_MODULE_OPTIONS: readonly HmisModuleOption[] = [
  { value: '803', text: 'CT BRAIN' },
  { value: '804', text: 'CT ORBIT' },
  { value: '805', text: 'CT ABDOMEN AND PELVIS' },
  { value: '806', text: 'CT CHEST' },
  { value: '807', text: 'CT KUB' },
  { value: '808', text: 'CT RENAL PROTOCOL' },
  { value: '809', text: 'CT NECK' },
  { value: '810', text: 'CT FACIAL BONES' },
  { value: '811', text: 'CT PNS' },
  { value: '812', text: 'CTPA' },
  { value: '813', text: 'HRCT CHEST' },
  { value: '814', text: 'CT ABDOMEN' },
  { value: '815', text: 'CT UPPER LIMB' },
  { value: '816', text: 'CT LOWER LIMB' },
  { value: '817', text: 'CT RENAL' },
  { value: '818', text: 'CT CERVICAL SPINE' },
  { value: '819', text: 'CT LUMBAR SPINE' },
  { value: '820', text: 'CT HRCT TEMPORAL BONE' },
  { value: '821', text: 'CT PELVIS' },
  { value: '822', text: 'CT FACE' },
  { value: '825', text: 'MLC CT SCAN 3D' },
] as const;

const ANATOMICAL_SYNONYMS = {
  mri: [
    { patterns: [/lumb(ar|osacral)/i, /\bls\s*spine\b/i, /\bl-spine\b/i], moduleId: '792' },
    { patterns: [/cervical/i, /\bc-spine\b/i], moduleId: '791' },
    { patterns: [/thoracic/i, /\bt-spine\b/i], moduleId: '793' },
    { patterns: [/dorsal/i, /\bd-spine\b/i], moduleId: '929' },
    { patterns: [/whole\s*spine/i], moduleId: '904' },
    { patterns: [/brain\s*and\s*orbit/i], moduleId: '790' },
    { patterns: [/brain/i, /\bhead\b/i], moduleId: '789' },
    { patterns: [/knee/i], moduleId: '785' },
    { patterns: [/shoulder/i], moduleId: '783' },
    { patterns: [/hip/i], moduleId: '786' },
    { patterns: [/mrcp/i], moduleId: '782' },
    { patterns: [/mra\s*brain/i], moduleId: '905' },
    { patterns: [/mrv/i], moduleId: '780' },
    { patterns: [/abdo.*pelvi/i], moduleId: '787' },
    { patterns: [/pelvi/i], moduleId: '795' },
    { patterns: [/chest/i], moduleId: '788' },
    { patterns: [/neck/i], moduleId: '794' },
    { patterns: [/pns/i, /sinus/i], moduleId: '916' },
    { patterns: [/wrist/i], moduleId: '798' },
    { patterns: [/ankle/i], moduleId: '801' },
    { patterns: [/foot/i], moduleId: '797' },
    { patterns: [/hand/i], moduleId: '907' },
    { patterns: [/si\s*joint/i, /sacroiliac/i], moduleId: '796' },
    { patterns: [/brachial/i], moduleId: '773' },
    { patterns: [/fistul/i], moduleId: '900' },
  ],
  ct: [
    { patterns: [/brain/i, /\bhead\b/i], moduleId: '803' },
    { patterns: [/hrct\s*chest/i], moduleId: '813' },
    { patterns: [/chest/i], moduleId: '806' },
    { patterns: [/abdo.*pelvi/i], moduleId: '805' },
    { patterns: [/kub/i], moduleId: '807' },
    { patterns: [/renal\s*protocol/i], moduleId: '808' },
    { patterns: [/neck/i], moduleId: '809' },
    { patterns: [/facial/i], moduleId: '810' },
    { patterns: [/pns/i, /sinus/i], moduleId: '811' },
    { patterns: [/ctpa/i, /pulmonary\s*angi/i], moduleId: '812' },
    { patterns: [/lumb(ar|osacral)/i, /\bls\s*spine\b/i], moduleId: '819' },
    { patterns: [/cervical/i, /\bc-spine\b/i], moduleId: '818' },
    { patterns: [/temporal/i], moduleId: '820' },
    { patterns: [/pelvi/i], moduleId: '821' },
    { patterns: [/face/i], moduleId: '822' },
    { patterns: [/abdo/i], moduleId: '814' },
  ],
};

export function resolveHmisModuleId(params: {
  moduleId?: string | number | null;
  modality?: string;
  scanType?: string;
  bodyPart?: string;
  cpt?: string;
}): string | null {
  const { moduleId, modality = '', scanType = '', bodyPart = '', cpt = '' } = params;

  if (moduleId !== undefined && moduleId !== null && String(moduleId).trim().length > 0) {
    return String(moduleId).trim();
  }

  const mod = (modality || '').toUpperCase();
  const query = `${scanType} ${bodyPart} ${cpt}`.toLowerCase();

  const isMri = mod.includes('MR') || query.includes('mri') || query.includes('mra') || query.includes('mrcp');
  const isCt = mod.includes('CT') || query.includes('ct ') || query.includes('hrct');

  const rules = isMri ? ANATOMICAL_SYNONYMS.mri : isCt ? ANATOMICAL_SYNONYMS.ct : [...ANATOMICAL_SYNONYMS.mri, ...ANATOMICAL_SYNONYMS.ct];

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(query)) {
        return rule.moduleId;
      }
    }
  }

  // Substring fallback against option names
  const optionList = isMri ? HMIS_MRI_MODULE_OPTIONS : isCt ? HMIS_CT_MODULE_OPTIONS : [...HMIS_MRI_MODULE_OPTIONS, ...HMIS_CT_MODULE_OPTIONS];
  for (const opt of optionList) {
    const cleanName = opt.text.toLowerCase().replace(/^(mri|ct)\s+/i, '');
    if (cleanName.length > 3 && query.includes(cleanName)) {
      return opt.value;
    }
  }

  return null;
}
