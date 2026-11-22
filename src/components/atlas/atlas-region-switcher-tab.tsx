'use client';

// Layer 4: Atlas Region & Module Switcher Tab for Right Sidebar (<140 lines)
import React, { useState, useMemo } from 'react';
import { Search, Check, Layers } from 'lucide-react';
import type { AnatomyModuleSummary } from '@/types';
import { AtlasThemeId, getModuleThemedIconUrl } from '@/lib/atlas-icon-map';

interface AtlasRegionSwitcherTabProps {
  modules: AnatomyModuleSummary[];
  activeModuleCode: string;
  onSelectModule: (code: string) => void;
  currentTheme?: AtlasThemeId;
}

const REGION_GROUPS = [
  { id: 'HeadNeck', label: 'Head & Neck' },
  { id: 'ThoraxAbdoPelvis', label: 'Thorax & Pelvis' },
  { id: 'Spine', label: 'Spine' },
  { id: 'Limbs', label: 'Limbs & MSK' },
];

function matchesGroup(mRegion: string, groupId: string): boolean {
  const mr = mRegion.toLowerCase();
  const gr = groupId.toLowerCase();
  if (mr === gr) return true;
  if (groupId === 'ThoraxAbdoPelvis' && (mr === 'thorax' || mr === 'abdomenpelvis')) return true;
  if (groupId === 'Limbs' && mr === 'limbsmsk') return true;
  return false;
}

export function AtlasRegionSwitcherTab({
  modules,
  activeModuleCode,
  onSelectModule,
  currentTheme = 'clay',
}: AtlasRegionSwitcherTabProps) {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REGION_GROUPS.map((group) => {
      const list = modules.filter(
        (m) =>
          matchesGroup(m.region, group.id) &&
          (!q ||
            m.title.toLowerCase().includes(q) ||
            m.code.toLowerCase().includes(q) ||
            m.region.toLowerCase().includes(q))
      );
      return { ...group, list };
    }).filter((g) => g.list.length > 0);
  }, [modules, search]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="p-2.5 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Switch module (Brain, Spine, Knee)..."
            className="w-full rounded-lg border border-border/60 bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Module Tree by Region */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {grouped.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No anatomical modules found
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{group.label}</span>
                <span className="font-mono text-[9px]">{group.list.length}</span>
              </div>

              {group.list.map((m) => {
                const isActive = m.code === activeModuleCode;
                const iconUrl = getModuleThemedIconUrl(m.code, m.region, currentTheme);

                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => onSelectModule(m.code)}
                    className={`group w-full flex items-center gap-2 rounded-xl p-2 text-left transition-all cursor-pointer border ${
                      isActive
                        ? 'border-primary/50 bg-primary/10 text-primary font-semibold shadow-xs'
                        : 'border-transparent text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/40 p-0.5 flex items-center justify-center border border-border/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={iconUrl}
                        alt={m.title}
                        className="h-6 w-6 object-contain"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-tight truncate">
                        {m.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {m.total_slices} slices · {m.series_count || 1} plane
                      </div>
                    </div>

                    {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
