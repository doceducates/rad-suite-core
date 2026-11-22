'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getPresetsForModality, type ClinicalPreset } from '@/services/clinical-presets.service';

interface ClinicalPresetSelectorProps {
  preset: string;
  onSelectPreset: (preset: string) => void;
  modality?: string;
}

export function ClinicalPresetSelector({ preset, onSelectPreset, modality = 'CT' }: ClinicalPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const presets = getPresetsForModality(modality);
  const activePreset = presets.find((p) => p.id === preset || p.name.toLowerCase() === preset?.toLowerCase()) || presets[0];

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePos = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 260;
      let left = rect.left;

      if (typeof window !== 'undefined') {
        if (left + popoverWidth > window.innerWidth - 8) {
          left = window.innerWidth - popoverWidth - 8;
        }
        if (left < 8) left = 8;
      }

      setPos({ top: rect.bottom + 6, left });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (p: ClinicalPreset) => {
    onSelectPreset(p.id);
    setIsOpen(false);
  };

  const isMr = String(modality).toUpperCase().startsWith('MR');

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-6 h-6 flex items-center justify-center rounded-md border transition-all cursor-pointer relative ${
          isOpen
            ? 'bg-primary text-white border-primary shadow-2xs'
            : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
        }`}
        title={`Window/Level Presets · Active: ${activePreset?.name || 'Default'} (${activePreset?.wc}/${activePreset?.ww})`}
      >
        <span className="material-symbols-outlined text-[15px]">contrast</span>
      </button>

      {mounted && isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px` }}
          className="z-[99999] p-2.5 rounded-xl bg-surface-container-highest border border-outline-variant/70 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl select-none w-64 animate-in fade-in zoom-in-95 duration-100 text-on-surface text-[11px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/40">
            <span className="font-semibold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">contrast</span>
              Window Presets
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono text-[10px] font-bold">
              {activePreset?.name || 'Standard'}
            </span>
          </div>

          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1.5 mb-1">
            {isMr ? 'MRI Adaptive Presets' : `${modality.toUpperCase()} Clinical Presets`}
          </div>
          <div className="grid grid-cols-1 gap-0.5 max-h-64 overflow-y-auto [scrollbar-width:thin]">
            {presets.map((p) => {
              const isSel = activePreset?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`flex items-center justify-between px-2 py-1 rounded-md transition-colors cursor-pointer text-left ${
                    isSel
                      ? 'bg-primary/20 text-primary font-bold border-l-2 border-primary'
                      : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="truncate pr-2">{p.name}</span>
                  <span className="font-mono text-[9px] text-on-surface-variant/70 shrink-0">
                    {p.wc}/{p.ww}
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
