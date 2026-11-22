'use client';

// Layer 4 (Presentation Hook): React 19 useSyncExternalStore Hook for Background Tasks
// Strict File Size Invariant: Target < 60 lines

import { useSyncExternalStore, useMemo } from 'react';
import { backgroundTasks } from '@/services/background-tasks.service';
import { BackgroundTask, TaskFilter } from '@/services/background-tasks.types';

const EMPTY_TASKS: BackgroundTask[] = [];

function getServerSnapshot(): BackgroundTask[] {
  return EMPTY_TASKS;
}

export function useBackgroundTasks(filter: TaskFilter = 'all') {
  const allTasks = useSyncExternalStore(
    backgroundTasks.subscribe,
    backgroundTasks.getSnapshot,
    getServerSnapshot
  );

  const activeTasks = useMemo(
    () => allTasks.filter((t) => t.status === 'running' || t.status === 'pending'),
    [allTasks]
  );

  const recentTasks = useMemo(() => allTasks.slice(0, 5), [allTasks]);

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeTasks;
      case 'completed':
        return allTasks.filter((t) => t.status === 'completed');
      case 'stopped_failed':
        return allTasks.filter(
          (t) => t.status === 'stopped' || t.status === 'failed' || t.status === 'interrupted'
        );
      case 'all':
      default:
        return allTasks;
    }
  }, [allTasks, activeTasks, filter]);

  return {
    allTasks,
    filteredTasks,
    activeTasks,
    recentTasks,
    activeCount: activeTasks.length,
    stopTask: backgroundTasks.stopTask.bind(backgroundTasks),
    resumeTask: backgroundTasks.resumeTask.bind(backgroundTasks),
    dismissTask: backgroundTasks.dismissTask.bind(backgroundTasks),
    clearFinished: backgroundTasks.clearFinished.bind(backgroundTasks),
  };
}
