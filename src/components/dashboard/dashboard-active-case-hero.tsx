'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Play, FileText, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ActiveDraftCase } from '@/types/dashboard';

interface DashboardActiveCaseHeroProps {
  draft: ActiveDraftCase | null;
  onClaimNextUrgent?: () => void;
}

export function DashboardActiveCaseHero({
  draft,
  onClaimNextUrgent,
}: DashboardActiveCaseHeroProps) {
  if (!draft) {
    return (
      <Card className="p-4 sm:p-5 bg-gradient-to-br from-surface-container-low via-surface to-surface-container/60 border border-outline-variant/60 shadow-xs relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Queue In Good Standing
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold font-headline text-on-surface mt-0.5">
                Ready for Next Diagnostic Study
              </h2>
              <p className="text-xs text-secondary mt-1 max-w-xl">
                You have no active drafts pending. Pick an urgent trauma or routine OPD study from the hospital queue to begin reporting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link href="/worklist">
              <Button size="sm" variant="primary" className="gap-1.5 text-xs font-semibold">
                <span>Open Worklist</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-br from-surface-container-low via-surface-container/40 to-surface-container-low border border-primary/30 shadow-xs relative overflow-hidden group hover:border-primary/50 transition-all duration-200">
      {/* Background Accent Glow */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning" className="gap-1 text-[11px] font-semibold py-0.5 px-2">
              <Sparkles className="w-3 h-3 text-tertiary" />
              <span>Continue Where You Left Off</span>
            </Badge>

            <span className="text-xs text-secondary font-mono">
              Edited {draft.lastEditedRelative}
            </span>

            {draft.isCritical && (
              <Badge variant="danger" className="animate-pulse py-0.5 px-2 text-[11px]">
                Critical Finding
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-bold font-headline text-on-surface truncate">
              {draft.patientName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-secondary font-mono">
              <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/50 font-bold text-on-surface">
                {draft.modality}
              </span>
              <span>MRN: {draft.patientMrn || 'N/A'}</span>
              <span>•</span>
              <span>Acc: #{draft.accessionNumber}</span>
            </div>
          </div>

          {/* Clinical Findings Preview */}
          <div className="p-2.5 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40 text-xs text-on-surface-variant max-w-3xl line-clamp-2 italic">
            &ldquo;{draft.findingsPreview}&rdquo;
          </div>
        </div>

        {/* Action Anchor */}
        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
          <Link href={`/workstation?accession=${encodeURIComponent(draft.accessionNumber)}`}>
            <Button
              size="md"
              variant="primary"
              className="gap-2 font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Case</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-on-primary/20 rounded text-on-primary">
                Space
              </kbd>
            </Button>
          </Link>

          <Link href="/my-cases">
            <Button size="md" variant="secondary" className="gap-1.5 text-xs text-secondary">
              <FileText className="w-3.5 h-3.5" />
              <span>My Cases</span>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
