'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';

export interface WorklistRegionDropdownProps {
  value: string;
  onChange: (region: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

const REGION_OPTIONS = [
  { id: 'all', label: 'All Regions', shortLabel: 'Region', icon: '🌐' },
  {
    group: 'Spine Segments',
    items: [
      { id: 'spine', label: 'Spine (All Segments)', shortLabel: 'Spine', icon: '🦴' },
      { id: 'ls_spine', label: 'LS Spine (Lumbar)', shortLabel: 'LS Spine', icon: '🦴' },
      { id: 'cervical', label: 'Cervical Spine (C-Spine)', shortLabel: 'C-Spine', icon: '🦴' },
      { id: 'thoracic', label: 'Thoracic / Dorsal (D-Spine)', shortLabel: 'D-Spine', icon: '🦴' },
      { id: 'whole_spine', label: 'Whole Spine / Screening', shortLabel: 'Whole Spine', icon: '🦴' },
    ],
  },
  {
    group: 'General Anatomy',
    items: [
      { id: 'neuro', label: 'Brain / Neuro / Head', shortLabel: 'Brain/Neuro', icon: '🧠' },
      { id: 'chest', label: 'Thorax / Chest / HRCT', shortLabel: 'Thorax/Chest', icon: '🫁' },
      { id: 'abdomen', label: 'Abdomen & Pelvis / KUB', shortLabel: 'Abdomen/KUB', icon: '🩺' },
      { id: 'msk', label: 'MSK / Extremity / Joints', shortLabel: 'MSK/Joints', icon: '🦵' },
    ],
  },
];

export function WorklistRegionDropdown({
  value = 'all',
  onChange,
  className = '',
  align = 'left',
}: WorklistRegionDropdownProps) {
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

  // Find active item
  let activeItem = REGION_OPTIONS[0];
  if (value && value !== 'all') {
    for (const entry of REGION_OPTIONS) {
      if ('items' in entry && entry.items) {
        const found = entry.items.find((item) => item.id === value);
        if (found) {
          activeItem = found;
          break;
        }
      }
    }
  }

  const isFiltered = value && value !== 'all';

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
        title="Filter worklist by anatomical body part or spine segment"
      >
        <span className="shrink-0">{activeItem.icon}</span>
        <span className="truncate max-w-[120px]">{activeItem.shortLabel}</span>
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
          } mt-1.5 w-64 p-2 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground max-h-80 overflow-y-auto`}
        >
          {/* All Regions Option */}
          <button
            type="button"
            onClick={() => {
              onChange('all');
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
              !isFiltered
                ? 'bg-primary text-on-primary font-bold'
                : 'hover:bg-surface-container text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>🌐</span>
              <span>All Regions</span>
            </div>
            {!isFiltered && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>

          {/* Grouped Regions */}
          {REGION_OPTIONS.slice(1).map((section: any) => (
            <div key={section.group} className="mt-2 pt-1 border-t border-border/50">
              <div className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section.group}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {section.items.map((item: any) => {
                  const isSelected = value === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onChange(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-primary text-on-primary font-bold'
                          : 'hover:bg-surface-container text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
