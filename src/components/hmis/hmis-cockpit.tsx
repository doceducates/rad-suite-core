'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Users, Search, FileEdit, Activity, Settings2, Play, Loader2, LogOut, FileCheck } from 'lucide-react';
import { HmisWorklistPanel, type WorklistPatientRecord } from './hmis-worklist-panel';
import { HmisSearchPanel } from './hmis-search-panel';
import { HmisPublishedPanel } from './hmis-published-panel';
import { HmisResultComposer, type ComposerStudyData } from './hmis-result-composer';
import { HmisMilestoneTracker } from './hmis-milestone-tracker';
import { HmisTrackingPanel } from './hmis-tracking-panel';
import { HmisCockpitHeader } from './hmis-cockpit-header';
import { HmisGatewayMonitor } from './hmis-gateway-monitor';
import { HmisSessionAlert } from './hmis-session-alert';

type ActiveTab = 'worklist' | 'search' | 'published' | 'composer' | 'tracker' | 'gateway';

export function HmisCockpit() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('worklist');
  const [stagedStudy, setStagedStudy] = useState<ComposerStudyData | null>(null);
  const [trackingAccession, setTrackingAccession] = useState('');
  const [trackingMrn, setTrackingMrn] = useState('');
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);

  const [gatewayStatus, setGatewayStatus] = useState<{
    online: boolean;
    starting: boolean;
    pid?: number | null;
    startedAt?: string | null;
    safetyMode?: string;
    activeSessions?: number;
  }>({ online: false, starting: false });
  const [launching, setLaunching] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutHmis = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/hmis/logout', { method: 'POST' });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hmis-status-changed'));
      }
      await checkStatus();
    } catch (e: any) {
      console.error('Logout failed:', e);
    } finally {
      setLoggingOut(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/hmis/status');
      const data = await res.json();
      if (data.success) {
        setGatewayStatus({
          online: !!data.online,
          starting: !!data.starting,
          pid: data.pid,
          startedAt: data.startedAt,
          safetyMode: data.safetyMode,
          activeSessions: Number(data.activeSessions) || 0,
        });
      }
    } catch {
      setGatewayStatus({ online: false, starting: false, activeSessions: 0 });
    }
  };

  useEffect(() => {
    checkStatus();
    const handleEvent = () => checkStatus();
    window.addEventListener('hmis-status-changed', handleEvent);
    const interval = setInterval(checkStatus, 10000);
    return () => {
      window.removeEventListener('hmis-status-changed', handleEvent);
      clearInterval(interval);
    };
  }, []);

  const handleLaunchGateway = async () => {
    setLaunching(true);
    try {
      const res = await fetch('/api/hmis/status', { method: 'POST' });
      await res.json();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hmis-status-changed'));
      }
      await checkStatus();
    } catch (e: any) {
      console.error('Launch failed:', e);
    } finally {
      setLaunching(false);
    }
  };

  const handleStageStudy = (study: WorklistPatientRecord) => {
    setStagedStudy({
      patientName: study.patientName,
      mrn: study.mrn,
      accession: study.accession || '',
      investigationId: study.investigationId,
      cpt: study.cpt,
      modality: study.modality,
    });
    setActiveTab('composer');
  };

  const handleStageFromSearch = (pat: {
    mrn: string;
    patientName: string;
    accession: string;
    investigationId?: string;
    cpt?: string;
    modality?: string;
    existingHistory?: string;
  }) => {
    setStagedStudy({
      patientName: pat.patientName,
      mrn: pat.mrn,
      accession: pat.accession,
      investigationId: pat.investigationId,
      cpt: pat.cpt,
      modality: pat.modality,
      clinicalHistory: pat.existingHistory,
    });
    setActiveTab('composer');
  };

  const handleTrackAccession = (acc: string, m?: string) => {
    setTrackingAccession(acc);
    if (m) setTrackingMrn(m);
    setActiveTab('tracker');
  };

  return (
    <div className="space-y-4">
      {/* Cockpit Status Bar */}
      <HmisCockpitHeader
        gatewayStatus={gatewayStatus}
        stagedStudy={stagedStudy}
        loggingOut={loggingOut}
        launching={launching}
        onLogout={handleLogoutHmis}
        onLaunch={handleLaunchGateway}
      />

      {/* Session Conflict Notification Banner */}
      {collisionMessage && (
        <HmisSessionAlert
          message={collisionMessage}
          onReleased={async () => {
            setCollisionMessage(null);
            await checkStatus();
          }}
          onDismiss={() => setCollisionMessage(null)}
        />
      )}

      {/* Cockpit Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-outline-variant/30 text-xs">
        <Button
          size="sm"
          variant={activeTab === 'worklist' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('worklist')}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <Users className="w-3.5 h-3.5" /> Proceeded Patients Worklist
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'search' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('search')}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <Search className="w-3.5 h-3.5" /> Intelligent Search
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'published' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('published')}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <FileCheck className="w-3.5 h-3.5" /> Published Reports
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'composer' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('composer')}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <FileEdit className="w-3.5 h-3.5" /> Result Composer & Staging
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'tracker' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('tracker')}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <Activity className="w-3.5 h-3.5" /> 9-Stage Milestone Tracker
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'gateway' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('gateway')}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          <Settings2 className="w-3.5 h-3.5" /> Gateway Diagnostics & Auth
        </Button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'worklist' && (
          <HmisWorklistPanel
            onStageStudy={handleStageStudy}
            onTrackAccession={(acc) => handleTrackAccession(acc)}
            disabled={!gatewayStatus.online}
          />
        )}

        {activeTab === 'search' && (
          <HmisSearchPanel
            onSelectPatient={handleStageFromSearch}
            onTrackAccession={(acc, m) => handleTrackAccession(acc, m)}
            onSessionCollision={(msg) => setCollisionMessage(msg)}
            disabled={!gatewayStatus.online}
          />
        )}

        {activeTab === 'published' && (
          <HmisPublishedPanel
            onTrackAccession={(acc, m) => handleTrackAccession(acc, m)}
            onSessionCollision={(msg) => setCollisionMessage(msg)}
            disabled={!gatewayStatus.online}
          />
        )}

        {activeTab === 'composer' && (
          <HmisResultComposer
            stagedStudy={stagedStudy}
            onClearStudy={() => setStagedStudy(null)}
            disabled={!gatewayStatus.online}
          />
        )}

        {activeTab === 'tracker' && (
          <div className="space-y-4">
            <HmisTrackingPanel
              onTrackAccession={(acc, m) => handleTrackAccession(acc, m)}
              onStageStudy={(rec) => {
                setStagedStudy({
                  patientName: rec.patientName,
                  mrn: rec.mrn,
                  accession: rec.accession || '',
                  modality: rec.cpt?.includes('MRI') ? 'MRI' : 'CT',
                  cpt: rec.cpt,
                });
                setActiveTab('composer');
              }}
              onSessionCollision={(msg) => setCollisionMessage(msg)}
              disabled={!gatewayStatus.online}
            />
            {trackingAccession && (
              <HmisMilestoneTracker
                initialAccession={trackingAccession}
                initialMrn={trackingMrn}
                onSessionCollision={(msg) => setCollisionMessage(msg)}
                disabled={!gatewayStatus.online}
              />
            )}
          </div>
        )}

        {activeTab === 'gateway' && (
          <HmisGatewayMonitor
            status={gatewayStatus}
            onRefreshStatus={checkStatus}
            onLaunchGateway={handleLaunchGateway}
            launching={launching}
          />
        )}
      </div>
    </div>
  );
}
