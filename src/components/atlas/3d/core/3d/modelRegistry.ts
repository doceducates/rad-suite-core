import type { AnatomicalSystemId } from '../../data/schema';

export function isLocalStaticDev(): boolean {
  if (typeof window === 'undefined') return true;
  const port = window.location.port;
  return port === '5847' || port === '5848' || port === '5849' || port === '5173' || port === '4173';
}

export function getStaticFallbackUrl(modelName: string): string {
  const clean = modelName.replace(/\.glb$/, '');
  const sub =
    clean.startsWith('micro_') || clean.startsWith('skull_') || clean.startsWith('tooth_')
      ? 'micro/'
      : clean.startsWith('action_')
      ? 'actions/'
      : clean.startsWith('xs_')
      ? 'regional/'
      : '';
  return `/models/${sub}${clean}.glb`;
}

export function resolveModelUrl(name: string): string {
  if (!isLocalStaticDev()) {
    return `/api/anatomy/model/${name}`;
  }
  return getStaticFallbackUrl(name);
}

export const SYSTEM_GLB_MAP: Record<AnatomicalSystemId, string> = {
  skeletal: resolveModelUrl('skeletal'),
  muscular: resolveModelUrl('muscular'),
  circulatory: resolveModelUrl('circulatory'),
  nervous: resolveModelUrl('nervous'),
  respiratory: resolveModelUrl('respiratory'),
  digestive: resolveModelUrl('digestive'),
  urinary: resolveModelUrl('urinary'),
  reproductive: resolveModelUrl('reproductive'),
  endocrine: resolveModelUrl('endocrine'),
  lymphatic: resolveModelUrl('lymphatic'),
  integumentary: resolveModelUrl('integumentary'),
};

export const GLB_CATEGORY_MAP: Record<string, { file: string; system: AnatomicalSystemId }> = {
  brain: { file: resolveModelUrl('brain'), system: 'nervous' },
  skull_head: { file: resolveModelUrl('skull'), system: 'skeletal' },
  skeletal: { file: resolveModelUrl('skeletal'), system: 'skeletal' },
  muscles: { file: resolveModelUrl('muscular'), system: 'muscular' },
  circulatory: { file: resolveModelUrl('circulatory'), system: 'circulatory' },
  nervous: { file: resolveModelUrl('nervous'), system: 'nervous' },
  respiratory: { file: resolveModelUrl('respiratory'), system: 'respiratory' },
  digestive: { file: resolveModelUrl('digestive'), system: 'digestive' },
  urinary: { file: resolveModelUrl('urinary'), system: 'urinary' },
  reproductive: { file: resolveModelUrl('reproductive'), system: 'reproductive' },
  endocrine: { file: resolveModelUrl('endocrine'), system: 'endocrine' },
  lymphatic: { file: resolveModelUrl('lymphatic'), system: 'lymphatic' },
  integumentary: { file: resolveModelUrl('integumentary'), system: 'integumentary' },
  visceral: { file: resolveModelUrl('visceral'), system: 'respiratory' },
  all: { file: resolveModelUrl('skeletal'), system: 'skeletal' },
};

const STANDALONE_CATEGORIES = new Set([
  'brain',
  'skull_head',
  'skull_exploded',
  'skull_coronal',
  'skull_sagittal',
]);

export function isStandaloneModelCategory(category: string): boolean {
  return (
    STANDALONE_CATEGORIES.has(category) ||
    category.startsWith('micro_') ||
    category.startsWith('action_') ||
    category.startsWith('xs_') ||
    category.startsWith('tooth_')
  );
}

export function resolveCategoryUrl(
  category: string
): { url: string; system: AnatomicalSystemId } | null {
  const mapped = GLB_CATEGORY_MAP[category];
  if (mapped) return { url: mapped.file, system: mapped.system };

  if (category.startsWith('micro_') || category.startsWith('skull_') || category.startsWith('tooth_')) {
    return { url: resolveModelUrl(category), system: 'skeletal' };
  }
  if (category.startsWith('action_')) {
    return { url: resolveModelUrl(category), system: 'muscular' };
  }
  if (category.startsWith('xs_')) {
    return { url: resolveModelUrl(category), system: 'skeletal' };
  }
  return null;
}
