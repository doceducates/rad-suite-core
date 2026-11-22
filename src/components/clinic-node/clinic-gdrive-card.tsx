'use client';

import React, { useState } from 'react';
import { Cloud, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Folder, Save, HelpCircle, Laptop } from 'lucide-react';
import type { GoogleDriveStatus } from '@/services/clinic-node.service';

interface ClinicGDriveCardProps {
  status?: GoogleDriveStatus;
  onTestAction: () => Promise<void>;
  onUpdateFolderId: (folderId: string) => Promise<void>;
}

export function ClinicGDriveCard({ status, onTestAction, onUpdateFolderId }: ClinicGDriveCardProps) {
  const [folderId, setFolderId] = useState(status?.folderId || '');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const isConfigured = Boolean(status?.configured);
  const driveUrl = folderId ? `https://drive.google.com/drive/folders/${folderId}` : null;

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTestAction();
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId.trim()) return;
    setSaving(true);
    try {
      await onUpdateFolderId(folderId.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Google Drive Cloud Mirror
              {isConfigured ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Setup Pending
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Invisible headless Service Account upload (No personal Google login on Clinic PC)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-xs flex items-center gap-1"
          title="Toggle Home Offline RadiAnt Guide"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline Guide</span>
        </button>
      </div>

      {/* Target Folder Configuration Form */}
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Google Drive Destination Folder ID
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="e.g. 1ABCxyz987654321_yourFolderIdHere"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-muted/30 border border-border/80 focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !folderId.trim()}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>

        {driveUrl && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="text-[11px]">Folder ID mapped to clinic ingestion pipeline.</span>
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 font-semibold text-[11px]"
            >
              Open in Google Drive
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </form>

      {/* Test Connection Button & Status */}
      <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs">
          {status?.lastTestMessage ? (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${status.lastTestSuccess ? 'text-emerald-500' : 'text-amber-500'}`}>
              {status.lastTestSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{status.lastTestMessage}</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {isConfigured ? 'Service account key ready.' : 'Requires service-account.json in C:\\MedicalSandbox\\config\\'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Testing Access...' : 'Test Drive Connection'}
        </button>
      </div>

      {/* Expandable Offline Workflow Guidance */}
      {showGuide && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2 animate-in fade-in duration-200">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Laptop className="w-4 h-4 text-primary" />
            Home Radiologist Offline Workflow (0ms RadiAnt Speed)
          </div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px]">
            <li>Install <strong>Google Drive for Desktop</strong> on your private home laptop/workstation.</li>
            <li>Locate <code className="text-foreground font-mono">Clinic_PACS_Backup</code> $\rightarrow$ Right-click $\rightarrow$ Offline access $\rightarrow$ <strong>&quot;Mirror Files&quot;</strong>.</li>
            <li>Launch <strong>RadiAnt Viewer</strong> on home PC and drag the mirrored folder $\rightarrow$ All CT/MR studies report with instant local NVMe speed!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
