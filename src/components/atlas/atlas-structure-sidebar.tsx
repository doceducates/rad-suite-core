'use client';

// Layer 4: Atlas Anatomy Structure Sidebar with Regions Switcher (<300 lines)
import React, { useState, useMemo } from 'react';
import { Search, HelpCircle, ArrowRight, X } from 'lucide-react';
import { AtlasCategoryFilterList } from './atlas-category-filter-list';
import { AtlasSegmentationLayerList } from './atlas-segmentation-layer-list';
import { AtlasRegionSwitcherTab } from './atlas-region-switcher-tab';
import { AtlasStudySearchResults } from './atlas-study-search-results';
import { AtlasQuizBanner } from './atlas-quiz-banner';
import type { AtlasThemeId } from '@/lib/atlas-icon-map';
import type {
  AnatomySliceAnnotations,
  AnatomyAnnotationPoint,
  AnatomyFilter,
  AnatomyLayerMask,
  AnatomyModuleSummary,
} from '@/types';

interface AtlasStructureSidebarProps {
  annotations: AnatomySliceAnnotations;
  selectedStructureId: number | null;
  onSelectStructure: (id: number | null) => void;
  onHoverStructure: (id: number | null) => void;
  language: 'en' | 'la';
  filters: AnatomyFilter[];
  activeFilterIds: Set<number>;
  onToggleFilter: (filterId: number) => void;
  onSelectAllFilters: () => void;
  onDeselectAllFilters: () => void;
  onSoloFilter: (filterId: number) => void;
  layers: AnatomyLayerMask[];
  activeLayerName: string | null;
  onSelectLayer: (layer: string | null) => void;
  maskOpacity: number;
  onMaskOpacityChange: (opacity: number) => void;
  isQuizMode: boolean;
  quizTarget: AnatomyAnnotationPoint | null;
  quizScore: { correct: number; total: number };
  onNextQuizQuestion: () => void;
  modules?: AnatomyModuleSummary[];
  activeModuleCode?: string;
  onSelectModule?: (code: string) => void;
  currentTheme?: AtlasThemeId;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToSlice?: (target: {
    seriesId?: number;
    sliceSort?: number;
    sliceId?: number;
    structureId: number;
  }) => void;
}

