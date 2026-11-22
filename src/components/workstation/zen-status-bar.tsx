'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, CheckCircle2, User, ChevronDown, Sparkles } from 'lucide-react';

interface ZenStatusBarProps {
  patientName: string;
  age?: number | string;
  gender?: string;
  modality: string;
  accessionNumber: string;
  status: 'draft' | 'final' | 'pending';
  saving: boolean;
  onSave: () => void;
  onFinalize: () => void;
  onOpenCommandPalette: () => void;
  currentCaseId?: string;
}

interface LocalCaseItem {
  id: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDescription: string;
  seriesCount: number;
}

export function ZenStatusBar({
  patientName,
  age = '51y',
  gender = 'M',
  modality = 'CT',
  accessionNumber,
  status = 'draft',
  saving,
  onSave,
  onFinalize,
  onOpenCommandPalette,
  currentCaseId,
}: ZenStatusBarProps) {
  const router = useRouter();
  const [localCases, setLocalCases] = useState<LocalCaseItem[]>([]);
  const [isCaseMenuOpen, setIsCaseMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/cases')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.cases)) {
          setLocalCases(data.cases);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="h-9 px-3 bg-[#080d1a] border-b border-zinc-800/80 flex items-center justify-between text-xs select-none z-30 shrink-0">
      {/* Left: Patient Info & Case Selector */}
      <div className="flex items-center gap-2.5 text-zinc-300">
        <button
          type="button"
          onClick={() => router.push('/worklist')}
          title="Back to Worklist"
          className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors flex items-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Real Cases Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCaseMenuOpen(!isCaseMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-primary text-[11px] font-medium transition-colors"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Cases ({localCases.length + 1})</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isCaseMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 z-50">
              <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                Switch Patient Case
              </div>

              {localCases.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIsCaseMenuOpen(false);
                    router.push(`/workspace/${c.id}`);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                    currentCaseId === c.id ? 'text-primary font-semibold' : 'text-zinc-300'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{c.patientName}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{c.studyDescription || c.modality} ({c.seriesCount}s)</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-zinc-700">|</span>

        {/* Patient Name & Demographics */}
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-100 text-sm tracking-tight">{patientName}</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400 text-xs">{age} {gender}</span>
          <span className="text-zinc-500">|</span>
          <span className="px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/30 text-[10px] font-mono font-bold">
            {modality}
          </span>
          <span className="font-mono text-zinc-400 text-xs">{accessionNumber}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
          status === 'final'
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        }`}>
          {status === 'final' ? 'Final' : 'Draft'}
        </span>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title={saving ? 'Saving changes to database...' : 'Save Report (Ctrl+S)'}
          className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin text-primary' : 'text-zinc-400'}`} />
        </button>

        <button
          type="button"
          onClick={onFinalize}
          title="Finalize Report"
          className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 text-[10px] font-mono transition-colors cursor-pointer"
        >
          ⌘K
        </button>
      </div>
    </header>
  );
}
