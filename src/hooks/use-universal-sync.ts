'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SyncStreamEvent } from '@/services/sync/sync-stream-broadcaster';

export interface UseUniversalSyncOptions {
  onMutation?: (event: SyncStreamEvent) => void;
  enabled?: boolean;
}

export type UniversalSyncState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Universal Multi-Device Real-Time Sync Hook.
 * Connects to the Master VPS Server-Sent Events (SSE) stream to receive live sub-50ms
 * database mutation events across laptops, iPads, and mobile devices.
 */
export function useUniversalSync(options: UseUniversalSyncOptions = {}) {
  const { onMutation, enabled = true } = options;
  const [syncState, setSyncState] = useState<UniversalSyncState>('disconnected');
  const [lastEvent, setLastEvent] = useState<SyncStreamEvent | null>(null);
  const [online, setOnline] = useState<boolean>(true);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = useRef<number>(0);
  const onMutationRef = useRef(onMutation);

  useEffect(() => {
    onMutationRef.current = onMutation;
  }, [onMutation]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setSyncState(retryAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

    try {
      const es = new EventSource('/api/v1/sync/stream');
      eventSourceRef.current = es;

      es.addEventListener('connected', () => {
        setSyncState('connected');
        retryAttemptRef.current = 0;
      });

      es.addEventListener('mutation', (e: MessageEvent) => {
        try {
          const parsed: SyncStreamEvent = JSON.parse(e.data);
          setLastEvent(parsed);

          // Broadcast custom DOM event for decoupled component reactivity
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('radsuite:sync-mutation', { detail: parsed })
            );
          }

          if (onMutationRef.current) {
            onMutationRef.current(parsed);
          }
        } catch (err) {
          console.warn('[UNIVERSAL_SYNC] Error parsing mutation packet:', err);
        }
      });

      es.onerror = () => {
        setSyncState('disconnected');
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnect: 2s, 4s, 8s, up to max 30s
        const backoffMs = Math.min(1000 * Math.pow(2, retryAttemptRef.current), 30000);
        retryAttemptRef.current += 1;

        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          if (navigator.onLine) {
            connect();
          }
        }, backoffMs);
      };
    } catch (err) {
      console.warn('[UNIVERSAL_SYNC] Failed establishing SSE stream:', err);
      setSyncState('disconnected');
    }
  }, [enabled]);

  // Online / Offline hardware event handlers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setOnline(true);
      retryAttemptRef.current = 0;
      connect();
    };

    const handleOffline = () => {
      setOnline(false);
      setSyncState('disconnected');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    connect();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    syncState,
    isOnline: online,
    lastEvent,
    reconnect: connect,
  };
}
