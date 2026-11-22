'use client';

// Presentation: Single Dropdown Menu for Theme Selection (<100 lines)
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Palette, ExternalLink } from 'lucide-react';
import type { AtlasThemeId } from '@/lib/atlas-icon-map';

interface AtlasThemeDropdownProps {
  currentTheme: AtlasThemeId;
  onChangeTheme: (theme: AtlasThemeId) => void;
}

const THEME_OPTIONS: Array<{
  id: AtlasThemeId;
  name: string;
  icon: string;
  desc: string;
  badgeClass: string;
}> = [
  {
    id: 'clay',
    name: 'Pure Clinical Clay',
    icon: '🏛️',
    desc: 'Matte ivory stone & clinical clay sculpture',
    badgeClass: 'bg-zinc-800 text-zinc-200',
  },
  {
    id: 'wax',
    name: 'Classical Wax (La Specola)',
    icon: '🕯️',
    desc: 'Florentine polychromatic anatomical wax',
    badgeClass: 'bg-rose-950 text-rose-300',
  },
  {
    id: 'kintsugi',
    name: 'Matte Obsidian & Gold',
    icon: '🏺',
    desc: 'Charcoal tissue with radiant gold seams',
    badgeClass: 'bg-amber-950 text-amber-300',
  },
];

export function AtlasThemeDropdown({ currentTheme, onChangeTheme }: AtlasThemeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeOption = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/60 transition cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Change 3D Aesthetic Theme"
      >
        <span>{activeOption.icon}</span>
        <span className="hidden sm:inline font-semibold">{activeOption.name.split(' ')[0]}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            3D Aesthetic Theme
          </div>

          <div className="space-y-0.5">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onChangeTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="text-base">{theme.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs leading-none truncate">{theme.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{theme.desc}</div>
                  </div>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>

          <div className="my-1 border-t border-border/40" />

          <a
            href="/theme_studio.html"
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Launch Icon Studio
            </span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
      )}
    </div>
  );
}
