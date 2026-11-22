'use client';

// Layer 4 (Presentation): Profile Dropdown HMIS Gateway & Session Controls (<180 lines)
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LogIn, Play, Loader2, CheckCircle2, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { useHmisStatus } from '@/hooks/use-hmis-status';
import { notify } from '@/services/notification.service';

interface ProfileHmisControlsProps {
  onCloseMenu?: () => void;
}

export function ProfileHmisControls({ onCloseMenu }: ProfileHmisControlsProps) {
  const router = useRouter();
  const {
    online,
    starting,
    activeSessions,
    hasActiveSession,
    refresh,
    launchAndLogin,
    loginPortal,
    logoutPortal,
  } = useHmisStatus();

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleLaunch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    setActionSuccess(null);

    try {
      const res = await launchAndLogin();
      if (res.success) {
        setActionSuccess('Online');
        notify.success(res.message || 'HMIS Gateway launched successfully');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        notify.error(res.message || 'Failed to start HMIS Gateway');
      }
    } catch (err: any) {
      notify.error(`Launch error: ${err.message}`);
    } finally {
      setActionLoading(false);
      refresh();
    }
  };

  const handleLogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    setActionSuccess(null);

    try {
      const res = await loginPortal();
      if (res.success) {
        setActionSuccess('Logged In');
        notify.success('HMIS Portal authenticated successfully');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        notify.error(res.message || 'HMIS login failed. Check credentials in Settings.');
      }
    } catch (err: any) {
      notify.error(`Login error: ${err.message}`);
    } finally {
      setActionLoading(false);
      refresh();
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
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
      setActionLoading(false);
      refresh();
    }
  };

  const handleNavigateHmis = () => {
    onCloseMenu?.();
    router.push('/worklist');
  };

  return (
    <div className="space-y-1.5 select-none">
      <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-secondary font-mono flex items-center justify-between">
        <span>HMIS Gateway</span>
        <button
          type="button"
          onClick={handleNavigateHmis}
          className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Bridge</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </button>
      </div>

      <div className="p-2 rounded-lg bg-surface-container/60 border border-outline-variant/40 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            {online ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : starting || actionLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-secondary" />
            )}
            <span className="text-on-surface">Status</span>
          </div>

          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              online
                ? hasActiveSession
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : starting || actionLoading
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-surface-container text-secondary border border-outline-variant/40'
            }`}
          >
            {online
              ? hasActiveSession
                ? `Locked (${activeSessions})`
                : 'Standby / Ready'
              : starting || actionLoading
              ? 'Connecting...'
              : 'Offline'}
          </span>
        </div>

        {/* Dynamic Action Buttons based on Status */}
        {!online ? (
          /* Offline -> Launch / Login Portal Button */
          <button
            type="button"
            onClick={handleLaunch}
            disabled={actionLoading || starting}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer border bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300"
          >
            {actionLoading || starting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Launching Portal...</span>
              </>
            ) : actionSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Launch / Login HMIS</span>
              </>
            )}
          </button>
        ) : hasActiveSession ? (
          /* Online Locked -> Logout / Release Button */
          <button
            type="button"
            onClick={handleLogout}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer border bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 hover:text-rose-300"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Releasing Session...</span>
              </>
            ) : actionSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Session Released</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout HMIS ({activeSessions})</span>
              </>
            )}
          </button>
        ) : (
          /* Online Standby -> Login to HMIS Portal Button */
          <button
            type="button"
            onClick={handleLogin}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer border bg-primary/15 border-primary/40 text-primary hover:bg-primary/25"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : actionSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Login to HMIS Portal</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
