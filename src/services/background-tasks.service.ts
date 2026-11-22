// Layer 2 (Domain/Services): Centralized Reactive Background Task Store & Engine
// Strict File Size Invariant: Target < 250 lines

import {
  BackgroundTask,
  TaskItemDetail,
  TaskStatus,
  TaskType,
} from './background-tasks.types';

const STORAGE_KEY = 'radsuite:background_tasks:v1';
const MAX_TASKS_SAVED = 50;

type Listener = () => void;
type CancelHandler = () => void;
type ResumeHandler = (task: BackgroundTask) => Promise<boolean>;

class BackgroundTasksService {
  private tasks: BackgroundTask[] = [];
  private listeners: Set<Listener> = new Set();
  private cancelHandlers: Map<string, CancelHandler> = new Map();
  private resumeHandlers: Map<string, ResumeHandler> = new Map();
  private isHydrated = false;

  constructor() {
    this.hydrateFromStorage();
  }

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): BackgroundTask[] => this.tasks;

  private emit(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Task listener error:', err);
      }
    });
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized = JSON.stringify(this.tasks.slice(0, MAX_TASKS_SAVED));
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {}
  }

  private hydrateFromStorage(): void {
    if (this.isHydrated || typeof localStorage === 'undefined') return;
    this.isHydrated = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: BackgroundTask[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      // Detect tasks that were running when browser reloaded/unloaded
      this.tasks = parsed.map((t) => {
        if (t.status === 'running' || t.status === 'pending') {
          return {
            ...t,
            status: 'interrupted' as TaskStatus,
            statusText: `Interrupted by page reload (${t.current}/${t.total} ${t.unit || 'items'} completed)`,
            canResume: true,
          };
        }
        return t;
      });
      this.emit();
    } catch {}
  }

  public register(taskDef: Partial<BackgroundTask> & { id: string; title: string; total: number }): BackgroundTask {
    const total = Math.max(1, taskDef.total);
    const current = Math.min(Math.max(0, taskDef.current || 0), total);
    const progressPercent = Math.round((current / total) * 100);

    const task: BackgroundTask = {
      id: taskDef.id,
      type: taskDef.type || 'generic',
      title: taskDef.title,
      status: taskDef.status || 'running',
      current,
      total,
      progressPercent,
      unit: taskDef.unit || 'cases',
      statusText: taskDef.statusText || 'Initializing task...',
      items: taskDef.items || [],
      startedAt: taskDef.startedAt || new Date().toISOString(),
      canStop: taskDef.canStop ?? true,
      canResume: taskDef.canResume ?? false,
      userId: taskDef.userId,
      userName: taskDef.userName,
    };

    const existingIdx = this.tasks.findIndex((t) => t.id === task.id);
    if (existingIdx >= 0) {
      this.tasks = [
        task,
        ...this.tasks.slice(0, existingIdx),
        ...this.tasks.slice(existingIdx + 1),
      ];
    } else {
      this.tasks = [task, ...this.tasks];
    }

    this.persist();
    this.emit();
    return task;
  }

  public updateProgress(id: string, updates: Partial<BackgroundTask>): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const currentItem = this.tasks[idx];
    const total = updates.total !== undefined ? Math.max(1, updates.total) : currentItem.total;
    const current = updates.current !== undefined
      ? Math.min(Math.max(0, updates.current), total)
      : currentItem.current;
    const progressPercent = Math.round((current / total) * 100);

    const updated: BackgroundTask = {
      ...currentItem,
      ...updates,
      current,
      total,
      progressPercent,
      items: updates.items !== undefined ? updates.items : currentItem.items,
      completedAt:
        updates.status === 'completed' || updates.status === 'failed' || updates.status === 'stopped'
          ? updates.completedAt || new Date().toISOString()
          : currentItem.completedAt,
    };

    this.tasks = [...this.tasks.slice(0, idx), updated, ...this.tasks.slice(idx + 1)];
    this.persist();
    this.emit();
  }

  public registerCancelHandler(id: string, handler: CancelHandler): void {
    this.cancelHandlers.set(id, handler);
  }

  public registerResumeHandler(type: TaskType, handler: ResumeHandler): void {
    this.resumeHandlers.set(type, handler);
  }

  public stopTask(id: string): boolean {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    const task = this.tasks[idx];
    if (task.status !== 'running' && task.status !== 'pending') return false;

    const handler = this.cancelHandlers.get(id);
    if (handler) {
      try {
        handler();
      } catch (err) {
        console.error(`Cancel handler error for task ${id}:`, err);
      }
    }

    const stoppedItems: TaskItemDetail[] | undefined = task.items?.map((it) =>
      it.status === 'pending' || it.status === 'saving'
        ? { ...it, status: 'stopped', detail: 'Stopped by user' }
        : it
    );

    const updated: BackgroundTask = {
      ...task,
      status: 'stopped',
      statusText: `Stopped by user at ${task.current}/${task.total} ${task.unit}`,
      completedAt: new Date().toISOString(),
      items: stoppedItems,
      canResume: true,
    };

    this.tasks = [...this.tasks.slice(0, idx), updated, ...this.tasks.slice(idx + 1)];
    this.cancelHandlers.delete(id);
    this.persist();
    this.emit();
    return true;
  }

  public async resumeTask(id: string): Promise<boolean> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return false;
    const handler = this.resumeHandlers.get(task.type);
    if (!handler) return false;

    this.updateProgress(id, {
      status: 'running',
      statusText: `Resuming remaining items...`,
    });
    return handler(task);
  }

  public completeTask(id: string, options?: { error?: string }): void {
    const status: TaskStatus = options?.error ? 'failed' : 'completed';
    this.updateProgress(id, {
      status,
      error: options?.error,
      completedAt: new Date().toISOString(),
    });
    this.cancelHandlers.delete(id);
  }

  public dismissTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.cancelHandlers.delete(id);
    this.persist();
    this.emit();
  }

  public clearFinished(): void {
    this.tasks = this.tasks.filter((t) => t.status === 'running' || t.status === 'pending');
    this.persist();
    this.emit();
  }

  // Universal Task Bridge: Automatically converts notify.progress calls into tracked background tasks
  public syncFromProgress(prog: {
    id: string;
    title: string;
    current: number;
    total: number;
    statusText?: string;
    unit?: string;
    items?: any[];
    completed?: boolean;
    canStop?: boolean;
  }): void {
    const existing = this.tasks.find((t) => t.id === prog.id);
    if (!existing) {
      this.register({
        id: prog.id,
        title: prog.title,
        current: prog.current,
        total: prog.total,
        statusText: prog.statusText,
        unit: prog.unit || 'cases',
        items: prog.items,
        status: prog.completed ? 'completed' : 'running',
        canStop: prog.canStop ?? true,
      });
    } else {
      this.updateProgress(prog.id, {
        current: prog.current,
        total: prog.total,
        statusText: prog.statusText,
        items: prog.items,
        status: prog.completed ? 'completed' : existing.status === 'stopped' ? 'stopped' : 'running',
      });
    }
  }
}

export const backgroundTasks = new BackgroundTasksService();
