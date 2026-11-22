/**
 * Companion Tab Navigation & Domain State Service
 * Layer 2 (Domain/Services) - Under 250 lines invariant.
 *
 * Manages tab identifiers, section mapping, cycling, and labels
 * for the unified radiology reporting companion workstation.
 */

export type CompanionTab =
  | 'images'
  | 'insights_ddx'
  | 'chat'
  | 'radiopaedia'
  | 'findings'
  | 'report'
  | 'atlas';

export type CompanionWindowMode = 'docked' | 'floating' | 'maximized' | 'minimized';

export const COMPANION_TABS: readonly CompanionTab[] = [
  'images',
  'insights_ddx',
  'chat',
  'radiopaedia',
  'findings',
  'report',
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
  images: {
    id: 'images',
    label: 'Images',
    badgeLabel: 'PACS',
    iconName: 'Layers',
    description: 'Interactive PACS viewport with slice navigation and window/level',
  },
  insights_ddx: {
    id: 'insights_ddx',
    label: 'Insights',
    badgeLabel: 'AI',
    iconName: 'Lightbulb',
    description: 'Differential diagnosis, discriminative pearls, and similar cases',
  },
  chat: {
    id: 'chat',
    label: 'Copilot',
    badgeLabel: 'Chat',
    iconName: 'MessageSquare',
    description: 'Interactive clinical discussion and query assistant',
  },
  radiopaedia: {
    id: 'radiopaedia',
    label: 'Radiopaedia',
    badgeLabel: 'Ref',
    iconName: 'BookOpen',
    description: 'Encyclopedia reference articles and verified imaging cases',
  },
  findings: {
    id: 'findings',
    label: 'Findings',
    badgeLabel: 'Checklist',
    iconName: 'CheckSquare',
    description: 'Structured positive findings checklist and observations',
  },
  report: {
    id: 'report',
    label: 'Report',
    badgeLabel: 'Editor',
    iconName: 'FileText',
    description: 'Clinical report canvas with live AI inline suggestions',
  },
  atlas: {
    id: 'atlas',
    label: 'Atlas',
    badgeLabel: 'eAnatomy',
    iconName: 'Compass',
    description: 'IMAIOS eAnatomy cross-sectional reference with synchronized pin overlays',
  },
};

export function normalizeCompanionTab(tab: unknown): CompanionTab {
  if (typeof tab !== 'string') return 'images';
  if (tab === 'ddx' || tab === 'guidance' || tab === 'insights') return 'insights_ddx';
  if (isValidCompanionTab(tab)) return tab;
  return 'images';
}

export function isValidCompanionTab(tab: unknown): tab is CompanionTab {
  return typeof tab === 'string' && (COMPANION_TABS as readonly string[]).includes(tab);
}

export function getCompanionTabLabel(tab: CompanionTab): string {
  return COMPANION_TAB_METADATA[tab]?.label ?? tab;
}

export function getNextCompanionTab(current: CompanionTab): CompanionTab {
  const currentIndex = COMPANION_TABS.indexOf(current);
  if (currentIndex === -1) return 'images';
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
      return 'insights_ddx';
    default:
      return 'images';
  }
}
