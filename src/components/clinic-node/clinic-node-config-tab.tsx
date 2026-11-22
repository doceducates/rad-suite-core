'use client';

import React, { useState, useEffect } from 'react';
import { Network, ChevronDown } from 'lucide-react';
import { ClinicPipelineHeader } from './clinic-pipeline-header';
import { ClinicSaveBar } from './clinic-save-bar';
import { ClinicClusterWatchdogCard } from './clinic-cluster-watchdog-card';
import { ClinicPacsHarvestCard } from './clinic-pacs-harvest-card';
import { ClinicS3SyncCard } from './clinic-s3-sync-card';
import { ClinicScheduleCard } from './clinic-schedule-card';
import type { ClinicNodeTelemetry, ClinicActionType } from '@/services/clinic-node.service';
import type {
  StallWatchdogConfig,
  PeerCooperationConfig,
  ClinicHarvestSchedule,
  ClinicSyncRules,
  ClinicScheduleConfig,
} from '@/services/clinic-node.types';

interface ClinicNodeConfigTabProps {
  telemetry: ClinicNodeTelemetry;
  selectedNodeId: string;
  loading: boolean;
  onAction: (action: ClinicActionType, payload?: any) => Promise<void>;
}

export function ClinicNodeConfigTab({
  telemetry,
  selectedNodeId,
  loading,
  onAction,
}: ClinicNodeConfigTabProps) {
  const [savingAll, setSavingAll] = useState(false);

  // Local draft states
  const [draftHarvestSchedule, setDraftHarvestSchedule] = useState<ClinicHarvestSchedule | null>(
    telemetry.harvestSchedule || null
  );
  const [draftSyncRules, setDraftSyncRules] = useState<ClinicSyncRules | undefined>(
    telemetry.syncRules
  );
  const [draftPeer, setDraftPeer] = useState<PeerCooperationConfig | null>(
    telemetry.peerCooperation || null
  );
  const [draftWatchdog, setDraftWatchdog] = useState<StallWatchdogConfig | null>(
    telemetry.stallWatchdog || null
  );
  const [draftSchedule, setDraftSchedule] = useState<ClinicScheduleConfig | null | undefined>(
    telemetry.schedule || null
  );
  const [draftKnownNetworks, setDraftKnownNetworks] = useState<Array<{ ssid: string; password?: string }>>(
    telemetry.knownNetworks || []
  );

  // Dirty state tracking
  const isHarvestDirty =
    draftHarvestSchedule !== null &&
    JSON.stringify(draftHarvestSchedule) !== JSON.stringify(telemetry.harvestSchedule || null);

  const isSyncDirty =
    draftSyncRules !== undefined &&
    JSON.stringify(draftSyncRules) !== JSON.stringify(telemetry.syncRules);

  const isNetworksDirty =
    JSON.stringify(draftKnownNetworks) !== JSON.stringify(telemetry.knownNetworks || []);

  const isClusterDirty =
    (draftPeer !== null &&
      JSON.stringify(draftPeer) !== JSON.stringify(telemetry.peerCooperation || null)) ||
    (draftWatchdog !== null &&
      JSON.stringify(draftWatchdog) !== JSON.stringify(telemetry.stallWatchdog || null)) ||
    isNetworksDirty;

  const isScheduleDirty =
    draftSchedule !== null &&
    JSON.stringify(draftSchedule) !== JSON.stringify(telemetry.schedule || null);

  // Sync drafts when remote telemetry updates (unless modified locally by user)
  useEffect(() => {
    if (isHarvestDirty || isSyncDirty || isClusterDirty || isScheduleDirty) {
      return; // Guard: protect unsaved user edits from background polling overwrites
    }
    setDraftHarvestSchedule(telemetry.harvestSchedule || null);
    setDraftSyncRules(telemetry.syncRules);
    setDraftPeer(telemetry.peerCooperation || null);
    setDraftWatchdog(telemetry.stallWatchdog || null);
    setDraftSchedule(telemetry.schedule || null);
    setDraftKnownNetworks(telemetry.knownNetworks || []);
  }, [telemetry.lastHeartbeat, isHarvestDirty, isSyncDirty, isClusterDirty, isScheduleDirty]);

  // When switching between different clinic nodes, unconditionally reset drafts
  useEffect(() => {
    setDraftHarvestSchedule(telemetry.harvestSchedule || null);
    setDraftSyncRules(telemetry.syncRules);
    setDraftPeer(telemetry.peerCooperation || null);
    setDraftWatchdog(telemetry.stallWatchdog || null);
    setDraftSchedule(telemetry.schedule || null);
    setDraftKnownNetworks(telemetry.knownNetworks || []);
  }, [selectedNodeId]);

  const dirtySections: string[] = [];
  if (isHarvestDirty) dirtySections.push('PACS Harvester');
  if (isSyncDirty) dirtySections.push('S3 Cloud Sync');
  if (isClusterDirty) dirtySections.push('Cluster & Self-Healing');
  if (isScheduleDirty) dirtySections.push('Hours & Pause');

  const hasChanges = dirtySections.length > 0;

  const handleDiscard = () => {
    setDraftHarvestSchedule(telemetry.harvestSchedule || null);
    setDraftSyncRules(telemetry.syncRules);
    setDraftPeer(telemetry.peerCooperation || null);
    setDraftWatchdog(telemetry.stallWatchdog || null);
    setDraftSchedule(telemetry.schedule || null);
    setDraftKnownNetworks(telemetry.knownNetworks || []);
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      await onAction('save-all-settings', {
        harvestSchedule: draftHarvestSchedule,
        syncRules: draftSyncRules,
        peerCooperation: draftPeer,
        stallWatchdog: draftWatchdog,
        schedule: draftSchedule,
        knownNetworks: draftKnownNetworks,
      });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans pb-12">
      {/* 4-Tier DICOM Pipeline Architecture Milestone Tracker */}
      <ClinicPipelineHeader telemetry={telemetry} />

      {/* Primary Harvester Rules */}
      <ClinicPacsHarvestCard
        initialSchedule={draftHarvestSchedule}
        hideSaveButton={true}
        onChange={(sched) => setDraftHarvestSchedule(sched)}
        onHarvestNow={(modalities, scope) => onAction('harvest-pacs', { modalities, scope })}
        loading={loading || savingAll}
      />

      {/* Primary S3 Selective Sync & Filtering Rules */}
      <ClinicS3SyncCard
        s3Status={telemetry.s3Status}
        initialRules={draftSyncRules}
        hideSaveButton={true}
        onChange={(rules) => setDraftSyncRules(rules)}
        onTestS3={() => onAction('test-s3')}
        loading={loading || savingAll}
      />

      {/* Collapsible Advanced Engine Tuning & Cluster Failover */}
      <details className="border border-border/70 rounded-2xl bg-card overflow-hidden group shadow-xs">
        <summary className="px-5 py-3.5 bg-surface-container/50 font-semibold flex items-center justify-between cursor-pointer select-none hover:bg-surface-container/80 transition-colors">
          <div className="flex items-center gap-2.5">
            <Network className="w-4 h-4 text-primary" />
            <div>
              <span className="font-bold text-xs text-foreground">Advanced: Cluster Topology &amp; Watchdog Self-Healing</span>
              <p className="text-[11px] text-muted-foreground font-normal">
                Secondary peer failover, Session 0 stall recovery, and operating hours schedule
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
        </summary>

        <div className="p-4 space-y-4 border-t border-border/60 bg-background/50">
          <ClinicClusterWatchdogCard
            initialPeerCooperation={draftPeer}
            initialStallWatchdog={draftWatchdog}
            initialKnownNetworks={draftKnownNetworks}
            hideSaveButton={true}
            onChange={(peer, watchdog, networks) => {
              setDraftPeer(peer);
              setDraftWatchdog(watchdog);
              if (networks) setDraftKnownNetworks(networks);
            }}
            loading={loading || savingAll}
          />

          <ClinicScheduleCard
            telemetry={telemetry}
            hideSaveButton={true}
            onChange={(sched) => setDraftSchedule(sched)}
            onPauseResume={(pause) => onAction(pause ? 'pause-sync' : 'resume-sync')}
            onRunDiagnostics={() => onAction('run-diagnostics')}
            loading={loading || savingAll}
          />
        </div>
      </details>

      {/* Single Master Save Bar (Sticky Footer) */}
      <ClinicSaveBar
        hasChanges={hasChanges}
        saving={savingAll}
        dirtySections={dirtySections}
        onSave={handleSaveAll}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
