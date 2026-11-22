'use client';

// Layer 4: Atlas Navbar Search Control (<90 lines)
import React, { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { emitAtlasSearch } from '@/lib/atlas-nav-bus';

interface AtlasNavbarControlsProps {
  className?: string;
}

export function AtlasNavbarControls({ className = '' }: AtlasNavbarControlsProps) {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    emitAtlasSearch(val);
  };

  const handleClear = () => {
    setSearch('');
    emitAtlasSearch('');
    setIsExpanded(false);
  };

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {/* Compact expanding button for smaller screens */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-surface-container/60 text-secondary hover:text-foreground hover:bg-surface-container transition cursor-pointer"
          title="Search Atlas Modules"
          aria-label="Search Atlas Modules"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Search Input (Always visible on md+, expanding on mobile) */}
      <div
        className={`${
          isExpanded
            ? 'absolute left-2 right-2 z-30 flex shadow-lg'
            : 'hidden md:flex md:w-64 lg:w-80'
        } items-center gap-2 h-8 rounded-lg border border-border/60 bg-surface-container/60 px-2.5 transition-all focus-within:border-primary/60 focus-within:bg-background focus-within:ring-1 focus-within:ring-primary/20`}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onBlur={() => {
            if (!search.trim()) setIsExpanded(false);
          }}
          placeholder="Search atlas (Brain, Spine, CT, Orbit)..."
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="hidden lg:inline-block rounded border border-border/60 bg-muted/40 px-1 py-0.2 text-[9px] font-mono text-muted-foreground">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
