'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cpu, LogOut, Loader2, Play } from 'lucide-react';

interface HmisCockpitHeaderProps {
  gatewayStatus: {
    online: boolean;
    starting: boolean;
    activeSessions?: number;
  };
  stagedStudy: { patientName?: string; accession?: string; mrn?: string } | null;
  loggingOut: boolean;
  launching: boolean;
  onLogout: () => void;
  onLaunch: () => void;
}

export function HmisCockpitHeader({
  gatewayStatus,
  stagedStudy,
  loggingOut,
  launching,
  onLogout,
  onLaunch,
}: HmisCockpitHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-card border border-outline-variant/40">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={gatewayStatus.online ? 'success' : 'danger'}
          className="gap-1.5 text-xs py-1"
        >
          <Cpu className={`w-3.5 h-3.5 ${gatewayStatus.online ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
          {gatewayStatus.online ? 'Gateway Microservice Online (Port 8080)' : 'Gateway Offline'}
        </Badge>

        <Badge variant="warning" className="text-[11px] py-0.5">
          🔒 Safe Testing Mode (Draft Only)
        </Badge>

        {stagedStudy && (
          <Badge variant="outline" className="text-[11px] py-0.5 font-mono text-primary border-primary/30">
            Staged: {stagedStudy.patientName} ({stagedStudy.accession || stagedStudy.mrn})
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {gatewayStatus.online && (gatewayStatus.activeSessions ?? 0) > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onLogout}
            disabled={loggingOut}
            className="h-7 text-xs gap-1.5 border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shadow-xs animate-pulse"
            title="Active portal session locked. Click to release and log out so other devices can access."
          >
            {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Release Session ({gatewayStatus.activeSessions} Active)
          </Button>
        )}

        {gatewayStatus.online && (gatewayStatus.activeSessions ?? 0) === 0 && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-xs py-0.5 px-2.5 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1.5 font-normal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Portal Standby (No Lock)
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={onLogout}
              disabled={loggingOut}
              className="h-6 text-[11px] px-2 text-secondary hover:text-rose-400"
              title="Force-release any external session lock if another computer is blocked"
            >
              Force Release
            </Button>
          </div>
        )}

        {!gatewayStatus.online && (
          <Button
            size="sm"
            onClick={onLaunch}
            disabled={launching}
            className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Launch HMIS Gateway
          </Button>
        )}
      </div>
    </div>
  );
}