export function AtlasStructureSidebar({
  annotations,
  selectedStructureId,
  onSelectStructure,
  onHoverStructure,
  language,
  filters,
  activeFilterIds,
  onToggleFilter,
  onSelectAllFilters,
  onDeselectAllFilters,
  onSoloFilter,
  layers,
  activeLayerName,
  onSelectLayer,
  maskOpacity,
  onMaskOpacityChange,
  isQuizMode,
  quizTarget,
  quizScore,
  onNextQuizQuestion,
  modules,
  activeModuleCode,
  onSelectModule,
  currentTheme = 'clay',
  isOpen = true,
  onClose,
  onNavigateToSlice,
}: AtlasStructureSidebarProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'structures' | 'categories' | 'layers' | 'modules'>('structures');

  // Filtered structures on this slice
  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return annotations.points.filter((pt) => {
      if (pt.filter_id && !activeFilterIds.has(pt.filter_id)) return false;
      if (!q) return true;
      const en = pt.name_en.toLowerCase();
      const la = (pt.name_la || '').toLowerCase();
      return en.includes(q) || la.includes(q);
    });
  }, [annotations.points, activeFilterIds, search]);

  // Count structures per category filter on the current slice
  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const pt of annotations.points) {
      if (pt.filter_id) {
        counts.set(pt.filter_id, (counts.get(pt.filter_id) || 0) + 1);
      }
    }
    return counts;
  }, [annotations.points]);

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 flex h-full w-80 flex-col border-l border-border/40 bg-card text-foreground shadow-2xl transition-transform duration-200 lg:relative lg:z-auto lg:shadow-none lg:translate-x-0 ${
        isOpen
          ? 'translate-x-0'
          : 'translate-x-full lg:translate-x-0 pointer-events-none lg:pointer-events-auto'
      }`}
    >
      {/* Mobile Drawer Header with Close Button */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2 lg:hidden">
        <span className="text-xs font-semibold text-foreground">Anatomy Navigator</span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="Close Drawer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quiz Mode Banner */}
      {isQuizMode && (
        <AtlasQuizBanner
          quizTarget={quizTarget}
          quizScore={quizScore}
          language={language}
          onNextQuestion={onNextQuizQuestion}
        />
      )}

      {/* Navigation Tabs Header (4 Tabs: Structures, Parts, Masks, Regions) */}
      {!isQuizMode && (
        <div className="flex border-b border-border/40 bg-muted/20 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('structures')}
            className={`flex-1 py-2 text-center font-medium border-b-2 transition cursor-pointer truncate px-1 ${
              activeTab === 'structures'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Structures ({filteredPoints.length})
          </button>
          {filters.length > 0 && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition cursor-pointer truncate px-1 ${
                activeTab === 'categories'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Parts ({filters.length})
            </button>
          )}
          {layers.length > 0 && (
            <button
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition cursor-pointer truncate px-1 ${
                activeTab === 'layers'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Masks ({layers.length})
            </button>
          )}
          {modules && modules.length > 0 && onSelectModule && (
            <button
              onClick={() => setActiveTab('modules')}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition cursor-pointer truncate px-1 ${
                activeTab === 'modules'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Regions
            </button>
          )}
        </div>
      )}

      {/* Tab 1: Structure List */}
      {activeTab === 'structures' && !isQuizMode && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="p-3 border-b border-border/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all parts in this study..."
                className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {search.trim() && activeModuleCode && onNavigateToSlice ? (
            <AtlasStudySearchResults
              query={search}
              moduleCode={activeModuleCode}
              selectedStructureId={selectedStructureId}
              language={language}
              onNavigateToSlice={onNavigateToSlice}
              onHoverStructure={onHoverStructure}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Visible on this slice ({filteredPoints.length})
              </div>
              {filteredPoints.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No active structures on this slice
                </div>
              ) : (
                filteredPoints.map((pt) => {
                  const isSelected = selectedStructureId === pt.structure_id;
                  const label = language === 'la' && pt.name_la ? pt.name_la : pt.name_en;

                  return (
                    <div
                      key={pt.point_id}
                      onClick={() => onSelectStructure(isSelected ? null : pt.structure_id)}
                      onMouseEnter={() => onHoverStructure(pt.structure_id)}
                      onMouseLeave={() => onHoverStructure(null)}
                      className={`group flex items-start gap-2.5 rounded-lg p-2 cursor-pointer transition ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/40'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: pt.color || '#3b82f6' }}
                        className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium leading-tight truncate ${
                            isSelected ? 'text-primary font-semibold' : 'text-foreground'
                          }`}
                        >
                          {label}
                        </div>
                        {language !== 'la' && pt.name_la && (
                          <div className="text-[11px] font-serif italic text-muted-foreground truncate">
                            {pt.name_la}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Anatomical Parts Category Switches */}
      {activeTab === 'categories' && !isQuizMode && (
        <AtlasCategoryFilterList
          filters={filters}
          activeFilterIds={activeFilterIds}
          categoryCounts={categoryCounts}
          onToggleFilter={onToggleFilter}
          onSelectAllFilters={onSelectAllFilters}
          onDeselectAllFilters={onDeselectAllFilters}
          onSoloFilter={onSoloFilter}
        />
      )}

      {/* Tab 3: Segmentation Masks & Opacity */}
      {activeTab === 'layers' && !isQuizMode && (
        <AtlasSegmentationLayerList
          layers={layers}
          activeLayerName={activeLayerName}
          onSelectLayer={onSelectLayer}
          maskOpacity={maskOpacity}
          onMaskOpacityChange={onMaskOpacityChange}
        />
      )}

      {/* Tab 4: Instant Module & Region Switcher */}
      {activeTab === 'modules' && !isQuizMode && modules && onSelectModule && (
        <AtlasRegionSwitcherTab
          modules={modules}
          activeModuleCode={activeModuleCode || ''}
          onSelectModule={onSelectModule}
          currentTheme={currentTheme}
        />
      )}
    </aside>
  );
}
