'use client';

// Layer 4 (Presentation Hook): React 19 useSyncExternalStore Hook for Notifications
// Strict File Size Invariant: Target < 50 lines

import { useSyncExternalStore } from 'react';
import { notify, AppNotification } from '@/services/notification.service';

const EMPTY_NOTIFICATIONS: AppNotification[] = [];

function getServerSnapshot(): AppNotification[] {
  return EMPTY_NOTIFICATIONS;
}

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(
    notify.subscribe,
    notify.getSnapshot,
    getServerSnapshot
  );
}
