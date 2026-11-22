// Layer 2 (Domain/Services): Fire-and-Forget HMIS Background Dispatch Queue
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import { notify, ProgressItemDetail } from '@/services/notification.service';
import { backgroundTasks } from '@/services/background-tasks.service';
import { isUuid, sanitizeMrn } from '@/lib/mrn-security';
import type {
  HmisDraftItem,
  HmisBatchItemRecord,
  QueueOptions,
} from './hmis-background-queue.types';

export type { HmisDraftItem, HmisBatchItemRecord, QueueOptions };

class HmisBackgroundQueueService {
  private queue: HmisDraftItem[] = [];
  private isProcessing = false;
  private currentJobId = 'hmis-bg-queue';
  private currentDoctorName = '';
  private currentAction: 'draft' | 'submit' = 'draft';
  private deepVerify = false;
  private originPath = '';
  private results: HmisBatchItemRecord[] = [];
  private isModalOpen = false;
  private isCancelled = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    backgroundTasks.registerResumeHandler('hmis_batch_draft', async (task) => {
      const pendingItems = (task.items || [])
        .filter((i) => i.status === 'stopped' || i.status === 'failed' || i.status === 'pending')
        .map((i) => ({ accessionNumber: i.id, patientName: i.label }));
      if (pendingItems.length === 0) return false;
      this.enqueue(pendingItems as HmisDraftItem[]);
      return true;
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit() { this.listeners.forEach((l) => l()); }
  public getResults(): HmisBatchItemRecord[] { return this.results; }
  public isResultsModalVisible(): boolean { return this.isModalOpen; }
  public openResultsModal() { this.isModalOpen = true; this.emit(); }

  public closeResultsModal(purgeScreenshots = true) {
    this.isModalOpen = false;
    this.emit();
    if (purgeScreenshots) {
      this.purgeEphemeralScreenshots(0).catch(() => {});
    }
  }

  public async purgeEphemeralScreenshots(olderThanMinutes = 20): Promise<void> {
    try {
      await fetch(`/api/hmis/screenshot/purge?olderThanMinutes=${olderThanMinutes}`, { method: 'DELETE' });
    } catch {}
  }

  public stop(): void {
    if (!this.isProcessing) return;
    this.isCancelled = true;
    for (const q of this.queue) {
      const idx = this.results.findIndex((r) => r.accessionNumber === q.accessionNumber);
      if (idx >= 0 && this.results[idx].status === 'pending') {
        this.results[idx].status = 'stopped';
        this.results[idx].error = 'Stopped by user';
      }
    }
    this.queue = [];
    this.emit();
  }

  public enqueue(items: HmisDraftItem[], options?: QueueOptions): string {
    if (!items || items.length === 0) return this.currentJobId;

    this.isCancelled = false;
    backgroundTasks.registerCancelHandler(this.currentJobId, () => this.stop());
    this.queue.push(...items);
    this.currentDoctorName = options?.doctorName || this.currentDoctorName;
    this.currentAction = options?.action || 'draft';
    this.deepVerify = Boolean(options?.deepVerify);
    this.originPath = options?.originPath || (typeof window !== 'undefined' ? window.location.pathname : '');

    // Reset results ledger for new run
    this.results = items.map((it) => ({
      accessionNumber: it.accessionNumber,
      patientName: it.patientName || 'Unknown Patient',
      patientMrn: sanitizeMrn(it.patientMrn) || (!isUuid(it.patientId) ? it.patientId : undefined),
      scanType: it.scanType || it.studyDescription || 'Radiology Exam',
      modality: it.modality || 'MRI',
      status: 'pending',
    }));
    this.emit();

    const actionText = this.currentAction === 'submit' ? 'HMIS final submission' : 'HMIS draft dispatch';
    notify.info(
      items.length === 1
        ? `Queued ${items[0].accessionNumber} for background ${actionText}`
        : `Queued ${items.length} cases for background ${actionText}.`
    );

    if (!this.isProcessing) {
      this.processQueue(options);
    }

    return this.currentJobId;
  }

  private async fetchReportData(item: HmisDraftItem) {
    if (item.findings && item.findings.trim().length > 0) {
      return {
        findings: item.findings,
        impression: item.impression || '',
        technique: item.technique || '',
        clinicalHistory: item.clinicalHistory || '',
        studyData: null,
      };
    }

    for (const q of [item.studyId, item.accessionNumber]) {
      if (!q) continue;
      try {
        const res = await fetch(`/api/reports?${item.studyId ? 'studyId' : 'accession'}=${encodeURIComponent(q)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.report?.findings) {
            return {
              findings: json.report.findings,
              impression: json.report.impression || '',
              technique: json.report.technique || '',
              clinicalHistory: json.report.clinicalHistory || json.study?.clinicalHistory || '',
              studyData: json.study || null,
              patientData: json.patient || null,
            };
          }
        }
      } catch {}
    }

    return { findings: '', impression: '', technique: '', clinicalHistory: '', studyData: null, patientData: null };
  }

  private async processQueue(options?: QueueOptions): Promise<void> {
    this.isProcessing = true;
    const initialTotal = this.queue.length;
    let completedCount = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    const notifItems: ProgressItemDetail[] = this.results.map((r) => ({
      id: r.accessionNumber,
      label: r.patientName,
      secondary: r.accessionNumber,
      status: 'pending',
    }));

    notify.progress({
      id: this.currentJobId,
      title: this.currentAction === 'submit' ? 'HMIS Report Final Submission' : 'HMIS Draft Dispatch',
      current: 0,
      total: initialTotal,
      statusText: `Preparing ${initialTotal} case(s)...`,
      unit: 'cases',
      items: notifItems,
    });

    while (this.queue.length > 0) {
      if (this.isCancelled) break;
      const item = this.queue.shift()!;
      completedCount++;
      const resIdx = this.results.findIndex((r) => r.accessionNumber === item.accessionNumber);
      if (resIdx >= 0) {
        this.results[resIdx].status = 'saving';
        notifItems[resIdx].status = 'saving';
        this.emit();
      }

      notify.updateProgress(this.currentJobId, {
        current: completedCount,
        total: Math.max(completedCount + this.queue.length, initialTotal),
        statusText: `Saving: ${item.patientName || item.accessionNumber} (${completedCount}/${completedCount + this.queue.length})...`,
        items: [...notifItems],
      });

      options?.onProgress?.(completedCount, completedCount + this.queue.length);
      const startTime = Date.now();

      try {
        const { findings, impression, technique, clinicalHistory: fetchedHistory, studyData, patientData } = await this.fetchReportData(item);

        if (!findings || findings.trim().length === 0) {
          skipped++;
          if (resIdx >= 0) {
            this.results[resIdx].status = 'skipped';
            this.results[resIdx].error = 'No report findings entered';
            notifItems[resIdx].status = 'skipped';
            this.emit();
          }
          notify.warning(`Skipped ${item.accessionNumber}: No report findings found.`);
          continue;
        }

        const mrn =
          sanitizeMrn(item.patientMrn) ||
          sanitizeMrn(patientData?.mrNumber) ||
          sanitizeMrn(patientData?.mrn) ||
          sanitizeMrn(studyData?.patientMrn) ||
          (item.patientId && !isUuid(item.patientId) ? item.patientId : '');
        const scanType = item.scanType || studyData?.scanType || item.studyDescription;
        const modality = item.modality || studyData?.modality || 'MRI';
        const bodyPart = item.bodyPart || studyData?.bodyPart;
        const cpt = item.hmisCpt || studyData?.hmisCpt;
        const investigationId = item.hmisInvestigationId || studyData?.hmisInvestigationId;
        const effectiveHistory = (fetchedHistory && fetchedHistory.trim().length > 0)
          ? fetchedHistory
          : (item.clinicalHistory || studyData?.clinicalHistory || '');

        const targetEndpoint = this.currentAction === 'submit' ? '/api/hmis/submit' : '/api/hmis/draft';
        const res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientMrn: mrn,
            patientName: item.patientName || patientData?.fullName || studyData?.patientName,
            accessionNumber: item.accessionNumber,
            scanType,
            modality,
            bodyPart,
            cpt,
            investigationId,
            technique: technique || `${modality} examination performed.`,
            findings,
            impression: impression || '',
            clinicalHistory: effectiveHistory,
            pgrName: this.currentDoctorName,
            consultantName: '',
            deepVerify: this.deepVerify,
          }),
        });

        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
        const data = await res.json();

        if (res.ok && data.success) {
          succeeded++;
          if (resIdx >= 0) {
            this.results[resIdx].status = 'success';
            this.results[resIdx].verified = data.data?.verified;
            this.results[resIdx].auditScreenshot = data.data?.auditScreenshot;
            this.results[resIdx].elapsedSeconds = elapsedSec;
            this.results[resIdx].savedAt = new Date().toISOString();
            notifItems[resIdx].status = 'success';
            this.emit();
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('radsuite:case-updated', {
                detail: { accessionNumber: item.accessionNumber, hmisStatus: 'draft' },
              })
            );
          }
        } else {
          failed++;
          const errText = data.error || 'Gateway rejected draft';
          if (resIdx >= 0) {
            this.results[resIdx].status = 'failed';
            this.results[resIdx].error = errText;
            this.results[resIdx].elapsedSeconds = elapsedSec;
            notifItems[resIdx].status = 'failed';
            this.emit();
          }
          notify.error(`Failed ${item.accessionNumber}: ${errText}`);
        }
      } catch (err: any) {
        failed++;
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
        if (resIdx >= 0) {
          this.results[resIdx].status = 'failed';
          this.results[resIdx].error = err.message;
          this.results[resIdx].elapsedSeconds = elapsedSec;
          notifItems[resIdx].status = 'failed';
          this.emit();
        }
        notify.error(`Network error on ${item.accessionNumber}: ${err.message}`);
      }

      if (this.queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (this.isCancelled) {
      this.isProcessing = false;
      notify.updateProgress(this.currentJobId, {
        statusText: `Stopped: ${succeeded} saved, ${failed} failed.`,
        completed: true,
        items: [...notifItems],
      });
      return;
    }

    this.isProcessing = false;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isSameScreen = currentPath === this.originPath;

    if (failed === 0 && skipped === 0 && succeeded > 0) {
      notify.success(`All ${succeeded} drafts successfully saved to Punjab HMIS portal.`);
    } else if (failed > 0) {
      notify.warning(`HMIS batch completed: ${succeeded} saved, ${failed} failed.`);
    }

    if (isSameScreen) {
      // Clinician stayed on same screen: open full Results Modal automatically
      notify.dismiss(this.currentJobId);
      this.openResultsModal();
    } else {
      // Clinician navigated away: keep floating card with 'View Results' button to prevent interruption
      notify.updateProgress(this.currentJobId, {
        current: initialTotal,
        total: initialTotal,
        completed: true,
        statusText: `Completed: ${succeeded} saved${failed > 0 ? `, ${failed} failed` : ''}.`,
        actionLabel: 'View Results',
        onAction: () => this.openResultsModal(),
        items: [...notifItems],
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('radsuite:worklist-refresh'));
    }

    options?.onComplete?.({ succeeded, failed, skipped, results: this.results });
  }
}

export const hmisBackgroundQueue = new HmisBackgroundQueueService();
export const enqueueHmisDrafts = (items: HmisDraftItem[], options?: QueueOptions) =>
  hmisBackgroundQueue.enqueue(items, options);
