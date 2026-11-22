'use client';

// Layer 4 (Presentation): Version Snapshot Inspection Pane
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Copy, Check, FileText } from 'lucide-react';
import { ReportRevisionItem } from './report-revision-drawer';
import { notify } from '@/services/notification.service';

interface ReportRevisionPreviewPaneProps {
  revision: ReportRevisionItem | null;
  currentVersion: number;
  onRestore: () => void;
  restoring: boolean;
}

export function ReportRevisionPreviewPane({
  revision,
  currentVersion,
  onRestore,
  restoring,
}: ReportRevisionPreviewPaneProps) {
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!revision) {
    return (
      <div className="p-8 text-center text-xs text-secondary my-auto">
        Select a version from the timeline to inspect contents.
      </div>
    );
  }

  const handleCopyText = () => {
    const plainFindings = (revision.findings || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const plainImp = (revision.impression || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const full = `VERSION ${revision.version} SNAPSHOT\n\nFINDINGS:\n${plainFindings}\n\nIMPRESSION:\n${plainImp}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    notify.info(`Version ${revision.version} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCurrent = revision.version === currentVersion;

  return (
    <div className="space-y-3.5 flex-1 flex flex-col min-w-0">
      {/* Top Meta & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-outline-variant/30 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-on-surface">
              Version {revision.version} Snapshot
            </span>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              {revision.status}
            </Badge>
            {isCurrent && (
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                Active in Editor
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-secondary font-mono">
            Recorded {new Date(revision.createdAt).toLocaleString()} by {revision.authorName || 'Doctor'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-secondary hover:text-on-surface border border-outline-variant/30 hover:bg-surface-container transition-colors cursor-pointer"
            title="Copy snapshot text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!isCurrent && (
            !confirmRestore ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmRestore(true)}
                className="gap-1.5 text-xs text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to v{revision.version}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={restoring}
                  onClick={onRestore}
                  className="text-xs bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                >
                  <span>Confirm Revert</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRestore(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Findings Content */}
      <div className="space-y-1 flex-1 flex flex-col min-h-[140px]">
        <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5 shrink-0">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Findings</span>
        </span>
        <div
          className="flex-1 p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface leading-relaxed overflow-y-auto max-h-56"
          dangerouslySetInnerHTML={{
            __html: revision.findings || '<p class="text-secondary italic">No findings recorded.</p>',
          }}
        />
      </div>

      {/* Impression Content */}
      <div className="space-y-1 flex-1 flex flex-col min-h-[110px]">
        <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5 shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Impression</span>
        </span>
        <div
          className="flex-1 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-xs text-on-surface leading-relaxed overflow-y-auto max-h-48"
          dangerouslySetInnerHTML={{
            __html: revision.impression || '<p class="text-secondary italic">No impression recorded.</p>',
          }}
        />
      </div>
    </div>
  );
}
