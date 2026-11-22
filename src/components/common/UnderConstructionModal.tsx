'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Construction, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

interface UnderConstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  category?: 'ai' | 'cloud_sync' | 'general';
}

export function UnderConstructionModal({
  isOpen,
  onClose,
  featureName = 'Clinical AI Diagnostic Lab',
  category = 'ai',
}: UnderConstructionModalProps) {
  const isAi = category === 'ai';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 flex flex-col gap-5 text-foreground">
        {/* Header with status badge */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              {isAi ? <Sparkles className="w-5 h-5 text-amber-400" /> : <Construction className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                {featureName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Alpha Workstation Preview</p>
            </div>
          </div>
          <Badge variant="warning" className="text-[10px] uppercase font-mono">
            Under Testing
          </Badge>
        </div>

        {/* Informative Body */}
        <div className="bg-surface-container p-4 rounded-xl border border-border text-xs leading-relaxed space-y-2.5">
          {isAi ? (
            <>
              <p className="text-foreground font-medium">
                MedGemma 27B and Clinical AI Copilot are currently undergoing rigorous diagnostic safety validation and multi-center testing.
              </p>
              <p className="text-muted-foreground">
                To prevent unverified hallucinated diagnostic impressions during our Alpha clinical evaluation, direct cloud AI queries are restricted.
                Deterministic shorthand delta rules (e.g. <code className="text-sky-400 bg-background px-1 py-0.5 rounded font-mono">l3-l4 normal</code>, <code className="text-sky-400 bg-background px-1 py-0.5 rounded font-mono">clear l1-l2</code>) remain 100% active and instantaneous!
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground font-medium">
                Central VPS Cloud Sync is currently in active staging and validation.
              </p>
              <p className="text-muted-foreground">
                During this Alpha testing phase, all of your patient studies, reports, and revision histories are stored safely inside your <strong>durable local workstation vault</strong> and can be linked to your personal <strong>Google Drive</strong>.
              </p>
            </>
          )}

          <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Target Availability: Unlocking in upcoming Beta release.</span>
          </div>
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-1">
          <Button variant="primary" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Return to Workstation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
