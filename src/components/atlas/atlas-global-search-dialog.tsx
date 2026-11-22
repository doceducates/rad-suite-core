'use client';

// Layer 4: Atlas Global Anatomy Search Command Palette (<220 lines)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, ArrowRight, Compass } from 'lucide-react';
import type { AnatomyStructureSearchResult } from '@/types';

interface AtlasGlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTarget: (target: {
    moduleCode: string;
    seriesId?: number;
    sliceSort?: number;
    sliceId?: number;
    structureId?: number;
  }) => void;
  currentLanguage?: 'en' | 'la';
}

const CLINICAL_SUGGESTIONS = [
  'Anterior cruciate ligament',
  'Pituitary gland',
  'Sella turcica',
  'Internal carotid artery',
  'Medial meniscus',
  'Optic chiasm',
  'Hippocampus',
];

export function AtlasGlobalSearchDialog({
  isOpen,
  onClose,
  onNavigateToTarget,
  currentLanguage = 'en',
}: AtlasGlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnatomyStructureSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search query across entire atlas
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anatomy/structures?q=${encodeURIComponent(q)}&limit=30`);
        if (!res.ok) throw new Error('Search failed');
        const json = await res.json();
        if (!cancelled && json.success) {
          setResults(json.structures || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelectResult = useCallback((item: AnatomyStructureSearchResult) => {
    if (!item.module_code) return;
    onNavigateToTarget({
      moduleCode: item.module_code,
      seriesId: item.series_id,
      sliceSort: item.slice_sort,
      sliceId: item.slice_id,
      structureId: item.id,
    });
    onClose();
  }, [onNavigateToTarget, onClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (results.length > 0 ? (idx + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (results.length > 0 ? (idx - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelectResult(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 sm:pt-24 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border/60 bg-card text-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3 bg-muted/20">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all cross-sectional anatomy (e.g. ACL, Pituitary, Sella)..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
          {query && !isLoading && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {query.trim().length >= 2 && results.length === 0 && !isLoading && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No anatomical structures found matching &ldquo;{query}&rdquo;.
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Compass className="h-4 w-4 text-primary" />
                Popular Clinical Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {CLINICAL_SUGGESTIONS.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const primaryName = currentLanguage === 'la' && item.name_la ? item.name_la : item.name_en;
            const secondaryName = currentLanguage === 'la' ? item.name_en : item.name_la;

            return (
              <div
                key={`${item.id}-${item.series_id || 0}-${idx}`}
                onClick={() => handleSelectResult(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between gap-3 rounded-lg p-2.5 cursor-pointer transition ${
                  isSelected
                    ? 'bg-primary/15 border border-primary/40 text-foreground'
                    : 'hover:bg-muted/50 border border-transparent text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    style={{ backgroundColor: item.color ? `#${item.color.replace(/^#/, '')}` : '#38bdf8' }}
                    className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold truncate">{primaryName}</span>
                      {secondaryName && (
                        <span className="text-[11px] font-serif italic text-muted-foreground truncate hidden sm:inline">
                          ({secondaryName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground truncate">
                      {item.module_region && (
                        <span className="rounded bg-muted/80 px-1 py-0.2 font-semibold uppercase text-[9px] text-primary">
                          {item.module_region}
                        </span>
                      )}
                      <span className="truncate">{item.module_title}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {item.series_title && (
                      <div className="text-[11px] font-medium text-foreground">{item.series_title}</div>
                    )}
                    {item.slice_sort !== undefined && (
                      <div className="text-[10px] text-muted-foreground">
                        Slice {item.slice_sort} ({item.slice_count} {item.slice_count === 1 ? 'slice' : 'slices'})
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info bar */}
        <div className="border-t border-border/40 bg-muted/10 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Tip: Click any structure to jump directly to that module, series, and slice.</span>
          <span className="hidden sm:inline font-mono text-[10px]">↑↓ to navigate · ↵ to select</span>
        </div>
      </div>
    </div>
  );
}
