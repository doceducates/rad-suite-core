// Layer 2 (Domain/Services): Fire-and-Forget HMIS Batch Revert Service
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import { notify, ProgressItemDetail } from '@/services/notification.service';
import { backgroundTasks } from '@/services/background-tasks.service';
import type { PacsStudyResult } from '@/types/pacs';

export interface BatchRevertOptions {
  onComplete?: () => void;
  onProgress?: (current: number, total: number) => void;
}

export interface BatchRevertItemRecord {
  accessionNumber: string;
  patientName: string;
  patientMrn?: string;
  status: 'pending' | 'saving' | 'success' | 'failed';
  error?: string;
}

class HmisBatchRevertService {
  private isProcessing = false;
  private isCancelled = false;
  private currentJobId = 'hmis-batch-revert';

  public stop(): void {
    if (!this.isProcessing) return;
    this.isCancelled = true;
    this.isProcessing = false;
  }

  public async enqueue(
    cases: PacsStudyResult[],
    options?: BatchRevertOptions
  ): Promise<string> {
    if (!cases || cases.length === 0) return this.currentJobId;

    if (this.isProcessing) {
      notify.warning('Another HMIS revert operation is currently in progress. Please wait.');
      return this.currentJobId;
    }

    this.isProcessing = true;
    this.isCancelled = false;
    backgroundTasks.registerCancelHandler(this.currentJobId, () => this.stop());
    const total = cases.length;
    let completedCount = 0;
    let succeeded = 0;
    let failed = 0;

    const notifItems: ProgressItemDetail[] = cases.map((c) => ({
      id: c.accessionNumber,
      label: c.patientName || 'Unknown Patient',
      secondary: c.accessionNumber,
      status: 'pending',
    }));

    notify.progress({
      id: this.currentJobId,
      title: 'HMIS Revert to Default',
      current: 0,
      total,
      statusText: `Preparing to revert ${total} case(s) in HMIS...`,
      unit: 'cases',
      items: notifItems,
    });

    try {
      for (const item of cases) {
        if (this.isCancelled) break;
        completedCount++;
        const itemIdx = notifItems.findIndex((it) => it.id === item.accessionNumber);
        if (itemIdx >= 0) {
          notifItems[itemIdx].status = 'saving';
        }

        notify.updateProgress(this.currentJobId, {
          current: completedCount,
          total,
          statusText: `Reverting: ${item.patientName || item.accessionNumber} (${completedCount}/${total})...`,
          items: [...notifItems],
        });

        options?.onProgress?.(completedCount, total);

        const mrn = item.patientMrn || item.patientId;
        const accession = item.accessionNumber;

        if (!mrn) {
          failed++;
          if (itemIdx >= 0) notifItems[itemIdx].status = 'failed';
          continue;
        }

        try {
          const res = await fetch('/api/hmis/revert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientMrn: mrn,
              accessionNumber: accession,
              moduleId: item.hmisInvestigationId ? String(item.hmisInvestigationId) : undefined,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success) {
            succeeded++;
            if (itemIdx >= 0) notifItems[itemIdx].status = 'success';
          } else {
            failed++;
            if (itemIdx >= 0) notifItems[itemIdx].status = 'failed';
          }
        } catch {
          failed++;
          if (itemIdx >= 0) notifItems[itemIdx].status = 'failed';
        }

        // Polite pacing: 600ms delay between calls to let gateway modal cleanly reset
        if (completedCount < total) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.isCancelled) {
        notify.updateProgress(this.currentJobId, {
          statusText: `Stopped: ${succeeded} reverted, ${failed} failed.`,
          items: [...notifItems],
          completed: true,
        });
        options?.onComplete?.();
        return this.currentJobId;
      }

      notify.updateProgress(this.currentJobId, {
        current: total,
        total,
        statusText: `Completed: ${succeeded} reverted, ${failed} failed.`,
        items: [...notifItems],
        completed: true,
      });

      if (failed === 0) {
        notify.success(`Successfully reverted ${succeeded} case(s) back to default empty state in HMIS.`);
      } else if (succeeded > 0) {
        notify.warning(`HMIS Revert finished: ${succeeded} reverted, ${failed} failed.`);
      } else {
        notify.error(`Failed to revert ${failed} case(s) in HMIS.`);
      }

      options?.onComplete?.();
    }

    return this.currentJobId;
  }
}

export const hmisBatchRevertService = new HmisBatchRevertService();

export function enqueueHmisBatchRevert(
  cases: PacsStudyResult[],
  options?: BatchRevertOptions
): Promise<string> {
  return hmisBatchRevertService.enqueue(cases, options);
}
