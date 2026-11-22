'use client';

// Layer 4: Atlas Study-Wide Structure Search Results (<170 lines)
import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import type { AnatomyStructureSearchResult } from '@/types';

interface AtlasStudySearchResultsProps {
  query: string;
  moduleCode: string;
  selectedStructureId: number | null;
  language: 'en' | 'la';
  onNavigateToSlice: (target: {
    seriesId?: number;
    sliceSort?: number;
    sliceId?: number;
    structureId: number;
  }) => void;
  onHoverStructure: (id: number | null) => void;
}

export function AtlasStudySearchResults({
  query,
  moduleCode,
  selectedStructureId,
  language,
  onNavigateToSlice,
  onHoverStructure,
}: AtlasStudySearchResultsProps) {
  const [results, setResults] = useState<AnatomyStructureSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/anatomy/structures?q=${encodeURIComponent(q)}&module=${encodeURIComponent(moduleCode)}&limit=40`
        );
        if (!res.ok) throw new Error('Search failed');
        const json = await res.json();
        if (!cancelled && json.success) {
          setResults(json.structures || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, moduleCode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Searching study structures...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-10 px-3 text-center text-xs text-muted-foreground">
        No structures matching &ldquo;{query}&rdquo; found in this study.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Found {results.length} matching {results.length === 1 ? 'part' : 'parts'} in study
      </div>

      {results.map((st, idx) => {
        const isSelected = selectedStructureId === st.id;
        const primaryName = language === 'la' && st.name_la ? st.name_la : st.name_en;
        const secondaryName = language === 'la' ? st.name_en : st.name_la;
        const color = st.color ? `#${st.color.replace(/^#/, '')}` : '#3b82f6';

        return (
          <div
            key={`${st.id}-${st.series_id || 0}-${idx}`}
            onClick={() =>
              onNavigateToSlice({
                seriesId: st.series_id,
                sliceSort: st.slice_sort,
                sliceId: st.slice_id,
                structureId: st.id,
              })
            }
            onMouseEnter={() => onHoverStructure(st.id)}
            onMouseLeave={() => onHoverStructure(null)}
            className={`group flex items-center justify-between gap-2.5 rounded-lg p-2 cursor-pointer transition ${
              isSelected
                ? 'bg-primary/15 border border-primary/40 text-foreground'
                : 'hover:bg-muted/50 border border-transparent text-foreground'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span
                style={{ backgroundColor: color }}
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white shadow-xs"
              />
              <div className="min-w-0">
                <div
                  className={`text-xs font-medium leading-tight truncate ${
                    isSelected ? 'text-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  {primaryName}
                </div>
                {secondaryName && (
                  <div className="text-[11px] font-serif italic text-muted-foreground truncate">
                    {secondaryName}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
                  {st.series_title && (
                    <span className="rounded bg-muted/80 px-1 py-0.2 font-medium text-foreground">
                      {st.series_title}
                    </span>
                  )}
                  {st.slice_sort !== undefined && (
                    <span>
                      Slice {st.slice_sort} ({st.slice_count} {st.slice_count === 1 ? 'slice' : 'slices'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition shrink-0" />
          </div>
        );
      })}
    </div>
  );
}
