'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Copy, Check, X, UserCheck, Loader2, Trash2 } from 'lucide-react';
import { WorklistWhatsappModal } from './worklist-whatsapp-modal';
import { formatWhatsappHandover } from '@/lib/whatsapp-handover';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistSelectionBarProps {
  selectedCases: PacsStudyResult[];
  onClearSelection: () => void;
  onClaimSelected?: (accessions: string[]) => Promise<any> | void;
  onRemoveSelected?: (accessions: string[]) => Promise<any> | void;
  onBatchStatusChange?: (status: string) => Promise<any> | void;
  currentUserName?: string;
  currentUserId?: string;
}

export function WorklistSelectionBar({
  selectedCases,
  onClearSelection,
  onClaimSelected,
  onRemoveSelected,
  onBatchStatusChange,
  currentUserName,
  currentUserId,
}: WorklistSelectionBarProps) {
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (selectedCases.length === 0) return null;

  const unclaimedCases = selectedCases.filter(
    (c) => !c.assignedRadiologistId || (currentUserId && c.assignedRadiologistId !== currentUserId)
  );
  const unclaimedCount = unclaimedCases.length;

  const handleClaimAll = async () => {
    if (!onClaimSelected || unclaimedCount === 0) return;
    setClaiming(true);
    try {
      await onClaimSelected(unclaimedCases.map((c) => c.accessionNumber));
    } finally {
      setClaiming(false);
    }
  };

  const handleRemoveAll = async () => {
    if (!onRemoveSelected || selectedCases.length === 0) return;
    setRemoving(true);
    try {
      await onRemoveSelected(selectedCases.map((c) => c.accessionNumber));
    } finally {
      setRemoving(false);
    }
  };

  const handleQuickCopy = async () => {
    let casesToCopy = selectedCases;
    try {
      const res = await fetch('/api/worklist/sync-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: selectedCases.map((c) => c.accessionNumber) }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.cases)) {
        casesToCopy = selectedCases.map((c) => {
          const match = data.cases.find(
            (sc: any) => sc.accessionNumber?.toUpperCase() === c.accessionNumber?.toUpperCase()
          );
          if (!match) return c;
          return {
            ...c,
            status: match.status || c.status,
            hmisStatus: match.hmisStatus || c.hmisStatus,
            impression: match.impression || c.impression,
            diagnosisHighlight: match.diagnosisHighlight || c.diagnosisHighlight,
            pendingReason: match.pendingReason !== undefined ? match.pendingReason : c.pendingReason,
            pendingNotes: match.pendingNotes !== undefined ? match.pendingNotes : c.pendingNotes,
          };
        });
      }
    } catch {}

    const text = formatWhatsappHandover(casesToCopy, {
      doctorName: currentUserName || 'Resident Radiologist',
      includeDiagnosisHighlights: true,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQuick(true);
      notify.info('Clinical summary copied (live synced)');
      setTimeout(() => setCopiedQuick(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedQuick(true);
      notify.info('Clinical summary copied (live synced)');
      setTimeout(() => setCopiedQuick(false), 2000);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] sm:max-w-xl w-auto">
        <div className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-card/95 backdrop-blur-md border border-primary/40 rounded-xl sm:rounded-2xl shadow-xl shadow-black/20 text-on-surface animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-x-auto no-scrollbar">
          {/* Badge & Info: Pure count number */}
          <div className="flex items-center gap-1.5 pr-1.5 sm:pr-2 border-r border-outline-variant/50 shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span
              className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary/20 text-primary font-bold text-xs"
              title={`${selectedCases.length} selected`}
            >
              {selectedCases.length}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onClaimSelected && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={handleClaimAll}
                disabled={claiming || unclaimedCount === 0}
                className="gap-1 sm:gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer text-xs h-7.5 sm:h-8 px-2 sm:px-3 shadow-xs font-semibold shrink-0"
                title={unclaimedCount > 0 ? `Take up ${unclaimedCount} unassigned cases for reporting` : 'All selected cases are already claimed'}
              >
                {claiming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                <span>
                  {claiming
                    ? 'Claiming...'
                    : unclaimedCount > 0
                    ? `Take Up (${unclaimedCount})`
                    : 'Claimed'}
                </span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsWhatsappOpen(true)}
              className="gap-1 sm:gap-1.5 bg-emerald-600/15 hover:bg-emerald-600 hover:text-white border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-pointer text-xs h-7.5 sm:h-8 px-2 sm:px-2.5 shadow-xs shrink-0"
              title="Share case details and MR numbers via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">WhatsApp</span>
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleQuickCopy}
              className="gap-1 sm:gap-1.5 cursor-pointer text-xs h-7.5 sm:h-8 px-2 sm:px-2.5 border-outline-variant/60 hover:bg-surface-container shrink-0"
              title="Quick copy formatted clinical handover text to clipboard"
            >
              {copiedQuick ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-secondary" />}
              <span className="hidden md:inline">{copiedQuick ? 'Copied!' : 'Copy'}</span>
            </Button>

            {/* Status Change Dropdown */}
            {onBatchStatusChange && (
              <select
                disabled={updatingStatus}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (val) {
                    setUpdatingStatus(true);
                    try {
                      await onBatchStatusChange(val);
                      notify.success(`Status updated for ${selectedCases.length} case(s).`);
                    } catch (err: any) {
                      notify.error(`Failed updating status: ${err.message || 'Unknown error'}`);
                    } finally {
                      setUpdatingStatus(false);
                      e.target.value = '';
                    }
                  }
                }}
                defaultValue=""
                className="h-7.5 sm:h-8 px-1.5 sm:px-2 rounded-lg border border-outline-variant/60 bg-surface-container text-xs font-medium text-on-surface cursor-pointer focus:outline-none shrink-0 max-w-[100px] sm:max-w-none truncate"
                title="Change status for all selected cases"
              >
                <option value="" disabled>Status...</option>
                <option value="scheduled">⏳ Awaiting</option>
                <option value="preliminary">🎙️ PGR Prelim</option>
                <option value="pending">⚠️ Pending</option>
                <option value="draft">📝 Typing</option>
                <option value="submitted">📤 HMIS</option>
                <option value="final">✅ Verified</option>
                <option value="amended">🔄 Amended</option>
              </select>
            )}

            {onRemoveSelected && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemoveAll}
                disabled={removing}
                className="gap-1 sm:gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer text-xs h-7.5 sm:h-8 px-2 sm:px-2.5 shadow-xs shrink-0"
                title="Remove unneeded cases from index (preserves saved reports)"
              >
                {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{removing ? 'Removing...' : 'Remove'}</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClearSelection}
              title="Clear selection"
              className="p-1 sm:p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      <WorklistWhatsappModal
        isOpen={isWhatsappOpen}
        onClose={() => setIsWhatsappOpen(false)}
        selectedCases={selectedCases}
        currentUserName={currentUserName}
      />
    </>
  );
}
