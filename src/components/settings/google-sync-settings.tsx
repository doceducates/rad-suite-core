'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Unlink,
  RefreshCw,
  FolderOpen,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { notify } from '@/services/notification.service';

interface GoogleSyncSettingsProps {
  onNotify?: (msg: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function GoogleSyncSettings({ onNotify }: GoogleSyncSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const [autoSync, setAutoSync] = useState(false);
  const [rootFolderId, setRootFolderId] = useState<string | undefined>();

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google/status');
      if (res.ok) {
        const data = await res.json();
        setConfigured(Boolean(data.configured));
        setIsConnected(Boolean(data.isConnected));
        setEmail(data.email);
        setAutoSync(Boolean(data.autoSync));
        setRootFolderId(data.rootFolderId);
      }
    } catch (err: any) {
      console.warn('Failed loading Google status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/google/auth/url');
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        const err = data.error || 'Failed generating authorization link';
        notify.error(err);
        onNotify?.({ message: err, type: 'error' });
      }
    } catch (err: any) {
      const msg = err.message || 'Connection error';
      notify.error(msg);
      onNotify?.({ message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your Google Account from Rad Suite?')) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/google/disconnect', { method: 'POST' });
      if (res.ok) {
        setIsConnected(false);
        setEmail(undefined);
        notify.info('Google account disconnected successfully.');
        onNotify?.({ message: 'Google account disconnected successfully.', type: 'info' });
      } else {
        const data = await res.json();
        const err = data.error || 'Disconnection failed';
        notify.error(err);
        onNotify?.({ message: err, type: 'error' });
      }
    } catch (err: any) {
      const msg = err.message || 'Disconnection error';
      notify.error(msg);
      onNotify?.({ message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const nextVal = !autoSync;
    try {
      setAutoSync(nextVal);
      const res = await fetch('/api/google/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSync: nextVal }),
      });
      if (res.ok) {
        const msg = nextVal
          ? 'Auto-sync enabled: reports will sync to Google Docs upon final sign-off.'
          : 'Auto-sync disabled: manual sync only.';
        notify.success(msg);
        onNotify?.({ message: msg, type: 'success' });
      } else {
        setAutoSync(!nextVal);
        notify.error('Failed updating auto-sync preference');
        onNotify?.({ message: 'Failed updating auto-sync preference', type: 'error' });
      }
    } catch (err: any) {
      setAutoSync(!nextVal);
      notify.error(err.message || 'Error updating settings');
      onNotify?.({ message: err.message, type: 'error' });
    }
  };

  return (
    <Card className="bg-surface-container-low border-outline-variant/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Google Drive Storage & Clinical Sync
              </CardTitle>
              <CardDescription className="text-xs">
                Store requested DICOM studies and formatted Google Doc reports directly in your personal Google Drive (15 GB free quota).
              </CardDescription>
          </div>
          {isConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs py-1 px-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-secondary text-xs py-1 px-2.5">
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 text-xs">
        {/* Connection Status Card */}
        <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-on-surface text-sm">
                {isConnected ? email || 'Google Account Linked' : 'No Google Account Linked'}
              </div>
              <p className="text-secondary text-[11px] mt-0.5">
                {isConnected
                  ? 'Your claimed DICOM studies and signed clinical reports are automatically isolated to your personal Google Drive.'
                  : 'Connect your personal Google account to claim cases, store DICOM studies, and sync reports with zero workstation disk usage.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isConnected ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://drive.google.com', '_blank')}
                  className="gap-1.5 text-xs text-secondary hover:text-primary"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Google Drive
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleDisconnect}
                  className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={actionLoading || loading || !configured}
                onClick={handleConnect}
                className="gap-2 text-xs bg-primary text-white hover:bg-primary/90 font-semibold shadow-xs"
              >
                {actionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                Connect Google Account
              </Button>
            )}
          </div>
        </div>

        {/* Not Configured Alert */}
        {!configured && (
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Google OAuth Credentials Required in .env</span>
              <p className="text-[11px] opacity-90">
                Please ensure <code className="px-1 py-0.5 rounded bg-amber-500/20">GOOGLE_CLIENT_ID</code> and{' '}
                <code className="px-1 py-0.5 rounded bg-amber-500/20">GOOGLE_CLIENT_SECRET</code> are set in your{' '}
                <code className="px-1 py-0.5 rounded bg-amber-500/20">.env</code> file.
              </p>
            </div>
          </div>
        )}

        {/* Options & Automation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-on-surface">Auto-Sync on Final Sign</span>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                disabled={!isConnected || actionLoading}
                onChange={handleToggleAutoSync}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
              />
            </div>
            <p className="text-[11px] text-secondary">
              Automatically create or update the Google Doc whenever you finalize and electronically sign a report in the Workstation.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-on-surface">HIPAA & Privacy Isolation</span>
            </div>
            <p className="text-[11px] text-secondary">
              Uses restricted scope (<code className="font-mono text-[10px]">drive.file</code>). Rad Suite can only view or edit files that it specifically creates, preserving strict clinician and patient privacy.
            </p>
          </div>
        </div>

        {/* Folder Taxonomy Guide */}
        <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-lowest space-y-2">
          <span className="font-semibold text-on-surface block">Personal Storage Taxonomy in Your Google Drive</span>
          <div className="font-mono text-[11px] text-secondary bg-surface-container p-3 rounded-lg border border-outline-variant/40 space-y-1">
            <div className="text-primary font-bold">📁 Rad Suite Cases/ &nbsp;<span className="text-[10px] text-secondary/70">(Full DICOM Studies for RadiAnt)</span></div>
            <div className="pl-4">└── 📁 2026/ &nbsp;<span className="text-[10px] text-secondary/70">(Year)</span></div>
            <div className="pl-8">└── 📁 10 - October/ &nbsp;<span className="text-[10px] text-secondary/70">(Month)</span></div>
            <div className="pl-12">└── 📁 MR/ &nbsp;<span className="text-[10px] text-secondary/70">(Modality)</span></div>
            <div className="pl-16 text-sky-600 dark:text-sky-400">
              └── 📦 [MR] 192610002587 - John Doe.zip
            </div>
            <div className="text-primary font-bold pt-2">📁 Rad Suite Reports/ &nbsp;<span className="text-[10px] text-secondary/70">(Formatted Google Docs)</span></div>
            <div className="pl-4">└── 📁 2026/10 - October/MR/</div>
            <div className="pl-8 text-emerald-600 dark:text-emerald-400">
              └── 📄 [MR] 192610002587 - John Doe - MRI Brain (Google Doc)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
