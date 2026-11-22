/**
 * Atlas Icon Map (<150 lines).
 * Dynamic resolution of 3D clinical icons across themes (clay, wax, kintsugi)
 * for regions and the 49 anatomical modules.
 */

export type AtlasThemeId = 'clay' | 'wax' | 'kintsugi';

export interface ThemedIconDef {
  category: string;
  name: string;
}

const REGION_ICON_DEFS: Record<string, ThemedIconDef> = {
  All: { category: 'systems', name: 'system_whole_body' },
  General: { category: 'systems', name: 'system_whole_body' },
  HeadNeck: { category: 'regions', name: 'region_head_neck' },
  ThoraxAbdoPelvis: { category: 'regions', name: 'region_thorax' },
  Thorax: { category: 'regions', name: 'region_thorax' },
  AbdomenPelvis: { category: 'regions', name: 'region_abdomen' },
  Spine: { category: 'regions', name: 'region_spine' },
  Limbs: { category: 'regions', name: 'region_lower_limbs' },
  LimbsMSK: { category: 'regions', name: 'region_lower_limbs' },
};

const MODULE_ICON_DEFS: Record<string, ThemedIconDef> = {
  // Head & Neck
  brain3dmri: { category: 'regions', name: 'region_brain' },
  cerveau: { category: 'regions', name: 'region_brain' },
  'cerveau-anatomie': { category: 'regions', name: 'region_brain' },
  'nerfs-craniens-anatomie': { category: 'systems', name: 'system_nervous' },
  'sna-anatomie': { category: 'systems', name: 'system_nervous' },
  'cranium-illustrations': { category: 'organs', name: 'organ_skull' },
  'eye-illustrations': { category: 'submodules', name: 'submodule_orbit_eye' },
  rocher: { category: 'submodules', name: 'submodule_inner_ear_cochlea' },
  'face-cou-irm': { category: 'regions', name: 'region_head_neck' },
  face: { category: 'organs', name: 'organ_airway_neck' },
  'brain-ct': { category: 'regions', name: 'region_brain' },

  // Limbs & Joints
  'ms-anatomie': { category: 'regions', name: 'region_upper_limbs' },
  'ms-radios': { category: 'organs', name: 'organ_shoulder' },
  'upper-limb': { category: 'regions', name: 'region_upper_limbs' },
  shoulder: { category: 'organs', name: 'organ_shoulder' },
  'shoulder-ct-arthrogram': { category: 'organs', name: 'organ_shoulder' },
  'elbow-mri-3d': { category: 'organs', name: 'organ_elbow_hand' },
  'coude-arthroscanner': { category: 'organs', name: 'organ_elbow_hand' },
  'wrist-mri-3d': { category: 'submodules', name: 'submodule_carpal_tunnel' },
  'hand-mr': { category: 'organs', name: 'organ_elbow_hand' },
  'mi-anatomie': { category: 'regions', name: 'region_lower_limbs' },
  'membre-inferieur-radiographies': { category: 'regions', name: 'region_lower_limbs' },
  'lower-limb-arteries': { category: 'systems', name: 'system_arterial' },
  lowerlimb: { category: 'regions', name: 'region_lower_limbs' },
  'hip-mri-3d': { category: 'organs', name: 'organ_hip_joint' },
  knee: { category: 'organs', name: 'organ_knee_joint' },
  'genou-arthroscanner': { category: 'submodules', name: 'submodule_knee_meniscus' },
  cheville: { category: 'organs', name: 'organ_ankle_foot' },

  // Spine
  'lumbar-spine-mri': { category: 'regions', name: 'region_spine' },
  'rachis-dos-anatomie': { category: 'regions', name: 'region_spine' },
  'rachis-radios': { category: 'regions', name: 'region_spine' },
  'moelle-spinale-anatomie': { category: 'regions', name: 'region_spine' },
  'Brachial-Plexus-MR': { category: 'systems', name: 'system_nervous' },

  // Thorax, Abdomen & Pelvis
  'aires-radiotherapie': { category: 'systems', name: 'system_lymphatic' },
  'pet-ct': { category: 'modalities', name: 'modality_pet_ct' },
  'vhp-male-whole-body': { category: 'systems', name: 'system_whole_body' },
  'poumons-illustrations': { category: 'organs', name: 'organ_lungs_bronchi' },
  'mediastin-illustrations': { category: 'regions', name: 'region_thorax' },
  'paroi-thorax-sein-illustrations': { category: 'regions', name: 'region_thorax' },
  thorax: { category: 'regions', name: 'region_thorax' },
  'coeur-illustrations': { category: 'organs', name: 'organ_heart_vessels' },
  coeur: { category: 'organs', name: 'organ_heart_vessels' },
  coronarographie: { category: 'submodules', name: 'submodule_coronary_arteries' },
  'digestive-system-illustrations': { category: 'organs', name: 'organ_digestive_tract' },
  abdomen: { category: 'organs', name: 'organ_liver_pancreas' },
  'abdominopelvic-cavity-ct': { category: 'regions', name: 'region_abdomen' },
  pelvis: { category: 'regions', name: 'region_pelvis' },
  'Pelvis-Male-MR': { category: 'submodules', name: 'submodule_pelvic_floor' },
  'female-pelvis-laparoscopy': { category: 'regions', name: 'region_pelvis' },
};

export function getThemedIconUrl(def: ThemedIconDef, theme: AtlasThemeId = 'clay'): string {
  return `/icons/atlas/themes/${theme}/${def.category}/${def.name}.png`;
}

export function getRegionIconUrl(region: string, theme: AtlasThemeId = 'clay'): string {
  const def = REGION_ICON_DEFS[region] || REGION_ICON_DEFS.All;
  return getThemedIconUrl(def, theme);
}

export function getModuleThemedIconUrl(
  code: string,
  region?: string,
  theme: AtlasThemeId = 'clay'
): string {
  const def = MODULE_ICON_DEFS[code];
  if (def) {
    return getThemedIconUrl(def, theme);
  }
  if (region && REGION_ICON_DEFS[region]) {
    return getThemedIconUrl(REGION_ICON_DEFS[region], theme);
  }
  return `/icons/atlas/themes/${theme}/systems/system_whole_body.png`;
}
