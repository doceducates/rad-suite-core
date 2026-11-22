'use client';

import React from 'react';
import { ChevronRight, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  PacsStorageIcon,
  MedicalSandboxIcon,
  VpsHotStorageIcon,
  CloudS3ColdStorageIcon,
} from './pipeline-icons';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';

interface ClinicPipelineHeaderProps {
  telemetry: ClinicNodeTelemetry;
}

export function ClinicPipelineHeader({ telemetry }: ClinicPipelineHeaderProps) {
  const pacsReachable = telemetry.pacsStatus?.connected ?? true;
  const orthancRunning = telemetry.orthancStatus === 'running';
  const s3Connected = telemetry.s3Status?.connected ?? true;

  const stages = [
    {
      id: 'pacs',
      title: 'Tier 1: Hospital PACS',
      icon: PacsStorageIcon,
      address: 'Hospital PACS Archive',
      status: pacsReachable ? 'Reachable' : 'Unreachable',
      statusOk: pacsReachable,
      desc: 'Central DIMSE source',
    },
    {
      id: 'sandbox',
      title: 'Tier 2: Medical Sandbox',
      icon: MedicalSandboxIcon,
      address: 'C:\\MedicalSandbox\\Orthanc',
      status: orthancRunning ? 'Active Engine' : 'Engine Stopped',
      statusOk: orthancRunning,
      desc: 'Local offline SSD buffer',
    },
    {
      id: 'vps',
      title: 'Tier 3: VPS Hot Staging',
      icon: VpsHotStorageIcon,
      address: 'storage/hot-cases/',
      status: '0ms Web Serving',
      statusOk: true,
      desc: 'Active reporting cache',
    },
    {
      id: 's3',
      title: 'Tier 4: S3 Cold Archive',
      icon: CloudS3ColdStorageIcon,
      address: 'https://s3.sehatai.org',
      status: s3Connected ? 'SigV4 Connected' : 'Disconnected',
      statusOk: s3Connected,
      desc: 'Single Study ZIP storage',
    },
  ];

  return (
    <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-foreground tracking-tight">
              DICOM Pipeline Architecture (4-Tier Lifecycle)
            </h2>
            <p className="text-[11px] text-muted-foreground">
              End-to-end data trajectory from hospital consoles to zero-latency reporting and S3 archive
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-[11px] font-mono text-muted-foreground border border-border/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Pipeline</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div
              key={st.id}
              className="relative p-3 rounded-xl bg-background border border-border/60 hover:border-primary/40 transition-all flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-foreground truncate">{st.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{st.address}</div>
                  </div>
                </div>
                {idx < stages.length - 1 && (
                  <ArrowRight className="hidden lg:block w-3 h-3 text-muted-foreground/40 absolute -right-2 top-1/2 -translate-y-1/2 z-10" />
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                <span className="text-muted-foreground truncate">{st.desc}</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                    st.statusOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${st.statusOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {st.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
