/**
 * Companion Tab Navigation & Domain State Service
 * Layer 2 (Domain/Services) - Under 250 lines invariant.
 *
 * Manages tab identifiers, section mapping, cycling, and labels
 * for the unified radiology reporting companion workstation.
 */

export type CompanionTab = 'report' | 'images' | 'ddx' | 'chat' | 'guidance' | 'atlas';

export const COMPANION_TABS: readonly CompanionTab[] = [
  'report',
  'images',
  'ddx',
  'chat',
  'guidance',
  'atlas',
] as const;

export interface CompanionTabMeta {
  id: CompanionTab;
  label: string;
  badgeLabel?: string;
  iconName: string;
  description: string;
}

export const COMPANION_TAB_METADATA: Record<CompanionTab, CompanionTabMeta> = {
  report: {
    id: 'report',
    label: 'Report',
    badgeLabel: 'Editor',
    iconName: 'FileText',
    description: 'Clinical report canvas with live AI inline suggestions',
  },
  images: {
    id: 'images',
    label: 'Images',
    badgeLabel: 'DICOM',
    iconName: 'Layers',
    description: 'Interactive PACS viewport with slice navigation and window/level',
  },
  ddx: {
    id: 'ddx',
    label: 'DDx',
    badgeLabel: 'AI',
    iconName: 'Stethoscope',
    description: 'Prioritized differential diagnosis with discriminative features',
  },
  chat: {
    id: 'chat',
    label: 'Chat',
    badgeLabel: 'Copilot',
    iconName: 'MessageSquare',
    description: 'Interactive clinical discussion and query assistant',
  },
  guidance: {
    id: 'guidance',
    label: 'Pearls',
    badgeLabel: 'Academic',
    iconName: 'BookOpen',
    description: 'Evidence-based reference guidelines (Fleischner, Bosniak, LI-RADS)',
  },
  atlas: {
    id: 'atlas',
    label: 'Atlas',
    badgeLabel: 'eAnatomy',
    iconName: 'Compass',
    description: 'IMAIOS eAnatomy cross-sectional reference with synchronized pin overlays',
  },
};

export function isValidCompanionTab(tab: unknown): tab is CompanionTab {
  return typeof tab === 'string' && (COMPANION_TABS as readonly string[]).includes(tab);
}

export function getCompanionTabLabel(tab: CompanionTab): string {
  return COMPANION_TAB_METADATA[tab]?.label ?? tab;
}

export function getNextCompanionTab(current: CompanionTab): CompanionTab {
  const currentIndex = COMPANION_TABS.indexOf(current);
  if (currentIndex === -1) return 'report';
  const nextIndex = (currentIndex + 1) % COMPANION_TABS.length;
  return COMPANION_TABS[nextIndex];
}

export function resolveCompanionTabForSection(
  section: 'history' | 'findings' | 'impression'
): CompanionTab {
  switch (section) {
    case 'history':
      return 'chat';
    case 'findings':
      return 'images';
    case 'impression':
      return 'ddx';
    default:
      return 'report';
  }
}
