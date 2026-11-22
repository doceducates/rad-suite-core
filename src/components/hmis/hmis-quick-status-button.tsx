'use client';

// Layer 4 (Presentation): Unified Smart HMIS Status & Sync Action Button (<180 lines)
import React, { useState } from 'react';
import { Play, LogOut, LogIn, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useHmisStatus } from '@/hooks/use-hmis-status';
import { notify } from '@/services/notification.service';
import { cn } from '@/lib/utils';

interface HmisQuickStatusButtonProps {
  className?: string;
  compact?: boolean;
  onSyncHmis?: () => void;
  syncingHmis?: boolean;
}

export function HmisQuickStatusButton({
  className,
  compact = false,
  onSyncHmis,
  syncingHmis = false,
}: HmisQuickStatusButtonProps) {
  const {
    online,
    starting,
    activeSessions,
    hasActiveSession,
    launchAndLogin,
    loginPortal,
    logoutPortal,
    refresh,
  } = useHmisStatus();

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleLaunch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setActionSuccess(null);

    try {
      const res = await launchAndLogin();
      if (res.success) {
        setActionSuccess('Online');
        notify.success(res.message || 'HMIS Gateway launched successfully');
        setTimeout(() => setActionSuccess(null), 3000);
        if (onSyncHmis) onSyncHmis();
      } else {
        notify.error(res.message || 'Failed to start HMIS Gateway');
      }
    } catch (err: any) {
      notify.error(`Launch error: ${err.message}`);
    } finally {
      setLoading(false);
      refresh();
    }
  };

  const handleLogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setActionSuccess(null);

    try {
      const res = await loginPortal();
      if (res.success) {
        setActionSuccess('Logged In');
        notify.success('HMIS Portal authenticated successfully');
        setTimeout(() => setActionSuccess(null), 3000);
        if (onSyncHmis) onSyncHmis();
      } else {
        notify.error(res.message || 'HMIS login failed. Check credentials in Settings.');
      }
    } catch (err: any) {
      notify.error(`Login error: ${err.message}`);
    } finally {
      setLoading(false);
      refresh();
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    setActionSuccess(null);

    try {
      const res = await logoutPortal();
      if (res.success) {
        setActionSuccess('Released');
        notify.success('HMIS session released successfully');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        notify.error(res.message || 'Failed to release HMIS session');
      }
    } catch (err: any) {
      notify.error(`Logout error: ${err.message}`);
    } finally {
      setLoading(false);
      refresh();
    }
  };

  // State 1: Gateway OFFLINE -> Launch Gateway & Portal
  if (!online) {
    return (
      <button
        type="button"
        onClick={handleLaunch}
        disabled={loading || starting}
        title="HMIS Gateway Offline. Click to start gateway and connect to HMIS."
        className={cn(
          'h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs',
          'border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400',
          className
        )}
      >
        {loading || starting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className={compact ? 'hidden md:inline' : ''}>Starting HMIS...</span>
          </>
        ) : actionSuccess ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className={compact ? 'hidden md:inline' : ''}>Connected</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3 fill-current" />
            <span className={compact ? 'hidden md:inline' : ''}>Launch HMIS</span>
          </>
        )}
      </button>
    );
  }

  // State 2: ONLINE WITH onSyncHmis -> Unified "Sync HMIS" Action Button
  if (onSyncHmis) {
    const isBusy = syncingHmis || loading;
    return (
      <button
        type="button"
        onClick={() => onSyncHmis()}
        disabled={isBusy}
        title={hasActiveSession ? 'HMIS Connected & Authenticated. Click to sync latest cases.' : 'HMIS Gateway Standby. Click to sync latest cases.'}
        className={cn(
          'h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs',
          'border-emerald-500/35 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 dark:text-emerald-400',
          className
        )}
      >
        <RefreshCw className={cn('w-3.5 h-3.5', isBusy && 'animate-spin')} />
        <span className={compact ? 'hidden sm:inline' : ''}>
          {syncingHmis ? 'Syncing...' : 'Sync HMIS'}
        </span>
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            hasActiveSession ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500/50'
          )}
          title={hasActiveSession ? 'Active HMIS Session' : 'Gateway Standby (auto-connects on sync)'}
        />
      </button>
    );
  }

  // State 3: ONLINE WITH ACTIVE SESSION (Standalone without onSyncHmis) -> Release/Logout
  if (hasActiveSession) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        title={`Active HMIS session locked (${activeSessions}). Click to release.`}
        className={cn(
          'h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs',
          actionSuccess
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
            : 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 animate-pulse',
          className
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className={compact ? 'hidden md:inline' : ''}>Releasing...</span>
          </>
        ) : actionSuccess ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className={compact ? 'hidden md:inline' : ''}>Released</span>
          </>
        ) : (
          <>
            <LogOut className="w-3.5 h-3.5" />
            <span className={compact ? 'hidden md:inline' : ''}>Logout HMIS ({activeSessions})</span>
          </>
        )}
      </button>
    );
  }

  // State 4: ONLINE STANDBY (No active session) -> Login Button
  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      title="HMIS Gateway Online. Click to login and authenticate session."
      className={cn(
        'h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs',
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className={compact ? 'hidden md:inline' : ''}>Connecting...</span>
        </>
      ) : actionSuccess ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className={compact ? 'hidden md:inline' : ''}>Connected</span>
        </>
      ) : (
        <>
          <LogIn className="w-3.5 h-3.5" />
          <span className={compact ? 'hidden md:inline' : ''}>Login HMIS</span>
        </>
      )}
    </button>
  );
}
