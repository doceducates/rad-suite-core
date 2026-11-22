'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import { ShieldAlert, RefreshCw, Loader2, X, CheckCircle2 } from 'lucide-react';

interface HmisSessionAlertProps {
  message?: string;
  onReleased?: () => Promise<void> | void;
  onDismiss?: () => void;
}

export function HmisSessionAlert({
  message,
  onReleased,
  onDismiss,
}: HmisSessionAlertProps) {
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  const handleForceRelease = async () => {
    setReleasing(true);
    setReleaseError('');
    try {
      const res = await fetch('/api/hmis/force-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReleased(true);
        const wasClosed = Boolean(data.data?.closed || data.closed);
        if (wasClosed) {
          notify.success('HMIS portal clinician session lock released successfully');
        } else {
          notify.warning(
            data.message ||
              data.data?.message ||
              'Workstation session cleared. Remote HMIS server session will auto-expire shortly.'
          );
        }
        if (onReleased) {
          await onReleased();
        }
        setTimeout(() => {
          if (onDismiss) onDismiss();
        }, 2000);
      } else {
        const errMsg = data.error || 'Failed to force-release session.';
        setReleaseError(errMsg);
        notify.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = `Network error: ${err.message}`;
      setReleaseError(errMsg);
      notify.error(errMsg);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <Card className="p-4 border-amber-500/50 bg-amber-500/10 text-xs relative overflow-hidden transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                Single-Device Session Collision Detected
              </span>
              <Badge variant="warning" className="text-[10px] py-0 px-1 font-mono">
                HMIS Lock
              </Badge>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-zinc-700 dark:text-zinc-300 text-xs">
            {message ||
              'Your HMIS account is already logged into another browser or hospital terminal. HMIS Punjab strictly enforces a single concurrent login policy.'}
          </p>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Clicking below sends an authenticated termination command to the Punjab HMIS portal to clear remote session locks and allow immediate access from this workstation.
          </p>

          {releaseError && (
            <p className="text-xs text-rose-500 font-medium">{releaseError}</p>
          )}

          <div className="pt-2 flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleForceRelease}
              disabled={releasing || released}
              className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              {releasing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : released ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {released ? 'Session Released!' : 'Force Release Session & Reconnect'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
