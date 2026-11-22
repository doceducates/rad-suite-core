'use client';

import React, { useState } from 'react';
import { Database, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import type { UnifiedStorageSettings } from '@/types/pacs';

interface UnifiedStorageS3SectionProps {
  settings: UnifiedStorageSettings;
  setSettings: React.Dispatch<React.SetStateAction<UnifiedStorageSettings>>;
  s3SecretKey: string;
  setS3SecretKey: (val: string) => void;
}

export function UnifiedStorageS3Section({
  settings,
  setSettings,
  s3SecretKey,
  setS3SecretKey,
}: UnifiedStorageS3SectionProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    buckets?: string[];
  } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/pacs/storage-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          s3SecretAccessKey: s3SecretKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.s3) {
        setTestResult(data.s3);
      } else {
        setTestResult({
          success: false,
          message: data.error || data.s3?.message || 'Connection test failed',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error during test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSelectBucket = (b: string) => {
    setSettings((prev) => ({ ...prev, s3Bucket: b }));
  };

  return (
    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-on-surface">4. S3-Compatible Cloud Storage (AWS / MinIO / Custom)</span>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.s3Enabled}
            onChange={(e) => setSettings({ ...settings, s3Enabled: e.target.checked })}
            className="rounded border-outline-variant text-primary focus:ring-0"
          />
          <span className="text-[11px] text-on-surface font-medium">Enable S3 Storage</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div>
          <label className="text-[11px] text-secondary block mb-1">Bucket Name</label>
          <input
            type="text"
            value={settings.s3Bucket || ''}
            onChange={(e) => setSettings({ ...settings, s3Bucket: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
            placeholder="rad-suite"
          />
          <div className="flex items-center gap-1 mt-1 text-[10px] text-secondary">
            <span>Quick:</span>
            {['rad-suite', 'radiology', 'reports'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => handleSelectBucket(b)}
                className={`px-1.5 py-0.2 rounded border text-[9px] font-mono cursor-pointer ${
                  settings.s3Bucket === b
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-400 font-semibold'
                    : 'border-outline-variant/40 hover:bg-surface-container'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-secondary block mb-1">Region</label>
          <input
            type="text"
            value={settings.s3Region || ''}
            onChange={(e) => setSettings({ ...settings, s3Region: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
            placeholder="us-east-1"
          />
        </div>

        <div>
          <label className="text-[11px] text-secondary block mb-1">Custom Endpoint (e.g. s3.sehatai.org)</label>
          <input
            type="text"
            value={settings.s3Endpoint || ''}
            onChange={(e) => setSettings({ ...settings, s3Endpoint: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
            placeholder="https://s3.sehatai.org"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-[11px] text-secondary block mb-1">S3 Access Key ID</label>
          <input
            type="text"
            value={settings.s3AccessKeyId || ''}
            onChange={(e) => setSettings({ ...settings, s3AccessKeyId: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
            placeholder="TGS3..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-secondary">S3 Secret Access Key</label>
            <span className="text-[10px] text-secondary font-mono">
              {settings.s3SecretConfigured && !s3SecretKey ? 'Configured at rest' : ''}
            </span>
          </div>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={s3SecretKey}
              onChange={(e) => setS3SecretKey(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
              placeholder={settings.s3SecretConfigured ? '••••••••••••••••' : 'Enter secret key'}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-2 text-secondary hover:text-on-surface cursor-pointer"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.s3ForcePathStyle ?? true}
            onChange={(e) => setSettings({ ...settings, s3ForcePathStyle: e.target.checked })}
            className="rounded border-outline-variant text-primary focus:ring-0"
          />
          <span className="text-[11px] text-secondary">
            Force Path-Style Addressing <span className="text-amber-500 font-mono">(Mandatory for s3.sehatai.org)</span>
          </span>
        </label>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          <span>Test S3 Connection</span>
        </button>
      </div>

      {testResult && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
            testResult.success
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-semibold">{testResult.message}</div>
            {testResult.buckets && testResult.buckets.length > 0 && (
              <div className="text-[10px] opacity-90">
                Discovered Buckets: {testResult.buckets.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
