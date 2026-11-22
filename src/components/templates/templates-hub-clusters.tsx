'use client';

// Layer 4 (Presentation): Modality & Category Cluster Scrollbar
// Invariant: Target < 250 lines, max 350 lines.

import React from 'react';
import { CategorySummary } from '@/services/templates-db.service';
import { CategoryCard } from './category-card';
import { AddCategoryCard } from './add-category-card';

interface TemplatesHubClustersProps {
  categories: CategorySummary[];
  activeCategory: string;
  totalTemplatesCount: number;
  onSelectCategory: (id: string) => void;
  onOpenAddCategory: () => void;
}

export function TemplatesHubClusters({
  categories,
  activeCategory,
  totalTemplatesCount,
  onSelectCategory,
  onOpenAddCategory,
}: TemplatesHubClustersProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-secondary font-mono">
          Modality & Category Clusters
        </h2>
        <button
          type="button"
          onClick={() => onSelectCategory('ALL')}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            activeCategory === 'ALL'
              ? 'bg-primary text-on-primary'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          All Modalities ({totalTemplatesCount})
        </button>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isSelected={activeCategory === cat.id}
            onSelect={onSelectCategory}
          />
        ))}
        <AddCategoryCard onClick={onOpenAddCategory} />
      </div>
    </div>
  );
}
