'use client';

// Layer 4 (Presentation Hook): Reactive HMIS Gateway & Session Status
// Strict File Size Invariant: Target < 250 lines

import { useState, useEffect, useCallback } from 'react';

export interface HmisStatusState {
  online: boolean;
  starting: boolean;
  activeSessions: number;
  hasActiveSession: boolean;
  safetyMode?: string;
  loading: boolean;
  error?: string | null;
}

export function useHmisStatus(pollIntervalMs: number = 12000) {
  const [status, setStatus] = useState<HmisStatusState>({
    online: false,
    starting: false,
    activeSessions: 0,
    hasActiveSession: false,
    loading: true,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/hmis/status', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) {
        setStatus((prev) => ({
          ...prev,
          online: false,
          activeSessions: 0,
          hasActiveSession: false,
          loading: false,
        }));
        return;
      }

      const data = await res.json();
      const activeCount = Number(data.activeSessions) || 0;
      setStatus({
        online: Boolean(data.online),
        starting: Boolean(data.starting),
        activeSessions: activeCount,
        hasActiveSession: activeCount > 0,
        safetyMode: data.safetyMode,
        loading: false,
        error: data.error || null,
      });
    } catch (err: any) {
      setStatus((prev) => ({
        ...prev,
        online: false,
        activeSessions: 0,
        hasActiveSession: false,
        loading: false,
        error: err.message,
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    checkStatus();

    const handleCustomChange = () => {
      checkStatus();
    };

    window.addEventListener('hmis-status-changed', handleCustomChange);
    const interval = setInterval(checkStatus, pollIntervalMs);

    return () => {
      window.removeEventListener('hmis-status-changed', handleCustomChange);
      clearInterval(interval);
    };
  }, [checkStatus, pollIntervalMs]);

  const releaseSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/hmis/force-release', { method: 'POST' });
      const data = await res.json();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hmis-status-changed'));
      }
      await checkStatus();
      return Boolean(res.ok && data.success);
    } catch {
      return false;
    }
  }, [checkStatus]);

  const launchGateway = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    setStatus((prev) => ({ ...prev, starting: true }));
    try {
      const res = await fetch('/api/hmis/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hmis-status-changed'));
      }
      await checkStatus();
      return { success: Boolean(res.ok && data.success), message: data.message || data.error };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      setStatus((prev) => ({ ...prev, starting: false }));
    }
  }, [checkStatus]);

  const loginPortal = useCallback(
    async (creds?: { username?: string; password?: string; hospitalId?: string }): Promise<{ success: boolean; message?: string }> => {
      try {
        const res = await fetch('/api/hmis/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds || {}),
        });
        const data = await res.json().catch(() => ({}));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hmis-status-changed'));
        }
        await checkStatus();
        return { success: Boolean(res.ok && data.success), message: data.message || data.error };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [checkStatus]
  );

  const logoutPortal = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/hmis/logout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setStatus((prev) => ({
        ...prev,
        online: false,
        activeSessions: 0,
        hasActiveSession: false,
        loading: false,
      }));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hmis-status-changed'));
      }
      await checkStatus();
      return { success: Boolean(res.ok && data.success), message: data.message || 'HMIS session logged out and gateway stopped.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [checkStatus]);

  const launchAndLogin = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    const launchRes = await launchGateway();
    if (!launchRes.success) {
      return launchRes;
    }
    const loginRes = await loginPortal();
    return loginRes.success ? loginRes : { success: true, message: 'HMIS Gateway started. Please verify credentials in Settings.' };
  }, [launchGateway, loginPortal]);

  return {
    ...status,
    refresh: checkStatus,
    releaseSession,
    launchGateway,
    loginPortal,
    logoutPortal,
    launchAndLogin,
  };
}
