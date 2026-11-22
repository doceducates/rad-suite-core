'use client';

// Layer 4 (Presentation): Canonical Smart Date Range Dropdown with Responsive Modal Calendar (<220 lines)
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, CalendarDays, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './modal';
import { CalendarPicker } from './calendar-picker';

export interface DateRangePreset {
  id: string;
  label: string;
  shortLabel: string;
}

export const DEFAULT_DATE_PRESETS: DateRangePreset[] = [
  { id: '48h', label: 'Today & Yesterday (Default)', shortLabel: 'Today & Yesterday' },
  { id: 'today', label: 'Today Only', shortLabel: 'Today' },
  { id: 'yesterday', label: 'Yesterday Only', shortLabel: 'Yesterday' },
  { id: '7d', label: 'Past 7 Days', shortLabel: '7d' },
  { id: '30d', label: 'Past 30 Days', shortLabel: '30d' },
  { id: 'all', label: 'All Historical Dates', shortLabel: 'All Time' },
];

export interface DateRangeDropdownProps {
  value: string;
  onChange: (preset: string, customFrom?: string, customTo?: string) => void;
  customFrom?: string;
  customTo?: string;
  className?: string;
  align?: 'left' | 'right';
  presets?: DateRangePreset[];
}

export function DateRangeDropdown({
  value,
  onChange,
  customFrom = '',
  customTo = '',
  className = '',
  align = 'left',
  presets = DEFAULT_DATE_PRESETS,
}: DateRangeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(customFrom);
  const [tempTo, setTempTo] = useState(customTo);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  const activePreset = presets.find((p) => p.id === value);
  const isCustom = value === 'custom' || (!activePreset && (customFrom || customTo));

  const triggerLabel = isCustom
    ? customFrom && customTo
      ? `${customFrom} → ${customTo}`
      : customFrom
      ? `From ${customFrom}`
      : customTo
      ? `Until ${customTo}`
      : 'Custom Range'
    : activePreset?.shortLabel || 'Select Date';

  const handleSelectPreset = (presetId: string) => {
    onChange(presetId);
    setIsOpen(false);
  };

  const handleOpenCustomModal = () => {
    setTempFrom(customFrom);
    setTempTo(customTo);
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handleApplyCustom = () => {
    if (!tempFrom) return;
    onChange('custom', tempFrom, tempTo || tempFrom);
    setIsModalOpen(false);
  };

  const handleClearCustom = () => {
    setTempFrom('');
    setTempTo('');
    onChange('shift');
    setIsModalOpen(false);
  };

  return (
    <>
      <div className={`relative inline-block text-xs font-sans ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all shadow-2xs cursor-pointer select-none ${
            isCustom
              ? 'border-primary/50 bg-primary/10 text-primary font-semibold ring-1 ring-primary/40'
              : 'border-border bg-card text-foreground hover:bg-surface-container'
          }`}
          title="Filter by acquisition or scheduled date"
        >
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-medium truncate max-w-[130px] sm:max-w-[170px]">{triggerLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Compact Date Presets Dropdown */}
        {isOpen && (
          <div
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } mt-1.5 w-60 p-2 bg-card border border-border rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150 text-foreground`}
          >
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Date Presets
            </div>

            <div className="space-y-0.5">
              {presets.map((preset) => {
                const isSelected = !isCustom && value === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-foreground hover:bg-surface-container'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border my-1.5" />

            {/* Custom Date Range Action Button */}
            <button
              type="button"
              onClick={handleOpenCustomModal}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                isCustom
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'text-foreground hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span>Custom Date Range...</span>
              </div>
              {isCustom ? (
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <span className="text-[10px] text-muted-foreground">📅</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Responsive Custom Date Range Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="sm"
        className="max-w-[360px]"
      >
        <ModalHeader onClose={() => setIsModalOpen(false)}>
          <div>
            <ModalTitle className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              Custom Date Range
            </ModalTitle>
            <ModalDescription>Select start and end dates to filter cases</ModalDescription>
          </div>
        </ModalHeader>

        <ModalBody className="p-4 space-y-3">
          {/* Selected Range Display Banner */}
          <div className="p-2.5 rounded-xl border border-outline-variant/60 bg-surface-container flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={tempFrom ? 'font-bold text-foreground' : 'text-secondary'}>
                {tempFrom || 'Start date'}
              </span>
              <ArrowRight className="w-3 h-3 text-secondary" />
              <span className={tempTo ? 'font-bold text-foreground' : 'text-secondary'}>
                {tempTo || tempFrom || 'End date'}
              </span>
            </div>
            {tempFrom && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/15 text-primary font-semibold">
                {tempTo && tempTo !== tempFrom ? 'Range Active' : 'Single Day'}
              </span>
            )}
          </div>

          {/* Interactive Responsive Calendar Grid */}
          <div className="flex justify-center">
            <CalendarPicker
              mode="range"
              fromDate={tempFrom}
              toDate={tempTo}
              onSelectRange={(from, to) => {
                setTempFrom(from || '');
                setTempTo(to || '');
              }}
              showPresets={false}
              className="p-1 border-0 shadow-none bg-transparent w-full"
            />
          </div>
        </ModalBody>

        <ModalFooter className="px-4 py-3 justify-between">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClearCustom}
            className="text-xs h-8 text-secondary hover:text-foreground cursor-pointer"
          >
            Reset
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={!tempFrom}
              onClick={handleApplyCustom}
              className="text-xs h-8 font-semibold cursor-pointer disabled:opacity-50"
            >
              Apply Range
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </>
  );
}
