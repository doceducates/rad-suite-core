'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Check, AlertCircle, RefreshCw, Key, Globe, Eye, EyeOff, Download, Settings } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';

interface ClinicRelayConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

export function ClinicRelayConnectModal({
  isOpen,
  onClose,
  onConfigChanged,
}: ClinicRelayConnectModalProps) {
  const [relayUrl, setRelayUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [source, setSource] = useState<'custom' | 'env' | 'none'>('none');
  const [isConfigured, setIsConfigured] = useState(false);
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    nodeCount?: number;
    message: string;
  } | null>(null);

  const fetchCurrentConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinic-node/relay-config');
      if (res.ok) {
        const data = await res.json();
        setRelayUrl(data.relayUrl || 'https://radiology.sehatai.org');
        setSource(data.source || 'none');
        setIsConfigured(Boolean(data.isConfigured));
        setHasSecret(Boolean(data.hasSecret));
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      fetchCurrentConfig();
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/clinic-node/relay-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', relayUrl, secret }),
      });
      const data = await res.json();
      setTestResult({
        success: Boolean(data.success),
        latencyMs: data.latencyMs,
        nodeCount: data.nodeCount,
        message: data.message || (data.success ? 'Connection successful!' : 'Connection failed.'),
      });
      if (data.success) {
        notify.success(`Cloud relay online (${data.latencyMs}ms)`);
      } else {
        notify.error(data.message || 'Connection test failed');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error connecting to cloud relay' });
      notify.error('Network error testing cloud relay');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relayUrl.trim()) return notify.error('Cloud Relay URL cannot be empty');
    setLoading(true);
    try {
      const res = await fetch('/api/clinic-node/relay-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', relayUrl, secret }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(data.message || 'Cloud relay configuration saved.');
        setIsConfigured(true);
        setSource('custom');
        if (secret) setHasSecret(true);
        if (onConfigChanged) onConfigChanged();
        onClose();
      } else {
        throw new Error(data.error || 'Failed saving configuration');
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed saving configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clinic-node/relay-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success) {
        notify.info('Custom cloud relay settings removed. Reverted to defaults.');
        await fetchCurrentConfig();
        if (onConfigChanged) onConfigChanged();
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed clearing configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSave}>
        <ModalHeader onClose={onClose}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>Clinic Node &amp; Cloud Relay Settings</ModalTitle>
            <ModalDescription>Configure VPS Cloud Relay endpoint, secret authorization token, and packages.</ModalDescription>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="p-3 rounded-xl border border-border/80 bg-surface-container/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${isConfigured ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
              <span className="font-semibold text-xs text-foreground">Relay Bridge Status:</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${isConfigured ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'}`}
              >
                {isConfigured ? (source === 'custom' ? 'Connected (Custom UI)' : 'Connected (.env)') : 'Unconfigured'}
              </Badge>
            </div>
            {source === 'custom' && (
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={loading} className="h-6 text-[10px] text-muted-foreground hover:text-rose-500">
                Revert to Defaults
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Cloud Relay / VPS Endpoint URL</span>
            </label>
            <input
              type="url"
              required
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="https://radiology.sehatai.org"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <p className="text-[11px] text-muted-foreground">The public HTTPS URL of your cloud workstation.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" />
                <span>Clinic Node Secret Token</span>
              </span>
              {hasSecret && !secret && <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Existing token saved</span>}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={hasSecret ? '•••••••••••• (Leave blank to keep existing token)' : 'Enter clinic-secret-token...'}
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Shared token configured on clinic PC agent (<span className="font-mono text-foreground">CLINIC_NODE_SECRET</span>).</p>
          </div>

          <div className="p-3 rounded-xl border border-border/80 bg-surface-container/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Workstation Deployment Package</span>
              </span>
              <p className="text-[11px] text-muted-foreground">Universal ZIP bundle with Windows Session 0 daemon &amp; installation scripts.</p>
            </div>
            <a
              href="/api/clinic-node/bundle"
              download="clinic-node-package.zip"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-surface-container transition-colors shrink-0 text-foreground"
              title="Download universal installer package (.ZIP) for clinic PC"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Installer (.ZIP)</span>
            </a>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'}`}>
              {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />}
              <div className="space-y-0.5">
                <div className="font-semibold">{testResult.success ? 'Connection Verified' : 'Connection Failed'}</div>
                <div className="text-[11px] opacity-90">{testResult.message}</div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" size="sm" onClick={handleTestConnection} disabled={testing || loading || !relayUrl.trim()} className="gap-1.5 text-xs h-8 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs h-8 cursor-pointer">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading || testing || !relayUrl.trim()} className="gap-1.5 text-xs h-8 cursor-pointer">
            <Check className="w-3.5 h-3.5" />
            {loading ? 'Saving...' : 'Save & Connect'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
