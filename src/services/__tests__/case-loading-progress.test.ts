import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from '../notification.service';
import {
  startCaseLoadingProgress,
  updateCaseLoadingProgress,
  finishCaseLoadingProgress,
  dismissCaseLoadingProgress,
  CASE_LOADING_PROGRESS_ID,
} from '../case-loading-progress.service';

describe('Case Loading Progress Service', () => {
  beforeEach(() => {
    notify.clearAll();
  });

  it('starts a single progress bar using NotificationService with predictable ID', () => {
    startCaseLoadingProgress('ACC-12345', 'MR');

    const notifs = notify.getSnapshot();
    const progressItem = notifs.find((n) => n.id === CASE_LOADING_PROGRESS_ID);

    expect(progressItem).toBeDefined();
    expect(progressItem?.type).toBe('progress');
    if (progressItem?.type === 'progress') {
      expect(progressItem.title).toContain('MR');
      expect(progressItem.title).toContain('ACC-12345');
      expect(progressItem.progressPercent).toBe(25);
    }
  });

  it('updates existing progress bar without spawning duplicate progress items', () => {
    startCaseLoadingProgress('ACC-12345', 'CT');
    updateCaseLoadingProgress(60, 'Buffering instances...');

    const notifs = notify.getSnapshot();
    const progressItems = notifs.filter((n) => n.id === CASE_LOADING_PROGRESS_ID);

    expect(progressItems).toHaveLength(1);
    if (progressItems[0]?.type === 'progress') {
      expect(progressItems[0].progressPercent).toBe(60);
      expect(progressItems[0].statusText).toBe('Buffering instances...');
      expect(progressItems[0].completed).toBeFalsy();
    }
  });

  it('marks progress as completed when reaching 100%', () => {
    startCaseLoadingProgress('ACC-12345', 'CT');
    finishCaseLoadingProgress('Case ready for reporting');

    const notifs = notify.getSnapshot();
    const progressItem = notifs.find((n) => n.id === CASE_LOADING_PROGRESS_ID);

    expect(progressItem).toBeDefined();
    if (progressItem?.type === 'progress') {
      expect(progressItem.progressPercent).toBe(100);
      expect(progressItem.completed).toBe(true);
      expect(progressItem.statusText).toBe('Case ready for reporting');
    }
  });

  it('dismisses case loading progress when explicitly called', () => {
    startCaseLoadingProgress('ACC-12345', 'CT');
    dismissCaseLoadingProgress();

    const notifs = notify.getSnapshot();
    const progressItem = notifs.find((n) => n.id === CASE_LOADING_PROGRESS_ID);
    expect(progressItem).toBeUndefined();
  });
});
