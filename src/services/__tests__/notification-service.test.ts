import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from '../notification.service';

describe('Notification & Background Progress Service', () => {
  beforeEach(() => {
    notify.clearAll();
    vi.restoreAllMocks();
  });

  it('adds success, error, warning, and info toasts', () => {
    const sId = notify.success('Draft saved successfully');
    const eId = notify.error('Failed to communicate with gateway');
    const wId = notify.warning('Microphone not detected');
    const iId = notify.info('Clinical summary copied');

    const list = notify.getSnapshot();
    expect(list).toHaveLength(4);
    expect(list[0]).toMatchObject({ id: sId, type: 'success', message: 'Draft saved successfully' });
    expect(list[1]).toMatchObject({ id: eId, type: 'error', message: 'Failed to communicate with gateway' });
    expect(list[2]).toMatchObject({ id: wId, type: 'warning', message: 'Microphone not detected' });
    expect(list[3]).toMatchObject({ id: iId, type: 'info', message: 'Clinical summary copied' });
  });

  it('replaces existing toast if id is reused', () => {
    notify.info('Initial message', { id: 'fixed-toast' });
    expect(notify.getSnapshot()).toHaveLength(1);
    expect((notify.getSnapshot()[0] as any).message).toBe('Initial message');

    notify.success('Updated message', { id: 'fixed-toast' });
    expect(notify.getSnapshot()).toHaveLength(1);
    expect((notify.getSnapshot()[0] as any).message).toBe('Updated message');
    expect(notify.getSnapshot()[0].type).toBe('success');
  });

  it('correctly maps string description into ToastOptions', () => {
    notify.error('Failed saving report', 'Study accession 192611004877 does not exist');
    const list = notify.getSnapshot();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      type: 'error',
      message: 'Failed saving report',
      description: 'Study accession 192611004877 does not exist',
    });
  });

  it('manages background progress lifecycle with live percent calculation', () => {
    const progId = notify.progress({
      id: 'hmis-batch-1',
      title: 'Saving HMIS Drafts',
      current: 1,
      total: 4,
      statusText: 'Saving case 1 of 4...',
    });

    let items = notify.getSnapshot();
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.type).toBe('progress');
    if (item.type === 'progress') {
      expect(item.id).toBe(progId);
      expect(item.progressPercent).toBe(25);
      expect(item.statusText).toBe('Saving case 1 of 4...');
    }

    // Update progress to 3/4
    notify.updateProgress('hmis-batch-1', {
      current: 3,
      statusText: 'Saving case 3 of 4...',
    });

    items = notify.getSnapshot();
    const updated = items[0];
    if (updated.type === 'progress') {
      expect(updated.progressPercent).toBe(75);
      expect(updated.current).toBe(3);
      expect(updated.statusText).toBe('Saving case 3 of 4...');
    }
  });

  it('notifies subscribers on state mutations and allows unsubscription', () => {
    const listener = vi.fn();
    const unsubscribe = notify.subscribe(listener);

    notify.info('Toast 1');
    expect(listener).toHaveBeenCalledTimes(1);

    notify.info('Toast 2');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    notify.info('Toast 3');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('dismisses individual notifications and clears all', () => {
    const id1 = notify.info('First');
    const id2 = notify.info('Second');

    expect(notify.getSnapshot()).toHaveLength(2);

    notify.dismiss(id1);
    expect(notify.getSnapshot()).toHaveLength(1);
    expect(notify.getSnapshot()[0].id).toBe(id2);

    notify.clearAll();
    expect(notify.getSnapshot()).toHaveLength(0);
  });
});
