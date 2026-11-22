import { describe, it, expect, beforeEach, vi } from 'vitest';
import { backgroundTasks } from '../background-tasks.service';
import { notify } from '../notification.service';

const mockStorage: Record<string, string> = {};
if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = v;
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
    key: () => null,
    length: 0,
  };
}

describe('Background Tasks Service & Universal Bridge', () => {
  beforeEach(() => {
    // Clear storage and tasks
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    backgroundTasks.clearFinished();
    const all = backgroundTasks.getSnapshot();
    all.forEach((t) => backgroundTasks.dismissTask(t.id));
  });

  it('registers a task with initial state and calculates progress percent', () => {
    const task = backgroundTasks.register({
      id: 'task-test-1',
      title: 'Batch HMIS Draft Dispatch',
      type: 'hmis_batch_draft',
      current: 2,
      total: 10,
      unit: 'cases',
    });

    expect(task.id).toBe('task-test-1');
    expect(task.progressPercent).toBe(20);
    expect(task.status).toBe('running');
    expect(task.canStop).toBe(true);

    const snapshot = backgroundTasks.getSnapshot();
    expect(snapshot.find((t) => t.id === 'task-test-1')).toBeDefined();
  });

  it('updates task progress and recalculates percentages dynamically', () => {
    backgroundTasks.register({
      id: 'task-test-2',
      title: 'PACS Study Retrieval',
      current: 0,
      total: 5,
    });

    backgroundTasks.updateProgress('task-test-2', {
      current: 3,
      statusText: 'Downloading slice 3 of 5...',
    });

    const task = backgroundTasks.getSnapshot().find((t) => t.id === 'task-test-2');
    expect(task?.current).toBe(3);
    expect(task?.progressPercent).toBe(60);
    expect(task?.statusText).toBe('Downloading slice 3 of 5...');
  });

  it('stops a running task and invokes registered cancel handler', () => {
    let cancelCalled = false;
    backgroundTasks.register({
      id: 'task-test-3',
      title: 'Cancellable Task',
      current: 1,
      total: 4,
      items: [
        { id: 'item-1', label: 'Case 1', status: 'success' },
        { id: 'item-2', label: 'Case 2', status: 'pending' },
        { id: 'item-3', label: 'Case 3', status: 'pending' },
      ],
    });

    backgroundTasks.registerCancelHandler('task-test-3', () => {
      cancelCalled = true;
    });

    const stopped = backgroundTasks.stopTask('task-test-3');
    expect(stopped).toBe(true);
    expect(cancelCalled).toBe(true);

    const task = backgroundTasks.getSnapshot().find((t) => t.id === 'task-test-3');
    expect(task?.status).toBe('stopped');
    expect(task?.items?.[0].status).toBe('success');
    expect(task?.items?.[1].status).toBe('stopped');
    expect(task?.items?.[2].status).toBe('stopped');
  });

  it('universal bridge auto-registers and syncs notify.progress calls', () => {
    const notifyId = notify.progress({
      id: 'task-bridge-1',
      title: 'S3 Study Mirror Ingestion',
      current: 1,
      total: 2,
      unit: 'studies',
      statusText: 'Syncing series...',
    });

    const task = backgroundTasks.getSnapshot().find((t) => t.id === notifyId);
    expect(task).toBeDefined();
    expect(task?.title).toBe('S3 Study Mirror Ingestion');
    expect(task?.current).toBe(1);
    expect(task?.total).toBe(2);

    notify.updateProgress(notifyId, {
      current: 2,
      completed: true,
      statusText: 'All studies synced.',
    });

    const updatedTask = backgroundTasks.getSnapshot().find((t) => t.id === notifyId);
    expect(updatedTask?.current).toBe(2);
    expect(updatedTask?.status).toBe('completed');
  });

  it('rehydrates interrupted tasks on page reload detection', () => {
    const savedState = [
      {
        id: 'task-reload-1',
        type: 'hmis_batch_draft',
        title: 'Interrupted HMIS Dispatch',
        status: 'running',
        current: 4,
        total: 10,
        unit: 'cases',
        progressPercent: 40,
        startedAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem('radsuite:background_tasks:v1', JSON.stringify(savedState));

    // Create a new instance to simulate page load
    const freshService = new (backgroundTasks.constructor as any)();
    const tasks = freshService.getSnapshot();
    const task = tasks.find((t: any) => t.id === 'task-reload-1');

    expect(task).toBeDefined();
    expect(task.status).toBe('interrupted');
    expect(task.canResume).toBe(true);
  });

  it('calls resume handler when resuming an interrupted task', async () => {
    let resumedTask: any = null;
    backgroundTasks.registerResumeHandler('hmis_batch_draft', async (task) => {
      resumedTask = task;
      return true;
    });

    backgroundTasks.register({
      id: 'task-resume-1',
      type: 'hmis_batch_draft',
      title: 'Drafts to Resume',
      status: 'stopped',
      current: 2,
      total: 5,
    });

    const res = await backgroundTasks.resumeTask('task-resume-1');
    expect(res).toBe(true);
    expect(resumedTask).toBeDefined();
    expect(resumedTask.id).toBe('task-resume-1');
  });

  it('prunes finished tasks and retains active tasks', () => {
    backgroundTasks.register({ id: 'active-1', title: 'Active', current: 0, total: 1, status: 'running' });
    backgroundTasks.register({ id: 'done-1', title: 'Done', current: 1, total: 1, status: 'completed' });
    backgroundTasks.register({ id: 'stopped-1', title: 'Stopped', current: 1, total: 2, status: 'stopped' });

    backgroundTasks.clearFinished();

    const remaining = backgroundTasks.getSnapshot();
    expect(remaining.some((t) => t.id === 'active-1')).toBe(true);
    expect(remaining.some((t) => t.id === 'done-1')).toBe(false);
    expect(remaining.some((t) => t.id === 'stopped-1')).toBe(false);
  });
});
