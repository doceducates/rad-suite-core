'use client';

// Layer 4 (Presentation): Responsive Report Version Control & Audit Drawer
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { History, Clock, User, X, GitCompare } from 'lucide-react';
import { ReportRevisionPreviewPane } from './report-revision-preview-pane';
import { ClinicalDiffModal } from './diff/clinical-diff-modal';

export interface ReportRevisionItem {
  id: string;
  reportId: string;
  version: number;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  status: string;
  findings?: string;
  impression?: string;
  technique?: string;
  recommendation?: string;
  notes?: string;
  createdAt: string;
}

interface ReportRevisionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  currentVersion?: number;
  onRestoreRevision: (restoredReport: any) => void;
  activeFindings?: string;
  activeImpression?: string;
  pgrDraftFindings?: string;
  pgrDraftImpression?: string;
  sidebarFindings?: Array<{ id?: string; label: string; text: string }>;
  consultantNotes?: string;
  initialDiffOpen?: boolean;
}

export function ReportRevisionDrawer({
  isOpen,
  onClose,
  reportId,
  currentVersion = 1,
  onRestoreRevision,
  activeFindings = '',
  activeImpression = '',
  pgrDraftFindings,
  pgrDraftImpression,
  sidebarFindings = [],
  consultantNotes = '',
  initialDiffOpen = false,
}: ReportRevisionDrawerProps) {
  const [revisions, setRevisions] = useState<ReportRevisionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'timeline' | 'preview'>('preview');
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && initialDiffOpen) {
      setIsDiffModalOpen(true);
    }
  }, [isOpen, initialDiffOpen]);

  useEffect(() => {
    if (!isOpen || !reportId) return;

    let mounted = true;
    setLoading(true);

    fetch(`/api/reports/${encodeURIComponent(reportId)}/revisions`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && Array.isArray(data.revisions)) {
          setRevisions(data.revisions);
          if (data.revisions.length > 0) {
            setSelectedVersion(data.revisions[0].version);
          }
        }
      })
      .catch((err) => {
        if (mounted) notify.error('Failed loading revisions', err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, reportId]);

  const activeSelected = revisions.find((r) => r.version === selectedVersion) || revisions[0] || null;

  const handleRestore = async () => {
    if (!reportId || !selectedVersion) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/revisions/${selectedVersion}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.report) {
        notify.success(`Restored to Version ${selectedVersion}`);
        onRestoreRevision({ ...data.report, version: data.version });
        onClose();
      } else {
        notify.error('Restore Failed', data.error || 'Could not restore revision');
      }
    } catch (err: any) {
      notify.error('Restore Error', err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-w-4xl max-h-[85vh]">
      <div className="flex flex-col h-[78vh] min-h-[460px] overflow-hidden bg-surface text-on-surface font-body">
        {/* 1. Header Bar: Title, Count, and Close Button */}
        <div className="px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-bold text-xs sm:text-sm text-on-surface truncate">
              Version Control &amp; Report Audit Trail
            </h3>
            <Badge variant="outline" className="font-mono text-[10px] shrink-0">
              {revisions.length} {revisions.length === 1 ? 'Snapshot' : 'Snapshots'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDiffModalOpen(true)}
              className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Diff Comparator</span>
            </Button>

            {/* Mobile View Toggle */}
            <div className="flex md:hidden rounded-lg bg-surface-container border border-outline-variant/40 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTabMobile('timeline')}
                className={`px-2 py-0.5 rounded ${activeTabMobile === 'timeline' ? 'bg-primary text-on-primary font-semibold' : 'text-secondary'}`}
              >
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTabMobile('preview')}
                className={`px-2 py-0.5 rounded ${activeTabMobile === 'preview' ? 'bg-primary text-on-primary font-semibold' : 'text-secondary'}`}
              >
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Close version modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Responsive Two-Pane Layout */}
        <div className="flex-1 flex min-h-0 divide-x divide-outline-variant/30 overflow-hidden">
          {/* Left: Revisions Timeline List */}
          <div
            className={`w-full md:w-72 overflow-y-auto p-2.5 space-y-2 bg-surface-container-lowest shrink-0 ${
              activeTabMobile !== 'timeline' ? 'hidden md:block' : 'block'
            }`}
          >
            {loading ? (
              <div className="p-8 text-center text-xs text-secondary animate-pulse">
                Loading version history...
              </div>
            ) : revisions.length === 0 ? (
              <div className="p-6 text-center text-xs text-secondary">
                No versions recorded yet.
              </div>
            ) : (
              revisions.map((rev) => {
                const isSelected = rev.version === selectedVersion;
                const isCurrent = rev.version === currentVersion;
                const timeStr = new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

                return (
                  <button
                    key={rev.id}
                    type="button"
                    onClick={() => {
                      setSelectedVersion(rev.version);
                      setActiveTabMobile('preview');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary/60 bg-primary/10 shadow-xs'
                        : 'border-outline-variant/30 bg-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-primary">
                          v{rev.version}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-secondary flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{dateStr} {timeStr}</span>
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-on-surface truncate">
                      {rev.notes || rev.status}
                    </div>

                    <div className="text-[10px] text-secondary/70 truncate flex items-center gap-1 mt-0.5">
                      <User className="w-2.5 h-2.5" />
                      <span>{rev.authorName || 'Radiologist'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Selected Version Content Inspection */}
          <div
            className={`flex-1 flex flex-col min-w-0 bg-surface p-3 sm:p-4 overflow-y-auto select-text ${
              activeTabMobile !== 'preview' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <ReportRevisionPreviewPane
              revision={activeSelected}
              currentVersion={currentVersion}
              onRestore={handleRestore}
              restoring={restoring}
            />
          </div>
        </div>
      </div>

      <ClinicalDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => {
          setIsDiffModalOpen(false);
          if (initialDiffOpen) onClose();
        }}
        revisions={revisions}
        currentVersion={currentVersion}
        activeFindings={activeFindings}
        activeImpression={activeImpression}
        pgrDraftFindings={pgrDraftFindings}
        pgrDraftImpression={pgrDraftImpression}
        sidebarFindings={sidebarFindings}
        consultantNotes={consultantNotes}
        onRestoreVersion={(v) => {
          setSelectedVersion(v);
          handleRestore();
        }}
      />
    </Modal>
  );
}
