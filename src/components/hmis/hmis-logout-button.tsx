'use client';

// Layer 4 (Presentation): HMIS Gateway Quick Status & Session Action Button (<200 lines)
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2, CheckCircle2, Wifi, WifiOff, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHmisStatus } from '@/hooks/use-hmis-status';

interface HmisLogoutButtonProps {
  variant?: 'header' | 'sidebar' | 'icon';
  className?: string;
  onLoggedOut?: () => void;
}

export function HmisLogoutButton({
  variant = 'header',
  className,
  onLoggedOut,
}: HmisLogoutButtonProps) {
  const router = useRouter();
  const {
    online,
    starting,
    activeSessions,
    hasActiveSession,
    refresh,
    releaseSession,
    launchAndLogin,
  } = useHmisStatus();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleAction = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      if (!online) {
        const res = await launchAndLogin();
        setStatus(res.success ? 'success' : 'error');
      } else {
        const ok = await releaseSession();
        setStatus(ok ? 'success' : 'error');
        if (ok && onLoggedOut) onLoggedOut();
      }
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
      refresh();
    }
  };

  // 1. ICON VARIANT (Collapsed Sidebar)
  if (variant === 'icon') {
    if (!online) {
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={handleAction}
            disabled={loading || starting}
            title="HMIS Gateway is offline. Click to launch gateway and connect."
            className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20', className)}
          >
            {loading || starting ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4" />}
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {loading || starting ? 'Launching Gateway...' : 'HMIS Offline (Click to Launch)'}
          </div>
        </div>
      );
    }

    if (!hasActiveSession) {
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={() => router.push('/worklist')}
            title="HMIS Gateway Online (Standby · No active session lock held)"
            className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20', className)}
          >
            <div className="relative flex items-center justify-center">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-surface-container-low" />
            </div>
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            HMIS Gateway Ready (Standby)
          </div>
        </div>
      );
    }

    return (
      <div className="relative group">
        <button
          type="button"
          onClick={handleAction}
          disabled={loading}
          title={`Active HMIS Session locked (${activeSessions}). Click to release.`}
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer border', status === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25 animate-pulse', className)}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <LogOut className="w-4 h-4" />}
        </button>
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {status === 'success' ? 'HMIS Session Released' : `Release HMIS Session (${activeSessions})`}
        </div>
      </div>
    );
  }

  // 2. SIDEBAR VARIANT
  if (variant === 'sidebar') {
    if (!online) {
      return (
        <button
          type="button"
          onClick={handleAction}
          disabled={loading || starting}
          title="HMIS Gateway is offline. Click to launch gateway microservice."
          className={cn('w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer', className)}
        >
          <div className="flex items-center gap-2">
            {loading || starting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Play className="w-3.5 h-3.5 fill-current text-amber-500" />}
            <span>HMIS Gateway</span>
          </div>
          <span className="text-[10px] font-semibold">{loading || starting ? 'Launching...' : 'Offline (Launch)'}</span>
        </button>
      );
    }

    if (!hasActiveSession) {
      return (
        <button
          type="button"
          onClick={() => router.push('/worklist')}
          title="HMIS Gateway Online · Standby (No active session locks)"
          className={cn('w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer', className)}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>HMIS Gateway</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Ready</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAction}
        disabled={loading}
        title="Active HMIS Portal session locked. Click to release."
        className={cn('w-full flex items-center justify-center gap-2 py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer', status === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25', className)}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <LogOut className="w-3.5 h-3.5" />}
        <span>{status === 'success' ? 'HMIS Session Freed' : `Release HMIS Session (${activeSessions})`}</span>
      </button>
    );
  }

  // 3. HEADER VARIANT
  if (!online) {
    return (
      <button
        type="button"
        onClick={handleAction}
        disabled={loading || starting}
        title="HMIS Gateway is offline. Click to launch and connect."
        className={cn('h-8 px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer', className)}
      >
        {loading || starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
        <span className="hidden sm:inline">{loading || starting ? 'Launching...' : 'Launch HMIS'}</span>
      </button>
    );
  }

  if (!hasActiveSession) {
    return (
      <button
        type="button"
        onClick={() => router.push('/worklist')}
        title="HMIS Gateway Online · Standby (No active session lock held)"
        className={cn('h-8 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer', className)}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden sm:inline">HMIS Ready</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={loading}
      title="Active HMIS Portal session locked. Click to release."
      className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer', status === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 shadow-xs animate-pulse', className)}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <LogOut className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{status === 'success' ? 'HMIS Freed' : `Release HMIS (${activeSessions})`}</span>
    </button>
  );
}
