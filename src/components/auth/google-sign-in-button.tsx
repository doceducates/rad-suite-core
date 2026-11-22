'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ExternalLink } from 'lucide-react';

interface GoogleSignInButtonProps {
  text?: string;
  intent?: 'login' | 'register';
  inviteCode?: string;
  className?: string;
  redirectUrl?: string;
}

export function GoogleSignInButton({
  text = 'Sign in with Google',
  intent = 'login',
  inviteCode,
  className = '',
  redirectUrl,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [waitingForBrowser, setWaitingForBrowser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAtlasHost = typeof window !== 'undefined' && window.location.hostname.includes('atlas');
  const effectiveRedirectUrl = redirectUrl || (isAtlasHost ? '/dashboard' : '/worklist');

  // Check if running in native desktop environment (Tauri)
  const isDesktop = typeof window !== 'undefined' && Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_POST_MESSAGE__
  );

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (typeof window !== 'undefined' && event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'RAD_SUITE_GOOGLE_AUTH_SUCCESS') {
        cleanup();
        const target = event.data.target || effectiveRedirectUrl;
        router.push(target);
        router.refresh();
      } else if (event.data?.type === 'RAD_SUITE_GOOGLE_AUTH_ERROR') {
        cleanup();
        setError(event.data.error || 'Google authentication failed');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => {
      window.removeEventListener('message', handleAuthMessage);
      cleanup();
    };
  }, [effectiveRedirectUrl, router]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setLoading(false);
    setWaitingForBrowser(false);
  };

  const handleDesktopBrowserFlow = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Initialize desktop authentication handoff
      const initRes = await fetch('/api/auth/desktop-session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          inviteCode: inviteCode?.trim() || undefined,
          redirect: effectiveRedirectUrl,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success || !initData.authUrl) {
        throw new Error(initData.error || 'Failed initiating browser login');
      }

      // 2. Launch external default system browser (Chrome/Edge)
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_in_browser', { url: initData.authUrl });
      } catch {
        try {
          await fetch('/api/auth/desktop-session/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: initData.authUrl }),
          });
        } catch {
          window.open(initData.authUrl, '_blank');
        }
      }

      setWaitingForBrowser(true);

      // 3. Poll for completed authentication from default browser
      let attempts = 0;
      pollTimerRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 120) { // 2 minutes timeout
          cleanup();
          setError('Authentication timed out. Please try again.');
          return;
        }

        try {
          const pollRes = await fetch(`/api/auth/desktop-session/poll?id=${initData.id}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'completed') {
            cleanup();
            router.push(pollData.targetUrl || effectiveRedirectUrl);
            router.refresh();
          } else if (pollData.status === 'expired') {
            cleanup();
            setError('Login request expired. Please click to try again.');
          }
        } catch {
          // Retry on next tick
        }
      }, 1000);
    } catch (err: any) {
      cleanup();
      setError(err.message || 'Failed connecting to browser');
    }
  };

  const handleWebPopupFlow = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        intent,
        mode: 'popup',
        redirect: effectiveRedirectUrl,
      });

      if (inviteCode && inviteCode.trim().length > 0) {
        params.set('inviteCode', inviteCode.trim().toUpperCase());
      }

      const res = await fetch(`/api/auth/google/url?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Could not initiate Google authentication');
      }

      const width = 520;
      const height = 640;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

      const popup = window.open(
        data.url,
        'rad_suite_google_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=yes,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = data.url;
        return;
      }

      timerRef.current = setInterval(() => {
        if (popup.closed) {
          cleanup();
        }
      }, 600);
    } catch (err: any) {
      cleanup();
      setError(err.message || 'Failed connecting to Google');
    }
  };

  const handleClick = () => {
    if (isDesktop) {
      handleDesktopBrowserFlow();
    } else {
      handleWebPopupFlow();
    }
  };

  return (
    <div className="w-full space-y-2">
      {error && (
        <div className="p-2.5 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg text-center font-medium">
          {error}
        </div>
      )}

      {waitingForBrowser ? (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Waiting for browser sign in...</span>
          </div>
          <p className="text-[11px] text-secondary leading-tight">
            Rad Suite opened in your default browser. Select your Google account there to continue.
          </p>
          <button
            type="button"
            onClick={cleanup}
            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-outline-variant/80 bg-surface hover:bg-surface-container-high transition-colors text-xs font-semibold text-on-surface shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer ${className}`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Opening Browser...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{text}</span>
              {isDesktop && <ExternalLink className="w-3.5 h-3.5 text-secondary ml-0.5 opacity-70" />}
            </>
          )}
        </button>
      )}
    </div>
  );
}
