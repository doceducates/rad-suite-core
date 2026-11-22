// Layer 2 (Domain/Services): Centralized Clinic Edge Node Task Tracker & Progress Engine
// Strict File Size Invariant: Target < 250 lines

import { notify, type ProgressItemDetail } from '@/services/notification.service';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.types';

export interface TrackedStudyItem {
  accession: string;
  patientName: string;
  modality?: string;
  status: 'pending' | 'saving' | 'success' | 'failed';
  detail?: string;
}

class ClinicTaskTrackerService {
  private trackedUploads: Map<string, TrackedStudyItem> = new Map();
  private trackedPulls: Map<string, TrackedStudyItem> = new Map();
  private activeNodeId = 'node-desktop-1ldu8l1';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private isPolling = false;
  private listeners: Set<() => void> = new Set();
  private uploadJobId = 'clinic-node-s3-upload';
  private pullJobId = 'clinic-node-pacs-pull';

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() { this.listeners.forEach((l) => { try { l(); } catch {} }); }

  public setActiveNodeId(nodeId: string) {
    if (nodeId && nodeId !== this.activeNodeId) {
      this.activeNodeId = nodeId;
      this.emit();
    }
  }

  public getTrackedUploads(): TrackedStudyItem[] { return Array.from(this.trackedUploads.values()); }

  public clear() {
    this.trackedUploads.clear();
    this.trackedPulls.clear();
    this.stopPolling();
    this.emit();
  }

  public async enqueueUpload(studies: { accession: string; patientName?: string; modality?: string }[], nodeId?: string): Promise<boolean> {
    if (!studies || studies.length === 0) return false;
    this.activeNodeId = nodeId || this.activeNodeId;

    for (const st of studies) {
      this.trackedUploads.set(st.accession, {
        accession: st.accession, patientName: st.patientName || 'Patient',
        modality: st.modality || 'MR', status: 'pending', detail: 'Queued for Cloud S3 upload',
      });
    }
    this.renderGroup(this.uploadJobId, 'Clinic Node Cloud Upload (S3)', this.trackedUploads, 'cases');
    this.emit();

    try {
      const res = await fetch('/api/pacs/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: studies.map((s) => s.accession), nodeId: this.activeNodeId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to dispatch upload');
    } catch (err: any) {
      notify.error(err.message || 'Error communicating with clinic node');
      studies.forEach((s) => {
        const item = this.trackedUploads.get(s.accession);
        if (item) { item.status = 'failed'; item.detail = err.message; }
      });
      this.renderGroup(this.uploadJobId, 'Clinic Node Cloud Upload (S3)', this.trackedUploads, 'cases');
      this.emit();
      return false;
    }

    this.ensurePolling();
    return true;
  }

  public async enqueuePull(studies: { accession: string; patientName?: string; modality?: string }[], nodeId?: string): Promise<boolean> {
    if (!studies || studies.length === 0) return false;
    this.activeNodeId = nodeId || this.activeNodeId;

    for (const st of studies) {
      this.trackedPulls.set(st.accession, {
        accession: st.accession, patientName: st.patientName || 'Patient',
        modality: st.modality || 'MR', status: 'pending', detail: 'Requesting C-GET from Hospital PACS',
      });
    }
    this.renderGroup(this.pullJobId, 'Hospital PACS C-GET Retrieval', this.trackedPulls, 'studies');
    this.emit();

    try {
      for (const st of studies) {
        await fetch('/api/pacs/hospital-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accession: st.accession, modality: st.modality || 'MR' }),
        });
      }
    } catch { notify.error('Error dispatching C-GET request'); }

