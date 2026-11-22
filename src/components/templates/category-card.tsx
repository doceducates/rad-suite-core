'use client';

import React from 'react';
import { Activity, Layers, Disc, Radio, Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategorySummary } from '@/services/templates-db.service';

interface CategoryCardProps {
  category: CategorySummary;
  isSelected: boolean;
  onSelect: (categoryId: string) => void;
}

const MODALITY_ICONS: Record<string, LucideIcon> = {
  CT: Layers,
  MRI: Disc,
  USG: Activity,
  'X-RAY': Radio,
};

const MODALITY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  CT: { bg: 'bg-primary/10 text-primary', text: 'text-primary', ring: 'ring-primary' },
  MRI: { bg: 'bg-tertiary/10 text-tertiary', text: 'text-tertiary', ring: 'ring-tertiary' },
  USG: { bg: 'bg-emerald-500/10 text-emerald-500', text: 'text-emerald-500', ring: 'ring-emerald-500' },
  'X-RAY': { bg: 'bg-amber-500/10 text-amber-500', text: 'text-amber-500', ring: 'ring-amber-500' },
};

export function CategoryCard({ category, isSelected, onSelect }: CategoryCardProps) {
  const Icon = MODALITY_ICONS[category.id] || Sparkles;
  const colorScheme = MODALITY_COLORS[category.id] || {
    bg: 'bg-secondary/10 text-secondary',
    text: 'text-secondary',
    ring: 'ring-secondary',
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className={cn(
        'group relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer min-w-[200px] flex-1 shadow-xs',
        isSelected
          ? cn('bg-surface-container border-outline shadow-sm ring-2', colorScheme.ring)
          : 'bg-surface-container-low border-outline-variant/60 hover:border-outline hover:bg-surface-container/60'
      )}
    >
      <div className="flex items-start justify-between gap-3 w-full">
        <div className={cn('p-2.5 rounded-xl transition-transform group-hover:scale-105', colorScheme.bg)}>
          <Icon className="w-5 h-5" />
        </div>
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono',
            isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary'
          )}
        >
          {category.count} {category.count === 1 ? 'template' : 'templates'}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-on-surface">{category.name}</span>
          <span className="text-xs text-secondary/70 font-normal truncate">({category.label})</span>
        </div>
        <p className="text-[11px] text-secondary mt-1 line-clamp-2 leading-relaxed">
          {category.description}
        </p>
      </div>
    </button>
  );
}
