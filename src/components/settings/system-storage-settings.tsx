'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, ShieldCheck, HardDrive, CheckCircle2 } from 'lucide-react';
import { ReportSyncProvidersCard } from './ReportSyncProvidersCard';
import { CaseSyncSettingsCard } from './CaseSyncSettingsCard';
import { WorklistRetentionSettingsCard } from './WorklistRetentionSettingsCard';
import { WorkstationBackupCard } from './WorkstationBackupCard';
import { DesktopUpdaterCard } from './DesktopUpdaterCard';

export function SystemStorageSettings() {
  return (
    <div className="space-y-6 text-xs">
      <DesktopUpdaterCard />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" /> Database & Storage Engine Architecture
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
              Dual Dialect Enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-secondary text-[11px]">
            Rad Suite supports zero-configuration local SQLite for desktop offline mode and high-throughput PostgreSQL for enterprise hospital server deployment.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface">Active Database Dialect</span>
                <Badge variant="success" className="text-[10px]">Connected</Badge>
              </div>
              <div className="font-mono text-[11px] p-2 rounded bg-surface-container-highest text-primary">
                SQLite WAL (Zero-Latency Local File DB) / PostgreSQL
              </div>
              <p className="text-[10px] text-secondary">
                Auto-migrated schema with foreign key constraints, revision history, and encrypted credential storage.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface">HIPAA Audit Trail Integrity</span>
                <Badge variant="success" className="text-[10px]">Tamper-Evident</Badge>
              </div>
              <div className="font-mono text-[11px] p-2 rounded bg-surface-container-highest text-emerald-600 dark:text-emerald-400">
                HMAC-SHA256 Chained Hash Log
              </div>
              <p className="text-[10px] text-secondary">
                Every PHI access and draft modification is cryptographically recorded with actor ID, timestamp, and previous block hash.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <WorklistRetentionSettingsCard />

      <WorkstationBackupCard />

      <CaseSyncSettingsCard />

      <ReportSyncProvidersCard />
    </div>
  );
}
