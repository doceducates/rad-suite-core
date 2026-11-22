'use client';

import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes

function getOrCreateMachineId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem('radsuite_machine_id');
    if (!id) {
      id = `ws_${crypto.randomUUID()}`;
      localStorage.setItem('radsuite_machine_id', id);
    }
    return id;
  } catch {
    return 'fallback_ws_client';
  }
}

export function useWorkstationTelemetry() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTauri = typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';
    const isDesktopSource = window.location.search.includes('source=desktop');

    // Only dispatch telemetry in desktop app or active workstation session
    const dispatchHeartbeat = async () => {
      try {
        const machineId = getOrCreateMachineId();
        let specs: Record<string, any> = {
          cores: navigator.hardwareConcurrency || 4,
          language: navigator.language,
          isTauri,
        };

        // If Tauri runtime is present, attempt to invoke native system specs
        if (isTauri) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { invoke } = await import('@tauri-apps/api/core');
            const nativeSpecs = await invoke<any>('get_system_specs');
            if (nativeSpecs) {
              specs = { ...specs, ...nativeSpecs };
            }
          } catch {}
        }

        const platform = navigator.userAgent.includes('Mac')
          ? 'macos'
          : navigator.userAgent.includes('Linux')
          ? 'linux'
          : 'windows';

        await fetch('/api/v1/telemetry/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machineId,
            hostname: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
            platform,
            osVersion: navigator.userAgent,
            appVersion: '1.0.1',
            specs,
          }),
        });
      } catch (err) {
        // Silently catch background telemetry errors
      }
    };

    // Initial heartbeat
    dispatchHeartbeat();

    // Periodic heartbeat
    timerRef.current = setInterval(dispatchHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
}
