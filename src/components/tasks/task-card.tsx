'use client';

// Layer 4 (Presentation): Task Dashboard Card (<200 lines)
import React, { useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Square,
  RotateCw,
  Send,
  RotateCcw,
  HardDrive,
  Cloud,
  FileText,
  Activity,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { BackgroundTask } from '@/services/background-tasks.types';
import { TaskDetailsModal } from './task-details-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TaskCardProps {
  task: BackgroundTask;
  onStop: (id: string) => boolean;
  onResume: (id: string) => Promise<boolean>;
  onDismiss: (id: string) => void;
}

export function TaskCard({ task, onStop, onResume, onDismiss }: TaskCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resuming, setResuming] = useState(false);

  const isRunning = task.status === 'running' || task.status === 'pending';
  const hasItems = Boolean(task.items && task.items.length > 0);

  const handleResume = async () => {
    setResuming(true);
    try {
      await onResume(task.id);
    } finally {
      setResuming(false);
    }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    hmis_batch_draft: <Send className="w-4 h-4 text-primary" />,
    hmis_batch_revert: <RotateCcw className="w-4 h-4 text-amber-400" />,
    clinic_upload: <Cloud className="w-4 h-4 text-sky-400" />,
    clinic_pull: <HardDrive className="w-4 h-4 text-indigo-400" />,
    dicom_import: <FileText className="w-4 h-4 text-emerald-400" />,
    offline_sync: <RotateCw className="w-4 h-4 text-teal-400" />,
    generic: <Activity className="w-4 h-4 text-secondary" />,
  };

  const statusPills: Record<string, React.ReactNode> = {
    running: (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running
      </span>
    ),
    completed: (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-2.5 h-2.5" /> Completed
      </span>
    ),
    stopped: (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Square className="w-2 h-2 fill-current" /> Stopped
      </span>
    ),
    interrupted: (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30" title="Interrupted by page reload">
        <RotateCw className="w-2.5 h-2.5" /> Interrupted
      </span>
    ),
    failed: (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <AlertTriangle className="w-2.5 h-2.5" /> Failed
      </span>
    ),
  };

  return (
    <>
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/70 backdrop-blur-sm p-4 shadow-sm hover:border-outline-variant transition-all space-y-3">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-surface-container-high border border-outline-variant/40 flex items-center justify-center shrink-0 mt-0.5">
              {typeIcons[task.type] || typeIcons.generic}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-on-surface truncate" title={task.title}>
                  {task.title}
                </h3>
                {statusPills[task.status] || statusPills.generic}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-secondary mt-0.5">
                <span>Started: {new Date(task.startedAt).toLocaleTimeString()}</span>
                {task.completedAt && (
                  <span>• Finished: {new Date(task.completedAt).toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isRunning && task.canStop && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onStop(task.id)}
                className="h-7 text-xs font-semibold px-2.5 gap-1 shadow-xs"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </Button>
            )}

            {(task.status === 'stopped' || task.status === 'interrupted') && (
              <Button
                size="sm"
                variant="outline"
                disabled={resuming}
                onClick={handleResume}
                className="h-7 text-xs font-semibold px-2.5 gap-1 text-primary border-primary/30 hover:bg-primary/10 shadow-xs"
              >
                {resuming ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                <span>Resume Remaining</span>
              </Button>
            )}

            {!isRunning && (
              <button
                type="button"
                onClick={() => onDismiss(task.id)}
                title="Remove from history"
                className="p-1 rounded text-secondary/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="space-y-1.5">
          <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 ease-out',
                task.status === 'completed'
                  ? 'bg-emerald-500'
                  : task.status === 'stopped' || task.status === 'interrupted'
                  ? 'bg-amber-400'
                  : task.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-primary'
              )}
              style={{ width: `${task.progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-secondary">
            <span className="truncate">{task.statusText || 'In progress...'}</span>
            <span className="font-semibold text-on-surface ml-2 shrink-0">
              {task.current} / {task.total} {task.unit} ({task.progressPercent}%)
            </span>
          </div>
        </div>

        {/* Bottom Details Drawer Trigger */}
        {hasItems && (
          <div className="pt-2 border-t border-outline-variant/25 flex items-center justify-between">
            <span className="text-[11px] font-mono text-secondary">
              {task.items?.length || 0} sub-cases recorded
            </span>
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Breakdown & Proofs</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <TaskDetailsModal
        task={task}
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onResume={handleResume}
      />
    </>
  );
}
