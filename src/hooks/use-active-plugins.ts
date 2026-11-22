'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PluginRuntimeInfo } from '@/lib/plugins/plugin-types';

let cachedPlugins: PluginRuntimeInfo[] | null = null;
let fetchPromise: Promise<PluginRuntimeInfo[]> | null = null;

async function fetchPluginList(): Promise<PluginRuntimeInfo[]> {
  try {
    const res = await fetch('/api/plugins');
    if (!res.ok) return cachedPlugins || [];
    const data = await res.json();
    if (data.success && Array.isArray(data.plugins)) {
      cachedPlugins = data.plugins;
      return data.plugins;
    }
  } catch {
    // Non-blocking fallback for clean open-core experience
  }
  return cachedPlugins || [];
}

export function emitPluginChange(): void {
  if (typeof window !== 'undefined') {
    cachedPlugins = null;
    fetchPromise = null;
    window.dispatchEvent(new CustomEvent('radsuite:plugin-change'));
  }
}

export function useActivePlugins() {
  const [plugins, setPlugins] = useState<PluginRuntimeInfo[]>(cachedPlugins || []);
  const [loading, setLoading] = useState<boolean>(!cachedPlugins);

  const refresh = useCallback(async () => {
    cachedPlugins = null;
    fetchPromise = null;
    setLoading(true);
    const list = await fetchPluginList();
    setPlugins(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!cachedPlugins) {
      if (!fetchPromise) {
        fetchPromise = fetchPluginList();
      }
      fetchPromise.then((list) => {
        if (mounted) {
          setPlugins(list);
          setLoading(false);
        }
      });
    } else {
      setPlugins(cachedPlugins);
      setLoading(false);
    }

    const handleChange = () => {
      fetchPluginList().then((list) => {
        if (mounted) {
          setPlugins(list);
        }
      });
    };

    window.addEventListener('radsuite:plugin-change', handleChange);
    return () => {
      mounted = false;
      window.removeEventListener('radsuite:plugin-change', handleChange);
    };
  }, []);

  const isPluginActive = useCallback(
    (pluginId: string): boolean => {
      const found = plugins.find((p) => p.manifest.id === pluginId);
      if (!found) return false;
      return found.status === 'active' && found.manifest.authorized !== false;
    },
    [plugins]
  );

  return {
    plugins,
    activePlugins: plugins.filter((p) => p.status === 'active' && p.manifest.authorized !== false),
    isPluginActive,
    loading,
    refresh,
  };
}
