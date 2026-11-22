'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Save, AlertTriangle, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { HmisActiveInvestigationCard } from './hmis-active-investigation-card';
import { HmisPatientHistoryDrawer } from './hmis-patient-history-drawer';
import { HmisSearchPanel } from './hmis-search-panel';
import { matchCTMRIRules } from '@/services/clinical-rules.service';
import { matchHmisModule, type HmisInvestigationDetails } from '@/services/hmis/hmis-models';
import { config } from '@/lib/config';

interface StudyItem {
  id: string;
  accessionNumber: string;
  modality: string;
  scanType: string;
  clinicalHistory: string | null;
  patientName: string;
  mrNumber: string;
  age: number;
  gender: string;
}

export function HmisBridgeClient({ initialStudies = [] }: { initialStudies?: StudyItem[] }) {
  const [gatewayStatus, setGatewayStatus] = useState<{
    online: boolean;
    starting: boolean;
    activeSessions?: number;
  }>({ online: false, starting: false });
  const [launching, setLaunching] = useState(false);
  const [liveInv, setLiveInv] = useState<HmisInvestigationDetails | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [loadingLive, setLoadingLive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const matchedRule = matchCTMRIRules(liveInv?.existingHistory || initialStudies[0]?.scanType || 'CT BRAIN');

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/hmis/status');
      const data = await res.json();
      if (data.success) {
        setGatewayStatus({
          online: !!data.online,
          starting: !!data.starting,
          activeSessions: data.activeSessions,
        });
      }
    } catch {
      setGatewayStatus({ online: false, starting: false });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchGateway = async () => {
    setLaunching(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/hmis/status', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'ok', text: data.message || 'HMIS Gateway started.' });
        await checkStatus();
      } else {
        setStatusMsg({ type: 'err', text: data.message || 'Failed to start gateway' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: `Launch error: ${e.message}` });
    } finally {
      setLaunching(false);
    }
  };

  const handleFetchLive = async () => {
    setLoadingLive(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/hmis/investigation');
      const data = await res.json();
      if (data.success && data.data) {
        setLiveInv(data.data);
        const autoMod = matchHmisModule(data.data.moduleName || data.data.existingReport);
        if (autoMod) setSelectedModuleId(autoMod.value);
        setStatusMsg({ type: 'ok', text: `Loaded ${data.data.patientName} (MRN: ${data.data.mrn})` });
      } else {
        setStatusMsg({ type: 'err', text: data.error || 'Failed to fetch live patient from HMIS' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: `Connection error: ${e.message}` });
    } finally {
      setLoadingLive(false);
    }
  };

  const handleSelectPatientFromSearch = (pat: {
    mrn: string;
    patientName: string;
    accession: string;
    investigationId?: string;
    cpt?: string;
    existingHistory?: string;
  }) => {
    setLiveInv({
      patientName: pat.patientName,
      mrn: pat.mrn,
      studyId: pat.accession,
      investigationId: pat.investigationId || 'LIVE',
      isModalOpen: true,
      existingHistory: pat.existingHistory,
    });
    const autoMod = matchHmisModule(pat.cpt || pat.existingHistory);
    if (autoMod) setSelectedModuleId(autoMod.value);
    setStatusMsg({ type: 'ok', text: `Staged ${pat.patientName} (Accession: ${pat.accession})` });
  };

  const handleSubmitResult = async () => {
    if (!liveInv && initialStudies.length === 0) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const activeStudy = initialStudies[0];
      const payload = {
        investigationId: liveInv?.investigationId,
        patientMrn: liveInv?.mrn || activeStudy?.mrNumber,
        patientName: liveInv?.patientName || activeStudy?.patientName,
        accessionNumber: liveInv?.studyId || activeStudy?.accessionNumber,
        moduleId: selectedModuleId || '803',
        findings: liveInv?.existingReport || activeStudy?.clinicalHistory || 'Clinical findings ready for HMIS draft staging.',
        impression: liveInv?.existingImpression || 'Diagnostic impression ready for HMIS draft.',
        clinicalHistory: liveInv?.existingHistory || activeStudy?.clinicalHistory || 'Referred for diagnostic scan.',
        action: 'save',
      };
      const res = await fetch('/api/hmis/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'ok', text: data.message || 'Successfully saved as Draft in HMIS' });
      } else {
        setStatusMsg({ type: 'err', text: data.error || 'Draft save failed' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'err', text: `Draft save failed: ${e.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {gatewayStatus.online ? (
            <Badge variant="outline" className="gap-1.5 text-xs py-1 border-emerald-500/30 text-emerald-400">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Gateway Port 8080 Active
            </Badge>
          ) : (
            <Badge variant="danger" className="gap-1.5 text-xs py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Cpu className="w-3.5 h-3.5 text-rose-400" /> Gateway Offline
            </Badge>
          )}
          <Badge variant="warning" className="gap-1 text-[11px] py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30">
            🔒 Safe Testing Mode (Draft Only)
          </Badge>
          {statusMsg && (
            <span className={`text-xs flex items-center gap-1 ${statusMsg.type === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {statusMsg.type === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {statusMsg.text}
            </span>
          )}
        </div>
        {!gatewayStatus.online && (
          <Button
            size="sm"
            onClick={handleLaunchGateway}
            disabled={launching}
            className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Launch HMIS Gateway
          </Button>
        )}
      </div>

      <HmisSearchPanel onSelectPatient={handleSelectPatientFromSearch} disabled={!gatewayStatus.online} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HmisActiveInvestigationCard
          investigation={liveInv}
          onRefreshLive={handleFetchLive}
          selectedModuleId={selectedModuleId}
          onSelectModuleId={setSelectedModuleId}
          onOpenHistory={() => setIsHistoryOpen(true)}
          loadingLive={loadingLive}
          onTriggerPacs={() => liveInv?.mrn && window.open(`${config.hmisGatewayUrl}/api/radiology/action?action=view_pacs&mrn=${liveInv.mrn}`, '_blank')}
        />

        <Card className="p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-foreground">Diagnostic Findings & Actions</h4>
            <div className="p-2.5 rounded-lg bg-surface-container-high/30 border border-outline-variant/40 space-y-2 text-xs">
              <span className="font-semibold text-primary block">{matchedRule?.scanType || 'CT Diagnostic Report'}</span>
              <p className="text-[11px] text-muted-foreground line-clamp-3">
                {liveInv?.existingReport || 'Diagnostic findings staged and ready for HMIS draft save.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/30">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitResult}
              disabled={submitting || !gatewayStatus.online}
              className="flex-1 h-9 text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save HMIS Draft (Safe)
            </Button>
          </div>
        </Card>
      </div>

      <HmisPatientHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        investigationId={liveInv?.investigationId || ''}
        patientMrn={liveInv?.mrn || ''}
        patientName={liveInv?.patientName}
      />
    </div>
  );
}
