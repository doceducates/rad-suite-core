'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import type { CTMRIRuleMatch } from '@/services/clinical-rules.service';

interface HmisProtocolPreviewProps {
  matchedRule: CTMRIRuleMatch | null;
  lastDispatched: any | null;
}

export function HmisProtocolPreview({ matchedRule, lastDispatched }: HmisProtocolPreviewProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Cross-Sectional Protocol Match</span>
        {matchedRule && (
          <Badge variant="info" className="text-[10px]">
            {matchedRule.modality} Protocol Active
          </Badge>
        )}
      </div>

      {matchedRule ? (
        <div className="space-y-2.5 text-xs">
          <div>
            <span className="text-zinc-400 text-[11px] block">HMIS Diagnosis & ICD-10:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {matchedRule.hmisDiagnosis} ({matchedRule.icd10Code})
            </span>
          </div>

          <div>
            <span className="text-zinc-400 text-[11px] block">Target Scan Protocol:</span>
            <span className="text-primary font-medium">{matchedRule.scanType}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 block mb-1">Protocol Specifications:</span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{matchedRule.protocolNotes}</p>
          </div>

          {lastDispatched && (
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-2 text-[11px]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Fields Auto-Filled into HMIS Form</span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Patient verified ({lastDispatched.patientName} - MRN: {lastDispatched.patientMrn}). Technique, findings & impression populated. 
                  <strong className="text-amber-500 ml-1">Form remains open for manual doctor review and final submission.</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-zinc-400 text-xs py-8 text-center">
          Select a study to preview the auto-matched HMIS clinical protocol.
        </div>
      )}
    </Card>
  );
}
