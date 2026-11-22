'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddCategoryCardProps {
  onClick: () => void;
}

export function AddCategoryCard({ onClick }: AddCategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-outline-variant/80',
        'bg-surface-container-low/40 hover:bg-surface-container/60 hover:border-primary/60 transition-all duration-200',
        'cursor-pointer min-w-[160px] h-[130px] shrink-0 text-center'
      )}
      title="Add new template category"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary group-hover:text-primary group-hover:bg-primary/10 transition-colors">
        <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
      </div>
      <span className="text-xs font-semibold text-on-surface mt-2.5 group-hover:text-primary transition-colors">
        Add Category
      </span>
      <span className="text-[10px] text-secondary mt-0.5">
        New modality or subspecialty
      </span>
    </button>
  );
}
