'use client';

import React from 'react';
import { Save, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClinicSaveBarProps {
  hasChanges: boolean;
  saving: boolean;
  dirtySections: string[];
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export function ClinicSaveBar({
  hasChanges,
  saving,
  dirtySections,
  onSave,
  onDiscard,
}: ClinicSaveBarProps) {
  if (!hasChanges) return null;

  return (
    <div className="sticky bottom-4 z-40 w-full animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="mx-auto max-w-4xl p-3.5 rounded-2xl bg-card/95 backdrop-blur-md border border-primary/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <span>Unsaved Configuration Changes</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
                {dirtySections.length} {dirtySections.length === 1 ? 'section' : 'sections'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-md">
              Modified: {dirtySections.join(' · ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={saving}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Saving All Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All Settings</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
