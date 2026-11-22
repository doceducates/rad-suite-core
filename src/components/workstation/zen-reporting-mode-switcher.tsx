'use client';

import React from 'react';
import { ReportingMode } from '@/hooks/use-reporting-layout';

interface ZenReportingModeSwitcherProps {
  mode: ReportingMode;
  onSelectMode: (mode: ReportingMode) => void;
}

const MODES: { id: ReportingMode; icon: string; title: string; shortcut: string }[] = [
  { id: 'fab', icon: 'minimize', title: 'Minimize to FAB', shortcut: 'Alt+1' },
  { id: 'split', icon: 'vertical_split', title: 'Split Screen Reporting', shortcut: 'Alt+2' },
  { id: 'modal', icon: 'picture_in_picture_alt', title: 'Floating Report Modal', shortcut: 'Alt+3' },
  { id: 'full', icon: 'fullscreen', title: 'Full Studio Canvas', shortcut: 'Alt+4' },
];

export function ZenReportingModeSwitcher({ mode, onSelectMode }: ZenReportingModeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Reporting display modes"
      className="flex items-center bg-surface-container p-0.5 rounded-lg border border-outline-variant/40 shadow-2xs select-none gap-0.5"
    >
      {MODES.map((m) => {
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMode(m.id)}
            title={`${m.title} (${m.shortcut})`}
            aria-label={`${m.title} (${m.shortcut})`}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer ${
              isActive
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
