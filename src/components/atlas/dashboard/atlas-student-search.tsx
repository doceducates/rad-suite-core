'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Compass, Loader2, ArrowRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AnatomyStructureSearchResult } from '@/types';

export function AtlasStudentSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnatomyStructureSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anatomy/structures?q=${encodeURIComponent(query.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.structures)) {
            setResults(data.structures);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to search structures:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search 2,919 structures (e.g., Arteria basilaris, Cavernous sinus, Coeliac trunk)..."
          className="pl-10 pr-10 py-5 bg-card/80 border-border/80 rounded-xl text-sm placeholder:text-muted-foreground/60 shadow-xs focus-visible:ring-emerald-500"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-border/40 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 bg-muted/40 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Anatomical Structures Found</span>
            <span className="font-mono">{results.length} matches</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {results.map((st) => (
              <Link
                key={`${st.id}-${st.series_id}`}
                href={`/atlas`}
                onClick={() => setIsOpen(false)}
                className="p-3 hover:bg-emerald-500/10 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                      {st.name_en}
                    </span>
                    {st.name_la && (
                      <span className="text-xs text-muted-foreground italic">
                        ({st.name_la})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {st.module_title} &bull; {st.series_title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open in Atlas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
