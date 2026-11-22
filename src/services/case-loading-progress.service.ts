// Layer 2: Case Opening Progress Tracker
// Manages a single unified progress bar using the centralized NotificationService

import { notify } from './notification.service';

export const CASE_LOADING_PROGRESS_ID = 'case-loading-progress';

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function startCaseLoadingProgress(accession: string, modality = 'Study'): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }

  notify.progress({
    id: CASE_LOADING_PROGRESS_ID,
    title: `Loading ${modality} (${accession})`,
    current: 25,
    total: 100,
    unit: '%',
    statusText: 'Initializing study sequences & viewport...',
  });
}

export function updateCaseLoadingProgress(percent: number, statusText?: string): void {
  notify.updateProgress(CASE_LOADING_PROGRESS_ID, {
    current: Math.min(100, Math.max(0, percent)),
    total: 100,
    statusText,
    completed: percent >= 100,
  });

  if (percent >= 100) {
    if (dismissTimer) clearTimeout(dismissTimer);
    if (typeof window !== 'undefined') {
      dismissTimer = setTimeout(() => {
        notify.dismiss(CASE_LOADING_PROGRESS_ID);
        dismissTimer = null;
      }, 1500);
    }
  }
}

export function finishCaseLoadingProgress(statusText = 'Case ready for diagnosis'): void {
  updateCaseLoadingProgress(100, statusText);
}

export function dismissCaseLoadingProgress(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  notify.dismiss(CASE_LOADING_PROGRESS_ID);
}
