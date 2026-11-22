'use client';

import React, { useState, useEffect } from 'react';
import { HardDrive, Server, Cloud, Database, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { UnifiedStorageSettings, StorageSourceConfig } from '@/types/pacs';
import { UnifiedStorageS3Section } from './unified-storage-s3-section';

export function UnifiedStorageSettingsCard() {
  const [settings, setSettings] = useState<UnifiedStorageSettings>({
    localPath: 'E:\\Cases',
    pacsEnabled: true,
    gdriveEnabled: false,
    gdriveFolderId: '',
    gdriveServiceAccountEmail: '',
    s3Enabled: false,
    s3Endpoint: '',
    s3Region: 'us-east-1',
    s3Bucket: '',
    s3AccessKeyId: '',
    s3ForcePathStyle: true,
  });
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [sources, setSources] = useState<StorageSourceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pacs/storage-config');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setSources(data.sources || []);
      }
    } catch {
      setMessage({ text: 'Failed to load storage configuration.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...settings,
        ...(s3SecretKey ? { s3SecretAccessKey: s3SecretKey } : {}),
      };
      const res = await fetch('/api/pacs/storage-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSources(data.sources || []);
        setMessage({ text: 'Storage configurations saved successfully.', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Failed to save configuration.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error while updating configuration.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest overflow-hidden shadow-sm">
      <div className="p-4 border-b border-outline-variant/40 bg-surface-container/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-on-surface">Unified 4-Source Storage Engine</h2>
            <p className="text-[11px] text-secondary">
              Synchronize, query, and cache DICOM studies across Local Disk, Hospital PACS, Google Drive, and S3
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className="p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          title="Reload configuration"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-5 text-xs">
        {message && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
              message.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. Local Workstation Disk */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-on-surface">1. Local NVMe Workstation Storage</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Primary Cache (Zero Latency)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 pt-1">
            <label className="text-[11px] text-secondary">DICOM Cases Root Directory</label>
            <input
              type="text"
              value={settings.localPath}
              onChange={(e) => setSettings({ ...settings, localPath: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
              placeholder="E:\Cases"
            />
          </div>
        </div>

        {/* 2. Hospital PACS Server */}
        <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-on-surface">2. Hospital Live PACS (Ethernet / Wi-Fi)</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pacsEnabled}
                onChange={(e) => setSettings({ ...settings, pacsEnabled: e.target.checked })}
                className="rounded border-outline-variant text-primary focus:ring-0"
              />
              <span className="text-[11px] text-on-surface font-medium">Enable DIMSE Query & C-GET</span>
            </label>
          </div>
          <p className="text-[11px] text-secondary">
            Direct DICOM DIMSE connection to the hospital PACS server using ModalitiesInStudy query tag.
          </p>
        </div>

        {/* 3. Google Drive Headless Mirror */}
        <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-on-surface">3. Google Drive Headless Cloud Mirror</span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gdriveEnabled}
                onChange={(e) => setSettings({ ...settings, gdriveEnabled: e.target.checked })}
                className="rounded border-outline-variant text-primary focus:ring-0"
              />
              <span className="text-[11px] text-on-surface font-medium">Enable Google Drive Sync</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] text-secondary block mb-1">Target Google Drive Folder ID</label>
              <input
                type="text"
                value={settings.gdriveFolderId || ''}
                onChange={(e) => setSettings({ ...settings, gdriveFolderId: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
                placeholder="1ABCxyz987654321_yourFolderIdHere"
              />
            </div>
            <div>
              <label className="text-[11px] text-secondary block mb-1">Service Account Email</label>
              <input
                type="email"
                value={settings.gdriveServiceAccountEmail || ''}
                onChange={(e) => setSettings({ ...settings, gdriveServiceAccountEmail: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest font-mono text-xs text-on-surface outline-none focus:border-primary"
                placeholder="pacs-uploader@project.iam.gserviceaccount.com"
              />
            </div>
          </div>
          <div className="text-[11px] text-secondary/90 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${settings.gdriveKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{settings.gdriveKeyConfigured ? 'Service account key configured (config/service-account.json or env)' : 'Service account JSON key not found.'}</span>
          </div>
        </div>

        {/* 4. S3 Cloud Storage Bucket */}
        <UnifiedStorageS3Section
          settings={settings}
          setSettings={setSettings}
          s3SecretKey={s3SecretKey}
          setS3SecretKey={setS3SecretKey}
        />

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Storage Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
