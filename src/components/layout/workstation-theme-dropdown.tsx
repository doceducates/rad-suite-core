'use client';

// Layer 4: Unified Workstation Theme & 3D Aesthetic Dropdown (<200 lines)
import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette, ExternalLink, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import type { AtlasThemeId } from '@/lib/atlas-icon-map';
import { emitAtlasThemeChange } from '@/lib/atlas-nav-bus';
import { notify } from '@/services/notification.service';

const THEME_OPTIONS: Array<{
  id: AtlasThemeId;
  name: string;
  icon: string;
  desc: string;
}> = [
  {
    id: 'clay',
    name: 'Pure Clinical Clay',
    icon: '🏛️',
    desc: 'Matte ivory stone & clinical clay sculpture',
  },
  {
    id: 'wax',
    name: 'Classical Wax (La Specola)',
    icon: '🕯️',
    desc: 'Florentine polychromatic anatomical wax',
  },
  {
    id: 'kintsugi',
    name: 'Matte Obsidian & Gold',
    icon: '🏺',
    desc: 'Dark charcoal tissue with gold veins',
  },
];

export function WorkstationThemeDropdown() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [atlasTheme, setAtlasTheme] = useState<AtlasThemeId>('clay');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('radsuite.atlas_theme') as AtlasThemeId | null;
      if (saved && ['clay', 'wax', 'kintsugi'].includes(saved)) {
        setAtlasTheme(saved);
      }
    } catch {}

    const handleThemeEvent = (e: Event) => {
      const custom = e as CustomEvent<{ theme: AtlasThemeId }>;
      if (custom.detail?.theme) {
        setAtlasTheme(custom.detail.theme);
      }
    };
    window.addEventListener('radsuite:atlas-theme-change', handleThemeEvent);
    return () => window.removeEventListener('radsuite:atlas-theme-change', handleThemeEvent);
  }, []);

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

  const handleSelectAtlasTheme = (newTheme: AtlasThemeId) => {
    setAtlasTheme(newTheme);
    emitAtlasThemeChange(newTheme);
    notify.info(
      `Theme set to ${
        newTheme === 'clay' ? 'Pure Clay' : newTheme === 'wax' ? 'Classical Wax' : 'Matte Obsidian & Gold'
      }`
    );
  };

  if (!mounted) {
    return <div className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse" />;
  }

  const isDark = (resolvedTheme || theme) === 'dark';
  const activeAtlasOption = THEME_OPTIONS.find((t) => t.id === atlasTheme) || THEME_OPTIONS[0];

  return (
    <div ref={ref} className="relative inline-block text-left select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-surface-container/60 px-2 text-xs font-medium text-foreground hover:bg-surface-container hover:border-primary/40 transition cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Toggle Light/Dark & 3D Aesthetic Themes"
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span className="text-xs">{activeAtlasOption.icon}</span>
        <span className="hidden xl:inline text-[11px] font-semibold text-secondary truncate max-w-[70px]">
          {activeAtlasOption.name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground opacity-60 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-border bg-card p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
          {/* Section 1: Appearance Mode Switcher */}
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Workstation Mode
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-lg">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
                !isDark
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
                isDark
                  ? 'bg-background text-primary shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-primary" />
              <span>Dark</span>
            </button>
          </div>

          <div className="my-2 border-t border-border/40" />

          {/* Section 2: Clinical 3D Aesthetic Theme */}
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Atlas 3D Aesthetic
          </div>
          <div className="space-y-1">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = opt.id === atlasTheme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    handleSelectAtlasTheme(opt.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span className="text-base leading-none">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs leading-none truncate">{opt.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{opt.desc}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-border/40" />

          {/* Section 3: Launch Theme Studio */}
          <a
            href="/theme_studio.html"
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span>Launch Theme Studio</span>
            </span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      )}
    </div>
  );
}
