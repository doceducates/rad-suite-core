import React from 'react';

interface MandatoryCaseIdentifiersProps {
  mrn: string;
  accessionNumber: string;
  onMrnChange: (val: string) => void;
  onAccessionChange: (val: string) => void;
  onGenerateMrn?: () => void;
  onGenerateAccession?: () => void;
  readOnlyAccession?: boolean;
  isMultiStudy?: boolean;
  studiesCount?: number;
  candidateStudies?: { accessionNumber: string; studyDescription?: string; modality?: string }[];
}

export function MandatoryCaseIdentifiers({
  mrn,
  accessionNumber,
  onMrnChange,
  onAccessionChange,
  onGenerateMrn,
  onGenerateAccession,
  readOnlyAccession = false,
  isMultiStudy = false,
  studiesCount,
  candidateStudies = [],
}: MandatoryCaseIdentifiersProps) {
  const hasIdentifier = Boolean(mrn.trim() || accessionNumber.trim());

  return (
    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-primary flex items-center gap-1">
            <span>Direct Case Identifiers</span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                hasIdentifier
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {hasIdentifier ? '✓ Valid' : '⚠️ At least 1 required'}
            </span>
          </span>
          {isMultiStudy && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
              📚 Multi-Study Case ({studiesCount || 2} Studies) • Unified IDs
            </span>
          )}
        </div>
        <span className="text-[10px] text-secondary">Single field for accession & MRN</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-secondary">MR Number (MRN)</label>
            {onGenerateMrn && (
              <button
                type="button"
                onClick={onGenerateMrn}
                className="text-[10px] text-primary hover:underline font-mono cursor-pointer"
              >
                + Auto-Gen
              </button>
            )}
          </div>
          <input
            type="text"
            value={mrn}
            onChange={(e) => onMrnChange(e.target.value)}
            placeholder="e.g. MRN-261005-1049"
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface font-mono focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-secondary">Accession Number</label>
            {onGenerateAccession && (
              <button
                type="button"
                onClick={onGenerateAccession}
                className="text-[10px] text-primary hover:underline font-mono cursor-pointer"
              >
                + Auto-Gen
              </button>
            )}
          </div>
          <input
            type="text"
            value={accessionNumber}
            readOnly={readOnlyAccession}
            onChange={(e) => onAccessionChange(e.target.value)}
            placeholder="e.g. MAN-261005-A1B2"
            className={`w-full px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs font-mono outline-none ${
              readOnlyAccession
                ? 'bg-surface-container-high text-secondary cursor-not-allowed'
                : 'bg-surface-container-lowest text-on-surface focus:ring-1 focus:ring-primary'
            }`}
          />
        </div>
      </div>

      {candidateStudies.length > 0 && (
        <div className="pt-2 border-t border-primary/20 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-secondary">
              Registered Studies for this MRN ({candidateStudies.length}):
            </span>
            <span className="text-[9px] text-muted-foreground">Click to shift report to that accession</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {candidateStudies.map((cs) => {
              const isCurrent = cs.accessionNumber.toUpperCase() === accessionNumber.trim().toUpperCase();
              return (
                <button
                  key={cs.accessionNumber}
                  type="button"
                  onClick={() => onAccessionChange(cs.accessionNumber)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                      : 'bg-surface-container hover:bg-primary/10 text-primary border-primary/30 font-medium'
                  }`}
                  title={`Select ${cs.accessionNumber} (${cs.studyDescription || 'Study'}) to shift report`}
                >
                  <span>Shift ➔ {cs.accessionNumber}</span>
                  {cs.modality && <span className="font-sans text-[9px] opacity-80">[{cs.modality}]</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
