'use client';

import { AudioAssessmentReport } from '@/types/dictation';
import { Activity, Gauge, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AudioAssessmentCardProps {
  report: AudioAssessmentReport | null;
  isLoading: boolean;
  onRunAssessment: () => void;
  onClose?: () => void;
}

export function AudioAssessmentCard({
  report,
  isLoading,
  onRunAssessment,
  onClose,
}: AudioAssessmentCardProps) {
  const getBadgeConfig = (score: number) => {
    if (score >= 80) {
      return {
        variant: 'success' as const,
        label: 'High Diagnostic Firmness',
        icon: CheckCircle2,
      };
    }
    if (score >= 60) {
      return {
        variant: 'warning' as const,
        label: 'Equivocal Nuance',
        icon: AlertTriangle,
      };
    }
    return {
      variant: 'danger' as const,
      label: 'High Acoustic Hesitation',
      icon: ShieldAlert,
    };
  };

  return (
    <div className="rounded-xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-slate-900 p-3.5 space-y-3 text-xs shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-600 text-white shadow-sm">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Acoustic & Diagnostic Prosody Telemetry
            </span>
            <span className="ml-2 text-[10px] font-mono uppercase bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded">
              Biomechanical Telemetry
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={onRunAssessment}
          isLoading={isLoading}
          className="gap-1 text-xs h-7 px-2.5"
        >
          <Sparkles className="w-3 h-3 text-teal-500" />
          <span>{report ? 'Re-Analyze Prosody' : 'Assess Dictation'}</span>
        </Button>
      </div>

      {report && (
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-teal-100 dark:border-slate-700">
              <span className="text-[10px] text-zinc-500 block">Confidence Score</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  {report.overallConfidenceScore}%
                </span>
                <Badge variant={getBadgeConfig(report.overallConfidenceScore).variant} className="text-[9px] px-1 py-0">
                  {getBadgeConfig(report.overallConfidenceScore).label}
                </Badge>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-teal-100 dark:border-slate-700">
              <span className="text-[10px] text-zinc-500 block">Cadence Rate</span>
              <div className="flex items-center gap-1 mt-0.5 font-bold text-zinc-800 dark:text-zinc-200">
                <Gauge className="w-3 h-3 text-primary" />
                <span>{report.estimatedWpm} WPM</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-teal-100 dark:border-slate-700">
              <span className="text-[10px] text-zinc-500 block">Speech Clarity</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                {report.speechClarity}
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/70 border border-teal-100 dark:border-slate-700/80">
            <span className="text-[10px] font-semibold text-teal-900 dark:text-teal-300 block">Hesitation Cues:</span>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 mt-0.5">{report.acousticHesitationSummary}</p>
          </div>

          <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[10px] font-semibold text-emerald-900 dark:text-emerald-300 block">Clinical Summary:</span>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-200 mt-0.5">{report.actionableSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
