// Layer 2 (Domain/Services): Centralized Reactive Notification & Background Progress Store
// Strict File Size Invariant: Target < 250 lines, max 300 lines

import { backgroundTasks } from './background-tasks.service';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'progress';

export interface ToastOptions {
  id?: string;
  durationMs?: number;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export type ToastOptionInput = ToastOptions | string;

export interface ProgressItemDetail {
  id: string;
  label: string;
  secondary?: string;
  status: 'pending' | 'saving' | 'success' | 'failed' | 'skipped';
}

export interface ProgressOptions {
  id?: string;
  title: string;
  current: number;
  total: number;
  statusText?: string;
  unit?: string;
  items?: ProgressItemDetail[];
  actionLabel?: string;
  onAction?: () => void;
  completed?: boolean;
}

export interface BaseNotification {
  id: string;
  createdAt: number;
}

export interface ToastNotification extends BaseNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

export interface ProgressNotification extends BaseNotification {
  type: 'progress';
  title: string;
  current: number;
  total: number;
  progressPercent: number;
  statusText?: string;
  unit?: string;
  items?: ProgressItemDetail[];
  actionLabel?: string;
  onAction?: () => void;
  completed?: boolean;
}

export type AppNotification = ToastNotification | ProgressNotification;
type Listener = () => void;

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Set<Listener> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): AppNotification[] => this.notifications;

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Notification listener error:', err);
      }
    });
  }

  private generateId(prefix = 'notif'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  private addToast(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    options?: ToastOptionInput
  ): string {
    const opts: ToastOptions | undefined =
      typeof options === 'string' ? { description: options } : options;
    const id = opts?.id || this.generateId(type);
    const durationMs = opts?.durationMs ?? (type === 'error' ? 8000 : 4000);

    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }

    const toast: ToastNotification = {
      id,
      type,
      message,
      description: opts?.description,
      actionLabel: opts?.actionLabel,
      onAction: opts?.onAction,
      durationMs,
      createdAt: Date.now(),
    };

    const index = this.notifications.findIndex((n) => n.id === id);
    if (index >= 0) {
      this.notifications = [
        ...this.notifications.slice(0, index),
        toast,
        ...this.notifications.slice(index + 1),
      ];
    } else {
      this.notifications = [...this.notifications, toast];
    }

    if (durationMs > 0 && typeof window !== 'undefined') {
      const timer = setTimeout(() => this.dismiss(id), durationMs);
      this.timers.set(id, timer);
    }

    this.notifyListeners();
    return id;
  }

  public success(message: string, options?: ToastOptionInput): string {
    return this.addToast('success', message, options);
  }

  public error(message: string, options?: ToastOptionInput): string {
    return this.addToast('error', message, options);
  }

  public warning(message: string, options?: ToastOptionInput): string {
    return this.addToast('warning', message, options);
  }

  public info(message: string, options?: ToastOptionInput): string {
    return this.addToast('info', message, options);
  }

  public progress(options: ProgressOptions): string {
    const id = options.id || this.generateId('progress');
    const safeTotal = Math.max(1, options.total);
    const safeCurrent = Math.min(Math.max(0, options.current), safeTotal);
    const progressPercent = Math.round((safeCurrent / safeTotal) * 100);

    const progressItem: ProgressNotification = {
      id,
      type: 'progress',
      title: options.title,
      current: safeCurrent,
      total: safeTotal,
      progressPercent,
      statusText: options.statusText,
      unit: options.unit || 'cases',
      items: options.items,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      completed: options.completed,
      createdAt: Date.now(),
    };

    const index = this.notifications.findIndex((n) => n.id === id);
    if (index >= 0) {
      this.notifications = [
        ...this.notifications.slice(0, index),
        progressItem,
        ...this.notifications.slice(index + 1),
      ];
    } else {
      this.notifications = [...this.notifications, progressItem];
    }

    this.notifyListeners();
    try {
      backgroundTasks.syncFromProgress({
        id,
        title: options.title,
        current: safeCurrent,
        total: safeTotal,
        statusText: options.statusText,
        unit: options.unit,
        items: options.items,
        completed: options.completed,
      });
    } catch {}
    return id;
  }

  public updateProgress(id: string, updates: Partial<Omit<ProgressOptions, 'id'>>): void {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) return;

    const currentItem = this.notifications[index];
    if (currentItem.type !== 'progress') return;

    const total = updates.total !== undefined ? Math.max(1, updates.total) : currentItem.total;
    const current =
      updates.current !== undefined
        ? Math.min(Math.max(0, updates.current), total)
        : currentItem.current;
    const progressPercent = Math.round((current / total) * 100);

    const updatedItem: ProgressNotification = {
      ...currentItem,
      title: updates.title ?? currentItem.title,
      current,
      total,
      progressPercent,
      statusText: updates.statusText !== undefined ? updates.statusText : currentItem.statusText,
      unit: updates.unit ?? currentItem.unit,
      items: updates.items !== undefined ? updates.items : currentItem.items,
      actionLabel: updates.actionLabel !== undefined ? updates.actionLabel : currentItem.actionLabel,
      onAction: updates.onAction !== undefined ? updates.onAction : currentItem.onAction,
      completed: updates.completed !== undefined ? updates.completed : currentItem.completed,
    };

    this.notifications = [
      ...this.notifications.slice(0, index),
      updatedItem,
      ...this.notifications.slice(index + 1),
    ];

    this.notifyListeners();
    try {
      backgroundTasks.syncFromProgress({
        id,
        title: updatedItem.title,
        current: updatedItem.current,
        total: updatedItem.total,
        statusText: updatedItem.statusText,
        unit: updatedItem.unit,
        items: updatedItem.items,
        completed: updatedItem.completed,
      });
    } catch {}
  }

  public dismiss = (id: string): void => {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
    const filtered = this.notifications.filter((n) => n.id !== id);
    if (filtered.length !== this.notifications.length) {
      this.notifications = filtered;
      this.notifyListeners();
    }
  };

  public clearAll = (): void => {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.notifications = [];
    this.notifyListeners();
  };
}

export const notify = new NotificationService();
