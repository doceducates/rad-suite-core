'use client';

// Layer 4 (Presentation): Universal Notification & Background Progress Host
// Strict File Size Invariant: Target < 250 lines

import React from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/use-notifications';
import { notify, ToastNotification, ProgressNotification } from '@/services/notification.service';
import { backgroundTasks } from '@/services/background-tasks.service';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
  Square,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationHost() {
  const notifications = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none"
    >
      {notifications.map((item) =>
        item.type === 'progress' ? (
          <ProgressCard key={item.id} notification={item} />
        ) : (
          <ToastCard key={item.id} notification={item} />
        )
      )}
    </aside>
  );
}

function ToastCard({ notification }: { notification: ToastNotification }) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />,
  };

  const borders = {
    success: 'border-primary/30',
    error: 'border-error/40',
    warning: 'border-tertiary/40',
    info: 'border-outline-variant/60',
  };

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto rounded-lg border bg-surface/95 backdrop-blur-md p-3.5 shadow-xl transition-all',
        'animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-start gap-3',
        borders[notification.type]
      )}
    >
      {icons[notification.type]}

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-semibold text-on-surface leading-snug break-words">
          {notification.message}
        </p>
        {notification.description && (
          <div
            className={cn(
              'text-[11px] mt-1.5 leading-relaxed break-words rounded p-1.5',
              notification.type === 'error'
                ? 'bg-error/10 text-error border border-error/25 font-mono text-[10.5px]'
                : notification.type === 'warning'
                ? 'bg-tertiary/10 text-tertiary border border-tertiary/25'
                : 'text-secondary'
            )}
          >
            {notification.description}
          </div>
        )}
        {notification.actionLabel && notification.onAction && (
          <button
            type="button"
            onClick={() => {
              notification.onAction?.();
              notify.dismiss(notification.id);
            }}
            className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            {notification.actionLabel}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => notify.dismiss(notification.id)}
        aria-label="Dismiss notification"
        className="text-secondary/70 hover:text-on-surface p-0.5 rounded transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ProgressCard({ notification }: { notification: ProgressNotification }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasItems = Boolean(notification.items && notification.items.length > 0);

  return (
    <div
      role="progressbar"
      aria-valuenow={notification.progressPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'pointer-events-auto rounded-xl border border-primary/30 bg-surface/95 backdrop-blur-md p-3.5 shadow-xl transition-all',
        'animate-in fade-in slide-in-from-bottom-2 duration-200'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {notification.completed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          )}
          <span className="text-xs font-semibold text-on-surface truncate">
            {notification.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!notification.completed && (
            <button
              type="button"
              onClick={() => backgroundTasks.stopTask(notification.id)}
              title="Stop this background task"
              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>Stop</span>
            </button>
          )}
          <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
            {notification.current}/{notification.total} {notification.unit}
          </span>
          <button
            type="button"
            onClick={() => notify.dismiss(notification.id)}
            aria-label="Hide progress card"
            title="Hide toast (task continues running in background)"
            className="text-secondary/70 hover:text-on-surface p-0.5 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden mb-2">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            notification.completed ? 'bg-emerald-500' : 'bg-primary'
          )}
          style={{ width: `${notification.progressPercent}%` }}
        />
      </div>

      {/* Status Detail Subtitle & Accordion Toggle */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-secondary">
        <span className="truncate">{notification.statusText || 'Processing...'}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/tasks"
            onClick={() => notify.dismiss(notification.id)}
            className="text-[10px] text-primary/80 hover:text-primary hover:underline flex items-center gap-0.5"
            title="Open background tasks cockpit"
          >
            <span>Tasks</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
          {hasItems && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <span>{expanded ? 'Hide' : 'Details'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Cases Accordion List */}
      {expanded && hasItems && notification.items && (
        <div className="mt-2.5 max-h-40 overflow-y-auto space-y-1 pr-1 border-t border-outline-variant/30 pt-2 text-[10px] font-mono">
          {notification.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between p-1.5 rounded bg-surface-container/60 border border-outline-variant/20"
            >
              <div className="truncate pr-2">
                <span className="font-semibold text-on-surface">{it.label}</span>
                {it.secondary && (
                  <span className="text-secondary/80 ml-1.5">{it.secondary}</span>
                )}
              </div>
              <div className="shrink-0 flex items-center">
                {it.status === 'saving' && (
                  <span className="flex items-center gap-1 text-primary text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving
                  </span>
                )}
                {it.status === 'success' && (
                  <span className="flex items-center gap-0.5 text-emerald-500 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
                {it.status === 'failed' && (
                  <span className="flex items-center gap-0.5 text-rose-500 font-bold">
                    <AlertTriangle className="w-3 h-3" /> Failed
                  </span>
                )}
                {it.status === 'pending' && (
                  <span className="text-secondary/60">Pending</span>
                )}
                {it.status === 'skipped' && (
                  <span className="text-amber-500/80">Skipped</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Button (e.g. View Results when completed) */}
      {notification.actionLabel && notification.onAction && (
        <div className="mt-2.5 pt-2 border-t border-outline-variant/30 flex justify-end">
          <button
            type="button"
            onClick={() => {
              notification.onAction?.();
              notify.dismiss(notification.id);
            }}
            className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {notification.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
