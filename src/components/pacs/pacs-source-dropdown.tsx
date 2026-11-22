'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers, HardDrive, Server, Cloud } from 'lucide-react';

export interface PacsSourceDropdownProps {
  value: string;
  onChange: (source: string) => void;
  allowedSources?: string[];
  isAdmin?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

interface SourceOption {
  id: string;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const PACS_SOURCES: SourceOption[] = [
  {
    id: 'all',
    label: 'All Sources',
    shortLabel: 'Source: All',
    Icon: Layers,
    desc: 'Clinic PACS, Hospital PACS & Cloud S3',
  },
  {
    id: 'clinic_pc',
    label: 'Clinic Edge PACS',
    shortLabel: 'Clinic Edge',
    Icon: HardDrive,
    desc: 'On-premise high-speed diagnostic vault',
  },
  {
    id: 'hospital_pacs',
    label: 'Hospital Central PACS',
    shortLabel: 'Hospital PACS',
    Icon: Server,
    desc: 'Live Hospital PACS C-FIND archive',
  },
  {
    id: 's3',
    label: 'Cloud S3 Vault',
    shortLabel: 'Cloud S3',
    Icon: Cloud,
    desc: 'Cloud S3 permanent mirror',
  },
];

export function PacsSourceDropdown({
  value = 'all',
  onChange,
  allowedSources,
  isAdmin = false,
  className = '',
  align = 'left',
}: PacsSourceDropdownProps) {
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

  const visibleSources = React.useMemo(() => {
    if (isAdmin) return PACS_SOURCES;
    const allowed = allowedSources && allowedSources.length > 0 ? allowedSources : ['local', 'gdrive'];
    if (allowed.includes('*')) return PACS_SOURCES;

    const canS3 = allowed.includes('s3');
    const canClinic = allowed.includes('remote_node') || allowed.includes('clinic_pacs');
    const canPacs = allowed.includes('pacs') || allowed.includes('hospital_pacs');

    return PACS_SOURCES.filter((s) => {
      if (s.id === 'all') return true;
      if (s.id === 's3') return canS3;
      if (s.id === 'clinic_pc') return canClinic;
      if (s.id === 'hospital_pacs') return canPacs;
      return false;
    });
  }, [isAdmin, allowedSources]);

  const activeOption = visibleSources.find((s) => s.id === value) || visibleSources[0] || PACS_SOURCES[0];
  const isFiltered = value && value !== 'all';
  const ActiveIcon = activeOption.Icon;

  return (
    <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
          isFiltered
            ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
            : 'border-border bg-card text-foreground hover:bg-surface-container'
        }`}
        title="Filter studies by physical storage location / PACS source"
      >
        <ActiveIcon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="truncate max-w-[110px]">{activeOption.shortLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-64 p-1.5 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground`}
        >
          {visibleSources.map((src) => {
            const isSelected = src.id === value || (src.id === 'all' && (!value || value === 'all'));
            const OptionIcon = src.Icon;
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => {
                  onChange(src.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold'
                    : 'hover:bg-surface-container text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <OptionIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-on-primary' : 'text-muted-foreground'}`} />
                  <div className="truncate">
                    <div className="font-medium truncate">{src.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-on-primary/80' : 'text-muted-foreground'
                      }`}
                    >
                      {src.desc}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
