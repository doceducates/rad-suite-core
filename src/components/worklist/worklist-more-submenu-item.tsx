'use client';

// Layer 4 (Presentation): Expandable Submenu Item for More Filters (<70 lines)
import React from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import type { MoreFilterOption } from './worklist-more-dropdown-options';

interface WorklistMoreSubmenuItemProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  selectedOption: MoreFilterOption;
  options: MoreFilterOption[];
  selectedValue: string;
  onSelect: (id: string) => void;
  isCustomActive: boolean;
}

export function WorklistMoreSubmenuItem({
  label,
  icon,
  isOpen,
  onToggle,
  selectedOption,
  options,
  selectedValue,
  onSelect,
  isCustomActive,
}: WorklistMoreSubmenuItemProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
          isOpen || isCustomActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'hover:bg-surface-container text-on-surface'
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono px-1 rounded bg-surface-container-high text-secondary">
            {selectedOption.shortLabel}
          </span>
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-secondary" />
          ) : (
            <ChevronRight className="w-3 h-3 text-secondary" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="ml-4 pl-2 my-1 border-l-2 border-primary/30 flex flex-col gap-0.5 animate-in fade-in duration-100">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`flex items-center justify-between px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                selectedValue === opt.id
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'hover:bg-surface-container text-on-surface/80'
              }`}
            >
              <span>{opt.label}</span>
              {selectedValue === opt.id && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
