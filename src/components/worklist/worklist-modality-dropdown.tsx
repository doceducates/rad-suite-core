'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface WorklistModalityDropdownProps {
  value: string;
  onChange: (modality: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

const MODALITY_OPTIONS = [
  { id: 'all', label: 'All Modalities', shortLabel: 'Modality', icon: '🌐' },
  { id: 'MRI', label: 'MRI (Magnetic Resonance)', shortLabel: 'MRI', icon: '🧲' },
  { id: 'CT', label: 'CT (Computed Tomography)', shortLabel: 'CT', icon: '☢️' },
  { id: 'CR', label: 'X-Ray (CR / DX / Radiography)', shortLabel: 'X-Ray', icon: '🦴' },
  { id: 'US', label: 'Ultrasound (Sonography)', shortLabel: 'US', icon: '📡' },
];

export function WorklistModalityDropdown({
  value = 'all',
  onChange,
  className = '',
  align = 'left',
}: WorklistModalityDropdownProps) {
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

  const valUpper = (value || '').toUpperCase();
  const activeOption =
    MODALITY_OPTIONS.find((m) => m.id.toUpperCase() === valUpper) ||
    (valUpper === 'MR' ? MODALITY_OPTIONS.find((m) => m.id === 'MRI') : undefined) ||
    (valUpper === 'XR' || valUpper === 'DX' || valUpper === 'X-RAY'
      ? MODALITY_OPTIONS.find((m) => m.id === 'CR')
      : undefined) ||
    MODALITY_OPTIONS[0];
  const isFiltered = value && value.toLowerCase() !== 'all';

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
        title="Filter worklist by imaging modality (MRI, CT, X-Ray, US)"
      >
        <span className="shrink-0">{activeOption.icon}</span>
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
          } mt-1.5 w-60 p-1.5 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground`}
        >
          {MODALITY_OPTIONS.map((mod) => {
            const isSelected =
              mod.id.toUpperCase() === (value || 'all').toUpperCase() ||
              (mod.id === 'all' && (!value || value === 'all'));
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  onChange(mod.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold'
                    : 'hover:bg-surface-container text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{mod.icon}</span>
                  <span>{mod.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
