'use client';

// Layer 4 (Presentation): Anatomical Abnormality Dropdown Chip Primitive
// Target < 250 lines, max 350 lines

import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AnatomicalSection } from '@/types/signout';

interface AnatomicalAbnormalityChipProps {
  section: AnatomicalSection;
  isPositive: boolean;
  onSelectAbnormality: (text: string, impression?: string) => void;
  onMarkNormal: () => void;
}

export function AnatomicalAbnormalityChip({
  section,
  isPositive,
  onSelectAbnormality,
  onMarkNormal,
}: AnatomicalAbnormalityChipProps) {
  const items: DropdownMenuItem[] = [
    {
      id: `${section.id}-normal`,
      label: 'Normal / Unremarkable',
      sublabel: 'Reset to normal baseline',
      icon: <Check className="w-3.5 h-3.5 text-emerald-400" />,
      active: !isPositive,
      onClick: onMarkNormal,
    },
    ...(section.commonAbnormalities || []).map((preset, index) => ({
      id: `${section.id}-abnormal-${index}`,
      label: preset.label,
      sublabel: preset.impression || preset.text.slice(0, 60) + '...',
      onClick: () => onSelectAbnormality(preset.text, preset.impression),
    })),
  ];

  const trigger = (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none ${
        isPositive
          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-semibold shadow-xs'
          : 'bg-surface-container border-outline-variant/40 text-secondary hover:text-on-surface hover:border-outline-variant'
      }`}
    >
      {isPositive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
      <span>{section.shortLabel || section.heading}</span>
      <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
    </button>
  );

  return (
    <DropdownMenu
      trigger={trigger}
      items={items}
      align="left"
      direction="down"
      header={section.heading}
      menuClassName="min-w-[240px] max-w-[320px] max-h-80 overflow-y-auto"
    />
  );
}
