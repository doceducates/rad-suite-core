'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HardDrive,
  Activity,
} from 'lucide-react';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';

interface ClinicDiagnosticProbesProps {
  telemetry: ClinicNodeTelemetry;
  isOnline: boolean;
  pacsConnected: boolean;
  s3Connected: boolean;
  orthancPass: boolean;
  allPassed: boolean;
}

export function ClinicDiagnosticProbes({
  telemetry,
  isOnline,
  pacsConnected,
  s3Connected,
  orthancPass,
  allPassed,
}: ClinicDiagnosticProbesProps) {
  return (
    <div className="space-y-3">
      {/* 6 Subsystem Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
        {/* 1. Heartbeat */}
        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Heartbeat</span>
            {isOnline ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="font-bold text-foreground">
            {isOnline ? 'Online (Connected)' : 'Offline / Waiting'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {telemetry.lastHeartbeat
              ? `Seen ${new Date(telemetry.lastHeartbeat).toLocaleTimeString()}`
              : 'No ping yet'}
          </div>
        </div>

        {/* 2. Hospital PACS */}
        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Hospital PACS Link</span>
            {pacsConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="font-bold text-foreground">
            {pacsConnected ? 'PACS Online' : 'Unreachable'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {pacsConnected ? 'C-ECHO / C-GET Whitelisted' : 'Check Ethernet cable & route'}
          </div>
        </div>

        {/* 3. Cloud S3 Storage */}
        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">S3 Cloud Storage</span>
            {s3Connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="font-bold text-foreground">
            {s3Connected ? 's3.sehatai.org' : 'Write Probe Pending'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {s3Connected ? 'SigV4 Write Verified' : 'Check Wi-Fi Internet'}
          </div>
        </div>

        {/* 4. Orthanc Engine */}
        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Orthanc Engine</span>
            {orthancPass ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="font-bold text-foreground">
            {orthancPass ? 'Port 11115 / 18042' : 'Stopped / Not Started'}
          </div>
          <div className="text-[10px] text-muted-foreground">Deflate Lossless Compression Active</div>
        </div>

        {/* 5. Free Disk Space */}
        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Local Cache Disk</span>
            <HardDrive className="w-4 h-4 text-primary" />
          </div>
          <div className="font-bold text-foreground">{telemetry.disk.freeGb} GB Free</div>
          <div className="text-[10px] text-muted-foreground">{telemetry.disk.usedPercent}% Used</div>
        </div>

        {/* 6. Active Upload Queue */}
        <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">In-Flight Upload</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="font-bold text-foreground truncate">
            {telemetry.activeUpload ? telemetry.activeUpload.patientName : 'Idle (Waiting)'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {telemetry.activeUpload
              ? `${telemetry.activeUpload.completedSlices}/${telemetry.activeUpload.totalSlices} Slices (${telemetry.activeUpload.progressPercent}%)`
              : 'Queue Clear'}
          </div>
        </div>
      </div>

      {/* Action Guidance Banner */}
      {!allPassed && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Action Required / What Needs To Be Done:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px]">
            {!isOnline && (
              <li>
                <strong>Node is Offline:</strong> Run <code>install.bat</code> on the clinic PC as Administrator and ensure the clinic PC is connected to Wi-Fi.
              </li>
            )}
            {isOnline && !pacsConnected && (
              <li>
                <strong>PACS Unreachable:</strong> Plug the Ethernet cable into the hospital network socket and verify the subnet route.
              </li>
            )}
            {isOnline && !s3Connected && (
              <li>
                <strong>S3 Storage Inaccessible:</strong> Check that the Clinic PC Wi-Fi has active Internet access.
              </li>
            )}
            {isOnline && !orthancPass && (
              <li>
                <strong>Orthanc Engine Inactive:</strong> In Command Prompt, run <code>net start Orthanc</code>.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
