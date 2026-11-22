'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, HardDrive, Cloud, Database, Server, Radio, Layers } from 'lucide-react';
import { StandbySourceTab, STANDBY_SOURCE_CONFIGS } from './standby-types';

export interface StandbySourceDropdownProps {
  value: StandbySourceTab;
  onChange: (val: StandbySourceTab) => void;
  allowedSources?: string[];
  isAdmin?: boolean;
  counts?: Partial<Record<StandbySourceTab, number>>;
  className?: string;
}

export function StandbySourceDropdown({
  value = 'all',
  onChange,
  allowedSources,
  isAdmin = false,
  counts = {},
  className = '',
}: StandbySourceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const visibleConfigs = React.useMemo(() => {
    if (isAdmin) return STANDBY_SOURCE_CONFIGS;
    const allowed = allowedSources && allowedSources.length > 0 ? allowedSources : ['local', 'gdrive'];
    return STANDBY_SOURCE_CONFIGS.filter(
      (cfg) => cfg.id === 'all' || allowed.includes(cfg.id)
    );
  }, [isAdmin, allowedSources]);

  const activeOption = visibleConfigs.find((c) => c.id === value) || visibleConfigs[0];
  const isFiltered = value && value !== 'all';

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'local':
        return <HardDrive className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 's3':
        return <Database className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'gdrive':
        return <Cloud className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
      case 'pacs':
        return <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'remote':
        return <Radio className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-primary shrink-0" />;
    }
  };

  return (
    <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
          isFiltered
            ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
            : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
        }`}
        title="Filter by Storage / PACS Source"
      >
        {getIcon(activeOption.iconName)}
        <span>{activeOption.shortLabel || activeOption.label}</span>
        {counts[activeOption.id] !== undefined && (
          <span className="text-[10px] font-mono opacity-80">({counts[activeOption.id]})</span>
        )}
        <ChevronDown className="w-3 h-3 text-secondary shrink-0 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-surface-container-high border border-outline-variant/80 shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-outline-variant/40">
            Select Case Source
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/20">
            {visibleConfigs.map((cfg) => {
              const isSelected = cfg.id === value;
              const count = counts[cfg.id];
              return (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => {
                    onChange(cfg.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getIcon(cfg.iconName)}
                    <div className="truncate">
                      <div className="leading-tight truncate">{cfg.label}</div>
                      <div className="text-[10px] text-secondary truncate">{cfg.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {count !== undefined && count > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-container border border-outline-variant/40 text-secondary">
                        {count}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
