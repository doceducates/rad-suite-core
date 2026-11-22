'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LghPacsStatus {
  isReachable: boolean;
  latencyMs: number | null;
  isProbing: boolean;
  host: string;
  port: number;
  lastCheckedAt: Date | null;
  recheck: () => Promise<void>;
}

const DEFAULT_HOST = process.env.NEXT_PUBLIC_PACS_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(process.env.NEXT_PUBLIC_PACS_PORT || '8040', 10);

export function useLghPacsStatus(autoIntervalMs: number = 45000): LghPacsStatus {
  const [isReachable, setIsReachable] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const recheck = useCallback(async () => {
    // Only probe if browser environment is online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsReachable(false);
      setLatencyMs(null);
      return;
    }

    setIsProbing(true);
    try {
      const res = await fetch('/api/pacs/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: DEFAULT_HOST,
          port: DEFAULT_PORT,
          timeoutMs: 1200, // fast timeout to never freeze UI
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsReachable(Boolean(data.reachable));
          setLatencyMs(data.reachable ? data.latencyMs : null);
          setLastCheckedAt(new Date());
        } else {
          setIsReachable(false);
          setLatencyMs(null);
        }
      } else {
        setIsReachable(false);
        setLatencyMs(null);
      }
    } catch {
      // Offsite or connection refused
      setIsReachable(false);
      setLatencyMs(null);
    } finally {
      setIsProbing(false);
    }
  }, []);

  useEffect(() => {
    recheck();
    if (autoIntervalMs <= 0) return;

    const timer = setInterval(() => {
      recheck();
    }, autoIntervalMs);

    return () => clearInterval(timer);
  }, [recheck, autoIntervalMs]);

  return {
    isReachable,
    latencyMs,
    isProbing,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    lastCheckedAt,
    recheck,
  };
}
