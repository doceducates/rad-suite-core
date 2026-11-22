'use client';

// Layer 4 (Presentation): Profile Dropdown Background Tasks Sub-Menu (<200 lines)
import React, { useState } from 'react';
import {
  ListTodo,
  Loader2,
  ChevronDown,
  Square,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
} from 'lucide-react';
import { useBackgroundTasks } from '@/hooks/use-background-tasks';
import { BackgroundTask } from '@/services/background-tasks.types';
import { cn } from '@/lib/utils';

export interface ProfileTasksSubmenuProps {
  onNavigate: (path: string) => void;
}

export function ProfileTasksSubmenu({ onNavigate }: ProfileTasksSubmenuProps) {
  const { recentTasks, activeCount, stopTask } = useBackgroundTasks('all');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full">
      {/* Primary Trigger Row */}
      <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors select-none">
        <button
          type="button"
          onClick={() => onNavigate('/tasks')}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
        >
          <ListTodo className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">Background Tasks</span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>{activeCount} active</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-secondary/60">
              {recentTasks.length} total
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            title={isExpanded ? 'Hide recent tasks' : 'Show recent tasks'}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                isExpanded && 'rotate-180 text-primary'
              )}
            />
          </button>
        </div>
      </div>

      {/* Expandable Sub-Menu Card */}
      {isExpanded && (
        <div className="mt-1 mb-1.5 rounded-xl border border-outline-variant/60 bg-surface-container/80 backdrop-blur-xs p-2 space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between px-1 text-[10px] font-mono font-semibold text-secondary">
            <span>Recent Operations</span>
            <button
              type="button"
              onClick={() => onNavigate('/tasks')}
              className="text-primary hover:underline flex items-center gap-0.5"
            >
              <span>Cockpit</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>

          {recentTasks.length === 0 ? (
            <div className="text-center py-3 text-[11px] text-secondary">
              No recent background tasks.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-0.5">
              {recentTasks.map((task) => (
                <TaskMiniItem key={task.id} task={task} onStop={stopTask} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('/tasks')}
            className="w-full text-center text-[11px] font-semibold text-primary hover:bg-primary/10 py-1 rounded-md transition-colors cursor-pointer"
          >
            View All Tasks & Logs →
          </button>
        </div>
      )}
    </div>
  );
}

function TaskMiniItem({
  task,
  onStop,
}: {
  task: BackgroundTask;
  onStop: (id: string) => boolean;
}) {
  const isRunning = task.status === 'running' || task.status === 'pending';

  return (
    <div className="p-1.5 rounded-lg bg-surface-container-high/90 border border-outline-variant/30 text-[11px]">
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="font-semibold text-on-surface truncate flex-1 min-w-0" title={task.title}>
          {task.title}
        </span>
        {isRunning && (
          <button
            type="button"
            onClick={() => onStop(task.id)}
            title="Stop this task now"
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <Square className="w-2 h-2 fill-current" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Progress or Status */}
      {isRunning ? (
        <div className="space-y-1">
          <div className="w-full bg-surface-container-lowest rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${task.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-secondary">
            <span className="truncate">{task.statusText || 'Working...'}</span>
            <span className="font-semibold text-primary">
              {task.current}/{task.total}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[10px] font-mono text-secondary">
          <span className="flex items-center gap-1">
            {task.status === 'completed' && (
              <span className="text-emerald-500 flex items-center gap-0.5 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Done ({task.current}/{task.total})
              </span>
            )}
            {task.status === 'stopped' && (
              <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                <Square className="w-2.5 h-2.5" /> Stopped ({task.current}/{task.total})
              </span>
            )}
            {task.status === 'interrupted' && (
              <span className="text-amber-500 flex items-center gap-0.5 font-bold" title="Page reloaded during run">
                <RotateCw className="w-2.5 h-2.5" /> Interrupted ({task.current}/{task.total})
              </span>
            )}
            {task.status === 'failed' && (
              <span className="text-rose-500 flex items-center gap-0.5 font-bold">
                <AlertTriangle className="w-3 h-3" /> Failed
              </span>
            )}
          </span>
          <span className="text-secondary/60">
            {new Date(task.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}
