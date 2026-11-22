'use client';

import React from 'react';
import { Server, Send, Cpu, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SystemNodeHealth } from '@/types/dashboard';

interface DashboardSystemRadarProps {
  health: SystemNodeHealth;
}

export function DashboardSystemRadar({ health }: DashboardSystemRadarProps) {
  const nodes = [
    {
      title: 'Hospital PACS Harvester',
      detail: `${health.hospitalPacs.ip} (${health.hospitalPacs.harvestStatus})`,
      status: health.hospitalPacs.online ? 'Online' : 'Standby / Local',
      isOk: health.hospitalPacs.online,
      icon: Server,
      color: 'text-emerald-500',
    },
    {
      title: 'Punjab HMIS Gateway',
      detail: `${health.hmisGateway.draftVaultCount} Drafts Vaulted Locally`,
      status: health.hmisGateway.online ? 'Connected' : 'Offline',
      isOk: health.hmisGateway.online,
      icon: Send,
      color: 'text-sky-500',
    },
    {
      title: 'Local AI Dictation Hub',
      detail: `${health.aiEngine.model} (Port :${health.aiEngine.port})`,
      status: health.aiEngine.online ? 'Ready' : 'Offline',
      isOk: health.aiEngine.online,
      icon: Cpu,
      color: 'text-purple-500',
    },
    {
      title: 'Storage & Archival Tier',
      detail: `Hot SSD: ${health.storage.localHotCacheMb} MB • S3 Polite Archival`,
      status: health.storage.s3ArchiveOnline ? 'Syncd' : 'Local Only',
      isOk: health.storage.s3ArchiveOnline,
      icon: Database,
      color: 'text-amber-500',
    },
  ];

  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="pb-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <span>Hospital Node Telemetry</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Live Edge Network
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {nodes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.title}
              className="p-3 rounded-xl bg-surface-container/50 border border-outline-variant/40 flex items-center justify-between gap-3 group hover:border-outline-variant/80 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg bg-surface border border-outline-variant/40 ${node.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{node.title}</p>
                  <p className="text-[11px] text-secondary truncate font-mono mt-0.5">{node.detail}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {node.isOk ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-[10px] font-semibold text-secondary uppercase font-mono">
                  {node.status}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
