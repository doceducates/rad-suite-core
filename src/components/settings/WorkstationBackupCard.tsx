'use client';

import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import { Download, Upload, DatabaseBackup, CheckCircle, FileJson } from 'lucide-react';

export function WorkstationBackupCard() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/backup', { method: 'GET' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed generating backup archive');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `radsuite-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success('Backup Archive Downloaded', {
        description: 'Includes local cases, clinical reports, revisions, and custom templates.',
      });
    } catch (err: unknown) {
      notify.error('Backup Export Failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      notify.error('Invalid file type', { description: 'Please select a valid Rad Suite JSON backup archive (.json).' });
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import backup file.');
      }

      notify.success('Workstation Data Restored', {
        description: `Successfully imported ${data.importedCases} cases and ${data.importedTemplates} custom templates.`,
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      notify.error('Backup Import Failed', {
        description: err instanceof Error ? err.message : 'Unknown error during import.',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-outline-variant/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DatabaseBackup className="w-4 h-4 text-primary" /> Workstation Data Backup & Migration
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
            Offline Portable JSON
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-secondary text-[11px] leading-relaxed">
          Export your entire local clinical database (patient records, studies, finalized & draft reports, revision history, and custom templates) to a single portable file. You can readily import this archive into any other Rad Suite workstation instance.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 text-xs h-9 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>{exporting ? 'Generating Archive...' : 'Export Workstation Backup (JSON)'}</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelected}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="gap-2 text-xs h-9 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            <span>{importing ? 'Restoring Cases...' : 'Import Workstation Backup (JSON)'}</span>
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-surface-container-high/40 border border-outline-variant/40 flex items-start gap-2.5 text-[11px] text-secondary">
          <FileJson className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <span>
            <strong>Safe Non-Destructive Merge:</strong> Importing a backup will upsert matching accession numbers without overwriting newer doctor revisions or deleting unassociated local cases.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
