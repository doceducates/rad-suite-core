'use client';

// Layer 4 (Presentation): Age Discrepancy Popover Resolver
// Strict File Size Invariant: Target < 160 lines

import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Check, User, Activity, Edit2 } from 'lucide-react';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface AgeDiscrepancyPopoverProps {
  study: PacsStudyResult;
  onRefresh?: () => void;
}

export function AgeDiscrepancyPopover({ study, onRefresh }: AgeDiscrepancyPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customAge, setCustomAge] = useState('');
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const dicomAge = study.dicomAge ?? (study.age > 0 ? study.age : null);
  const hmisAge = study.hmisAge ?? null;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const handleResolve = async (chosenAge: number, source: 'dicom' | 'hmis' | 'manual') => {
    if (isNaN(chosenAge) || chosenAge < 0 || chosenAge > 120) {
      notify.error('Please enter a valid age between 0 and 120.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(study.accessionNumber)}/age`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: chosenAge, source }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update age');
      }

      notify.success(`Resolved age to ${chosenAge}y (${source.toUpperCase()})`);
      setIsOpen(false);
      onRefresh?.();
    } catch (err: any) {
      notify.error(`Could not resolve age: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Age Discrepancy: Tech (${dicomAge ?? 'N/A'}y) vs HMIS (${hmisAge ?? 'N/A'}y). Click to resolve.`}
        className="inline-flex items-center justify-center p-0.5 ml-1 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
        aria-label="Age Discrepancy Warning"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 p-3 bg-surface border border-outline-variant rounded-xl shadow-xl z-50 text-left font-sans animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/60">
            <span className="font-semibold text-xs text-on-surface flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Resolve Age Discrepancy
            </span>
            <span className="text-[10px] text-secondary">
              Current: <strong className="text-on-surface">{study.age}y</strong>
            </span>
          </div>

          <p className="text-[10px] text-secondary mb-2.5 leading-tight">
            Family registration at counter often differs from scanner technologist entry. Select the verified age:
          </p>

          <div className="space-y-1.5 mb-2.5">
            {dicomAge !== null && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleResolve(dicomAge, 'dicom')}
                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  study.age === dicomAge
                    ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                    : 'border-outline-variant hover:bg-surface-container text-on-surface'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-secondary" />
                  <span>Tech / Scanner:</span>
                  <span className="font-bold">{dicomAge}y</span>
                </div>
                {study.age === dicomAge && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            )}

            {hmisAge !== null && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleResolve(hmisAge, 'hmis')}
                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                  study.age === hmisAge
                    ? 'border-primary/50 bg-primary/10 text-primary font-medium'
                    : 'border-outline-variant hover:bg-surface-container text-on-surface'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-secondary" />
                  <span>HMIS Ticket:</span>
                  <span className="font-bold">{hmisAge}y</span>
                </div>
                {study.age === hmisAge && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            )}
          </div>

          {/* Custom Input */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-outline-variant/40">
            <Edit2 className="w-3 h-3 text-secondary" />
            <input
              type="number"
              min="0"
              max="120"
              placeholder="Custom"
              value={customAge}
              onChange={(e) => setCustomAge(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customAge) {
                  handleResolve(parseInt(customAge, 10), 'manual');
                }
              }}
              className="w-16 px-1.5 py-1 text-xs border border-outline-variant rounded bg-surface-container-lowest text-on-surface focus:outline-hidden focus:border-primary"
            />
            <span className="text-[11px] text-secondary">yrs</span>
            <button
              type="button"
              disabled={saving || !customAge}
              onClick={() => handleResolve(parseInt(customAge, 10), 'manual')}
              className="ml-auto px-2 py-1 text-[11px] font-medium rounded bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 cursor-pointer"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
