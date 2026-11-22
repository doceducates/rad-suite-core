'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Activity, ShieldCheck } from 'lucide-react';
import { PacsNetworkAssistant } from '@/components/pacs/pacs-network-assistant';
import { UnifiedStorageSettingsCard } from '@/components/pacs/unified-storage-settings';
import { PacsServerCard } from '@/components/pacs/pacs-server-card';
import { PacsBackgroundServices } from '@/components/pacs/pacs-background-services';

interface AdminPacsSettingsProps {
  initialServers?: any[];
}

export function AdminPacsSettings({ initialServers = [] }: AdminPacsSettingsProps) {
  return (
    <div className="space-y-6 text-xs font-sans">
      {/* Admin Privilege Header Card */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-on-surface text-sm flex items-center gap-2">
                PACS & DICOM Routing Administration
                <Badge variant="outline" className="font-mono text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Admin Only
                </Badge>
              </div>
              <p className="text-[11px] text-secondary mt-0.5">
                Configure hospital DICOM storage SCP nodes, C-GET/C-MOVE retrieval protocols, dual-network routing, and auto-query listener.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-mono text-[10px]">
              <Activity className="w-3 h-3 animate-pulse" />
              SCP Listener: 11112 (RADIANT)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dual Network Assistant (Wi-Fi Internet + Ethernet PACS) */}
      <PacsNetworkAssistant />

      {/* Unified 4-Source Storage Engine */}
      <UnifiedStorageSettingsCard />

      {/* PACS Locations & Nodes Configuration */}
      <PacsServerCard initialServers={initialServers} />

      {/* Background Services & REST API Gateway */}
      <PacsBackgroundServices />
    </div>
  );
}