    this.ensurePolling();
    return true;
  }

  public async trackSettingsSave(nodeId: string, payload: any, dispatchFn: (action: string, p: any) => Promise<any>): Promise<boolean> {
    const target = nodeId || this.activeNodeId, jobId = 'clinic-node-settings-sync', dispatchTime = Date.now();
    notify.progress({
      id: jobId, title: 'Clinic Node Policies & Settings', current: 1, total: 2,
      statusText: `Pushing policies to ${target} (Session 0)...`, unit: 'node',
    });

    try {
      await dispatchFn('save-all-settings', payload);
    } catch (err: any) {
      notify.dismiss(jobId);
      notify.error(err.message || 'Failed saving settings to relay');
      return false;
    }

    let ack = false;
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const res = await fetch(`/api/clinic-node?nodeId=${encodeURIComponent(target)}`);
        if (res.ok) {
          const { telemetry } = await res.json();
          const hb = telemetry?.lastHeartbeat ? new Date(telemetry.lastHeartbeat).getTime() : 0;
          if (hb >= dispatchTime - 2000) { ack = true; break; }
        }
      } catch {}
    }

    notify.progress({
      id: jobId, title: 'Clinic Node Policies & Settings', current: 2, total: 2, completed: true,
      statusText: ack ? `Policies applied on ${target} (Session 0)` : `Policies queued on relay; awaiting ${target} check-in`, unit: 'node',
    });
    setTimeout(() => notify.dismiss(jobId), 5000);
    return true;
  }

  public syncWithTelemetry(telemetry?: ClinicNodeTelemetry | null) {
    if (!telemetry) return;
    let uploadChanged = false, pullChanged = false;

    if (this.trackedUploads.size > 0) {
      const syncedAccs = new Set((telemetry.syncedStudies || []).map((s: any) => String(s.accession || s.id).toUpperCase()));
      const activeUp = telemetry.activeUpload, qAccs = new Set((telemetry.uploadQueue || []).map((q: any) => String(q.accession || q).toUpperCase()));

      Array.from(this.trackedUploads.entries()).forEach(([acc, item]) => {
        const upper = acc.toUpperCase();
        if (syncedAccs.has(upper)) {
          if (item.status !== 'success') { item.status = 'success'; item.detail = 'Uploaded & Synced to Cloud S3'; uploadChanged = true; }
        } else if (activeUp && String(activeUp.accession).toUpperCase() === upper) {
          item.status = 'saving';
          item.detail = `Uploading: ${activeUp.completedSlices || 0}/${activeUp.totalSlices || 0} slices (${activeUp.progressPercent || 0}%)`;
          uploadChanged = true;
        } else if (qAccs.has(upper) || item.status === 'pending') {
          item.detail = 'Waiting in Clinic PC upload queue';
        }
      });
      if (uploadChanged) this.renderGroup(this.uploadJobId, 'Clinic Node Cloud Upload (S3)', this.trackedUploads, 'cases');
    }

    if (this.trackedPulls.size > 0) {
      const localAccs = new Map((telemetry.localStudies || []).map((s: any) => [String(s.accession).toUpperCase(), s]));
      const activeDown = telemetry.activeDownload;

      Array.from(this.trackedPulls.entries()).forEach(([acc, item]) => {
        const upper = acc.toUpperCase(), local = localAccs.get(upper) as any;
        if (local && (local.sliceCount || 0) > 0) {
          if (item.status !== 'success') { item.status = 'success'; item.detail = `Retrieved ${local.sliceCount} slices into Sandbox`; pullChanged = true; }
        } else if (activeDown && String(activeDown.accession).toUpperCase() === upper) {
          item.status = 'saving';
          item.detail = `Downloading: ${activeDown.downloadedSlices || 0}/${activeDown.totalSlices || 0} slices`;
          pullChanged = true;
        }
      });
      if (pullChanged) this.renderGroup(this.pullJobId, 'Hospital PACS C-GET Retrieval', this.trackedPulls, 'studies');
    }

    if (uploadChanged || pullChanged) this.emit();
  }

  private renderGroup(jobId: string, title: string, map: Map<string, TrackedStudyItem>, unit: string) {
    const items = Array.from(map.values());
    if (items.length === 0) return;
    const total = items.length, completed = items.filter((i) => i.status === 'success').length, failed = items.filter((i) => i.status === 'failed').length;
    const isDone = completed + failed >= total;
    const notifItems: ProgressItemDetail[] = items.map((it) => ({
      id: it.accession, label: it.patientName, secondary: `${it.accession} · ${it.detail || ''}`, status: it.status,
    }));
    const active = items.find((i) => i.status === 'saving');
    const statusText = isDone ? `All ${completed} ${unit} completed.` : active ? `${active.patientName}: ${active.detail}` : `Queued ${total} ${unit} on Clinic PC...`;

    notify.progress({
      id: jobId, title, current: completed, total,
      statusText, unit, items: notifItems, completed: isDone,
    });

    if (isDone) {
      setTimeout(() => { map.clear(); notify.dismiss(jobId); this.emit(); }, 6000);
    }
  }

  public ensurePolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    const poll = async () => {
      const hasActive = this.trackedUploads.size > 0 || this.trackedPulls.size > 0;
      try {
        const res = await fetch(`/api/clinic-node?nodeId=${encodeURIComponent(this.activeNodeId)}`);
        if (res.ok) {
          const { telemetry } = await res.json();
          this.syncWithTelemetry(telemetry);
        }
      } catch {}
      if (hasActive) {
        this.pollTimer = setTimeout(poll, 3000);
      } else {
        this.isPolling = false;
        this.pollTimer = null;
      }
    };
    poll();
  }

  public stopPolling() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.isPolling = false;
  }
}

export const clinicTaskTracker = new ClinicTaskTrackerService();
