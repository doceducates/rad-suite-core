'use client';

// Layer 4: Atlas Module Selector & Categorized Grid (<260 lines)
import React, { useState, useMemo, useEffect } from 'react';
import { Layers, ArrowRight, Play, X } from 'lucide-react';
import type { AnatomyModuleSummary } from '@/types';
import {
  AtlasThemeId,
  getRegionIconUrl,
  getModuleThemedIconUrl,
} from '@/lib/atlas-icon-map';

interface AtlasModuleSelectorProps {
  modules: AnatomyModuleSummary[];
  selectedCode: string | null;
  currentTheme?: AtlasThemeId;
  onSelectModule: (code: string) => void;
}

const REGION_SECTIONS = [
  { id: 'All', label: 'All Regions', countKey: 'all' },
  { id: 'HeadNeck', label: 'Head & Neck', countKey: 'HeadNeck' },
  { id: 'ThoraxAbdoPelvis', label: 'Thorax & Pelvis', countKey: 'ThoraxAbdoPelvis' },
  { id: 'Spine', label: 'Spine', countKey: 'Spine' },
  { id: 'Limbs', label: 'Limbs & MSK', countKey: 'Limbs' },
];

function matchesRegion(mRegion: string, filterReg: string): boolean {
  if (filterReg === 'All') return true;
  const mr = mRegion.toLowerCase();
  const fr = filterReg.toLowerCase();
  if (mr === fr) return true;
  if (filterReg === 'ThoraxAbdoPelvis' && (mr === 'thorax' || mr === 'abdomenpelvis')) return true;
  if (filterReg === 'Limbs' && mr === 'limbsmsk') return true;
  return false;
}

