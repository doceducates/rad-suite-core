'use client';

// Layer 4: Profile Dropdown Theme & 3D Aesthetic Section (<150 lines)
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Palette, ExternalLink, Check } from 'lucide-react';
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
    desc: 'Matte ivory stone & sculpture',
  },
  {
    id: 'wax',
    name: 'Classical Wax',
    icon: '🕯️',
    desc: 'Polychromatic anatomical wax',
  },
  {
    id: 'kintsugi',
    name: 'Obsidian & Gold',
    icon: '🏺',
    desc: 'Dark tissue with gold veins',
  },
];

interface ProfileThemeControlsProps {
  onCloseMenu?: () => void;
}

export function ProfileThemeControls({ onCloseMenu }: ProfileThemeControlsProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [atlasTheme, setAtlasTheme] = useState<AtlasThemeId>('clay');

  useEffect(() => {
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

  const handleSelectAtlasTheme = (newTheme: AtlasThemeId) => {
    setAtlasTheme(newTheme);
    emitAtlasThemeChange(newTheme);
    notify.info(
      `Atlas Theme: ${
        newTheme === 'clay' ? 'Pure Clay' : newTheme === 'wax' ? 'Classical Wax' : 'Obsidian & Gold'
      }`
    );
  };

  const isDark = (resolvedTheme || theme) === 'dark';

  return (
    <div className="space-y-2 select-none">
      <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-secondary font-mono flex items-center justify-between">
        <span>Workstation Mode</span>
        <span suppressHydrationWarning className="text-[9px] lowercase font-normal text-secondary/70">{theme}</span>
      </div>

      {/* Mode Switcher: Light vs Dark */}
      <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-container rounded-lg border border-outline-variant/40">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
            !isDark
              ? 'bg-surface text-on-surface shadow-xs font-semibold'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
            isDark
              ? 'bg-surface text-primary shadow-xs font-semibold'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <Moon className="w-3.5 h-3.5 text-primary" />
          <span>Dark</span>
        </button>
      </div>

      {/* 3D Anatomical Atlas Aesthetic */}
      <div className="pt-1.5">
        <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-secondary font-mono">
          Atlas 3D Aesthetic
        </div>
        <div className="space-y-0.5">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = opt.id === atlasTheme;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectAtlasTheme(opt.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="text-sm leading-none">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs leading-none truncate">{opt.name}</div>
                  <div className="text-[10px] text-secondary mt-0.5 truncate">{opt.desc}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch Theme Studio */}
      <a
        href="/theme_studio.html"
        target="_blank"
        rel="noreferrer"
        onClick={() => onCloseMenu?.()}
        className="flex items-center justify-between rounded-lg px-2 py-1 text-xs text-secondary hover:bg-surface-container hover:text-on-surface transition cursor-pointer border border-outline-variant/30"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Palette className="w-3.5 h-3.5 text-primary" />
          <span>Theme Studio</span>
        </span>
        <ExternalLink className="w-3 h-3 opacity-60" />
      </a>
    </div>
  );
}
