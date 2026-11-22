'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import {
  Blocks,
  Upload,
  RefreshCw,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { PluginRuntimeInfo } from '@/lib/plugins/plugin-types';
import { PluginCard } from './PluginCard';

interface PluginManagerSettingsProps {
  isAdmin?: boolean;
  currentUserEmail?: string;
}

export function PluginManagerSettings({
  isAdmin = false,
  currentUserEmail,
}: PluginManagerSettingsProps) {
  const [plugins, setPlugins] = useState<PluginRuntimeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plugins');
      if (!res.ok) throw new Error('Failed to load plugins');
      const data = await res.json();
      if (data.success && Array.isArray(data.plugins)) {
        setPlugins(data.plugins);
      }
    } catch (err: unknown) {
      notify.error('Could not retrieve plugin registry', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const handleToggle = async (pluginId: string, currentStatus: string) => {
    const nextEnabled = currentStatus !== 'active';
    try {
      const res = await fetch('/api/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, enabled: nextEnabled }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to toggle plugin');
      }
      notify.success(`Plugin "${pluginId}" is now ${nextEnabled ? 'enabled' : 'disabled'}.`);
      fetchPlugins();
    } catch (err: unknown) {
      notify.error('Failed to toggle plugin state', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleAuthorize = async (pluginId: string, authorized: boolean) => {
    try {
      const res = await fetch('/api/plugins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, authorized }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authorize plugin');
      }
      notify.success(
        authorized
          ? `Plugin authorized and activated across workstation.`
          : `Plugin authorization revoked.`
      );
      fetchPlugins();
    } catch (err: unknown) {
      notify.error('Failed to update plugin authorization', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleUninstall = async (pluginId: string, name: string) => {
    try {
      const res = await fetch(`/api/plugins?pluginId=${encodeURIComponent(pluginId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove plugin');
      }
      notify.success(`Plugin "${name}" removed successfully.`);
      fetchPlugins();
    } catch (err: unknown) {
      notify.error('Failed to remove plugin', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      notify.error('Only .zip plugin packages can be installed.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/plugins/install', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Installation failed');
      }

      if (data.pendingApproval) {
        notify.info('Plugin uploaded', {
          description: data.message || 'Awaiting administrator authorization before activation.',
        });
      } else {
        notify.success(data.message || `Successfully installed ${data.plugin?.name || 'plugin'}.`);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchPlugins();
    } catch (err: unknown) {
      notify.error('Plugin installation failed', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = plugins.filter(
    (p) => p.status === 'pending_authorization' || p.manifest.authorized === false
  ).length;

  return (
    <div className="space-y-5">
      {/* Top Banner & Upload Action */}
      <Card className="bg-surface-container-low border-outline-variant/60">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Blocks className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">
                {isAdmin ? 'Plugin & Add-on Management' : 'Hospital Workstation Extensions'}
              </h2>
              <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                {isAdmin ? 'Admin Controlled' : 'User Extension Portal'}
              </Badge>
            </div>
            <p className="text-xs text-secondary max-w-xl">
              {isAdmin
                ? 'Install, inspect, and authorize workstation extensions (.zip). Extensions remain strictly locked until you sign off.'
                : 'Upload and propose custom workflow plugins (.zip). For clinical safety, plugins are activated once verified by your hospital administrator.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPlugins}
              disabled={loading}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5 text-xs h-9"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Installing...' : 'Install Extension (.zip)'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Action Notice Banner */}
      {isAdmin && pendingCount > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-on-surface flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {pendingCount} plugin{pendingCount > 1 ? 's' : ''} submitted by clinician{pendingCount > 1 ? 's' : ''}
              </span>{' '}
              <span className="text-secondary">awaiting your security review and activation.</span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500 shrink-0">
            Action Required
          </Badge>
        </div>
      )}

      {/* Plugin Cards List */}
      {loading ? (
        <Card className="p-8 text-center text-secondary border-outline-variant/40">
          <p className="text-xs">Loading installed extensions...</p>
        </Card>
      ) : plugins.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-outline-variant/60 bg-surface-container-lowest">
          <Sparkles className="w-10 h-10 text-secondary/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-on-surface mb-1">No Extensions Installed</h3>
          <p className="text-xs text-secondary max-w-md mx-auto mb-4">
            Rad Suite Open Core is running cleanly. You can install modular add-ons (such as Clinical AI, HMIS Gateway, or Clinic Edge Harvester) using standalone .zip bundles.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs"
          >
            Upload First Extension (.zip)
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins.map((item) => (
            <PluginCard
              key={item.manifest.id}
              item={item}
              isAdmin={isAdmin}
              currentUserEmail={currentUserEmail}
              onToggle={handleToggle}
              onAuthorize={handleAuthorize}
              onUninstall={handleUninstall}
            />
          ))}
        </div>
      )}
    </div>
  );
}