export function AtlasModuleSelector({
  modules,
  selectedCode,
  currentTheme = 'clay',
  onSelectModule,
}: AtlasModuleSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');

  // Synchronize search with header AtlasNavbarControls
  useEffect(() => {
    const handleSearch = (e: Event) => {
      const custom = e as CustomEvent<{ query: string }>;
      if (custom.detail) {
        setSearch(custom.detail.query || '');
      }
    };
    window.addEventListener('radsuite:atlas-search', handleSearch);
    return () => window.removeEventListener('radsuite:atlas-search', handleSearch);
  }, []);

  const activeModule = useMemo(() => {
    if (!selectedCode) return null;
    return modules.find((m) => m.code === selectedCode) || null;
  }, [modules, selectedCode]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: modules.length };
    REGION_SECTIONS.slice(1).forEach((reg) => {
      counts[reg.id] = modules.filter((m) => matchesRegion(m.region, reg.id)).length;
    });
    return counts;
  }, [modules]);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules.filter((m) => {
      const matchReg = matchesRegion(m.region, selectedRegion);
      const matchQ =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.region.toLowerCase().includes(q);
      return matchReg && matchQ;
    });
  }, [modules, search, selectedRegion]);

  const groupedSections = useMemo(() => {
    if (selectedRegion !== 'All') return null;
    return REGION_SECTIONS.slice(1)
      .map((sec) => {
        const q = search.trim().toLowerCase();
        const list = modules.filter(
          (m) =>
            matchesRegion(m.region, sec.id) &&
            (!q ||
              m.title.toLowerCase().includes(q) ||
              m.code.toLowerCase().includes(q) ||
              m.region.toLowerCase().includes(q))
        );
        return { ...sec, modules: list };
      })
      .filter((sec) => sec.modules.length > 0);
  }, [modules, search, selectedRegion]);

  return (
    <div className="flex h-full flex-col bg-background select-none overflow-hidden">
      {/* 1. Main Regions Single Row (Sticky Top Dock with Active Themed 3D Icons & Resume Button) */}
      <div className="border-b border-border/40 bg-card/60 px-3 sm:px-4 py-2 shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Region Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {REGION_SECTIONS.map((reg) => {
              const isActive = selectedRegion === reg.id;
              const iconUrl = getRegionIconUrl(reg.id, currentTheme);
              const count = regionCounts[reg.id] || 0;

              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setSelectedRegion(reg.id)}
                  className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30 text-primary font-semibold'
                      : 'border-border/60 bg-background/80 hover:border-primary/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <img
                    src={iconUrl}
                    alt={reg.label}
                    className="h-5 w-5 object-contain transition-transform group-hover:scale-110 shrink-0"
                  />
                  <span className="text-xs tracking-tight">{reg.label}</span>
                  <span className="rounded bg-muted/60 px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Sleek Resume Study Action Button (Goes naturally with the region dock flow) */}
          {activeModule && (
            <button
              type="button"
              onClick={() => onSelectModule(activeModule.code)}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary transition-all cursor-pointer shrink-0 shadow-xs group"
              title={`Resume study: ${activeModule.title}`}
            >
              <Play className="h-3.5 w-3.5 fill-current text-primary group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[150px] md:max-w-[220px] lg:max-w-[320px]">
                Resume: {activeModule.title}
              </span>
              <ArrowRight className="h-3 w-3 text-primary opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Active Search Banner */}
      {search && (
        <div className="flex items-center justify-between border-b border-border/40 bg-primary/5 px-4 py-1.5 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1.5">
            <span>Filtering by query:</span>
            <span className="font-semibold text-primary">"{search}"</span>
            <span>({filteredModules.length} results)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('radsuite:atlas-search', { detail: { query: '' } })
                );
              }
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3 w-3" />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* 2. Categorized Modules Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {/* Mobile-only Resume Study Banner */}
        {activeModule && (
          <div className="sm:hidden mb-3 p-2.5 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 fill-primary text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase text-primary tracking-wide">Last Viewed</div>
                <div className="text-xs font-semibold text-foreground truncate">{activeModule.title}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectModule(activeModule.code)}
              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0 cursor-pointer hover:bg-primary/90"
            >
              Resume
            </button>
          </div>
        )}

        {filteredModules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs">No anatomical modules match your filter.</p>
          </div>
        ) : groupedSections ? (
          <div className="space-y-6">
            {groupedSections.map((sec) => (
              <div key={sec.id} className="space-y-2.5">
                <div className="flex items-center gap-2 border-b border-border/30 pb-1.5">
                  <img
                    src={getRegionIconUrl(sec.id, currentTheme)}
                    alt={sec.label}
                    className="h-5 w-5 object-contain"
                  />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {sec.label}
                  </h3>
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                    {sec.modules.length} studies
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                  {sec.modules.map((m) => (
                    <ModuleCard
                      key={m.code}
                      module={m}
                      isSelected={selectedCode === m.code}
                      currentTheme={currentTheme}
                      onSelect={() => onSelectModule(m.code)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredModules.map((m) => (
              <ModuleCard
                key={m.code}
                module={m}
                isSelected={selectedCode === m.code}
                currentTheme={currentTheme}
                onSelect={() => onSelectModule(m.code)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  isSelected,
  currentTheme,
  onSelect,
}: {
  module: AnatomyModuleSummary;
  isSelected: boolean;
  currentTheme: AtlasThemeId;
  onSelect: () => void;
}) {
  const iconUrl = getModuleThemedIconUrl(module.code, module.region, currentTheme);

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20 ring-1 ring-primary/40'
          : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/40 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="h-11 w-11 shrink-0 rounded-lg bg-muted/40 p-1 flex items-center justify-center border border-border/40">
          <img
            src={iconUrl}
            alt={module.title}
            className="h-9 w-9 object-contain transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="rounded bg-muted px-1.2 py-0.2 text-[9px] font-semibold text-muted-foreground uppercase">
              {module.region}
            </span>
            {isSelected && (
              <span className="rounded bg-primary/20 border border-primary/40 px-1.2 py-0.2 text-[9px] font-bold text-primary uppercase">
                Active
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {module.total_slices} slices
            </span>
          </div>

          <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {module.title}
          </h4>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
        <span>{module.series_count || 1} plane{module.series_count !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-0.5 font-medium text-primary">
          {isSelected ? (
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Play className="h-2.5 w-2.5 fill-current" /> Resume
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Explore <ArrowRight className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
