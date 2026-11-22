'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, User, FlaskConical, ExternalLink, Activity } from 'lucide-react';
import { HMIS_CT_MODULE_OPTIONS, type HmisInvestigationDetails } from '@/services/hmis/hmis-models';

interface ActiveInvestigationCardProps {
  investigation: HmisInvestigationDetails | null;
  onRefreshLive: () => Promise<void>;
  selectedModuleId: string;
  onSelectModuleId: (id: string) => void;
  onOpenHistory: () => void;
  loadingLive: boolean;
  onTriggerPacs?: () => void;
}

export function HmisActiveInvestigationCard({
  investigation,
  onRefreshLive,
  selectedModuleId,
  onSelectModuleId,
  onOpenHistory,
  loadingLive,
  onTriggerPacs,
}: ActiveInvestigationCardProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-foreground">Active HMIS Investigation</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshLive}
          disabled={loadingLive}
          className="h-7 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
          Fetch Live Patient
        </Button>
      </div>

      {investigation ? (
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-container-high/40 border border-outline-variant/40 flex items-start justify-between">
            <div>
              <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> {investigation.patientName}
              </p>
              <p className="text-muted-foreground mt-0.5">
                MRN: <span className="font-mono font-semibold text-foreground">{investigation.mrn}</span>
                {investigation.age && ` • ${investigation.age}Y`}
                {investigation.gender && ` • ${investigation.gender}`}
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[11px]">
              ID: {investigation.investigationId}
            </Badge>
          </div>

          <div>
            <label className="text-muted-foreground font-medium block mb-1">
              Procedure CT Module (22 Verified Options):
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => onSelectModuleId(e.target.value)}
              className="w-full p-2 rounded-lg border border-outline-variant bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">-- Select CT Module --</option>
              {HMIS_CT_MODULE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  [{m.value}] {m.text}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="flex-1 h-8 text-xs gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              Prior Labs & Pathology
            </Button>
            {onTriggerPacs && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTriggerPacs}
                className="h-8 text-xs gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                HMIS PACS
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
          <p>No active investigation loaded from HMIS portal.</p>
          <p className="text-[11px]">Open an investigation modal on hmis.punjab.gov.pk and click &quot;Fetch Live Patient&quot;.</p>
        </div>
      )}
    </Card>
  );
}
