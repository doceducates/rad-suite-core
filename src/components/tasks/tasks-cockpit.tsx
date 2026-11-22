'use client';

// Layer 4 (Presentation): Universal Background Tasks Cockpit (<240 lines)
import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Trash2,
  Activity,
  Layers,
} from 'lucide-react';
import { useBackgroundTasks } from '@/hooks/use-background-tasks';
import { TaskCard } from './task-card';
import { TaskFilter } from '@/services/background-tasks.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface TasksCockpitProps {
  user?: any;
}

export function TasksCockpit({ user }: TasksCockpitProps) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { allTasks, filteredTasks, activeCount, stopTask, resumeTask, dismissTask, clearFinished } =
    useBackgroundTasks(filter);

  const completedCount = useMemo(
    () => allTasks.filter((t) => t.status === 'completed').length,
    [allTasks]
  );
  const stoppedFailedCount = useMemo(
    () =>
      allTasks.filter(
        (t) => t.status === 'stopped' || t.status === 'failed' || t.status === 'interrupted'
      ).length,
    [allTasks]
  );

  const searchedTasks = useMemo(() => {
    if (!searchQuery.trim()) return filteredTasks;
    const q = searchQuery.toLowerCase().trim();
    return filteredTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.statusText?.toLowerCase().includes(q) ||
        t.items?.some(
          (i) => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)
        )
    );
  }, [filteredTasks, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none">
      {/* 1. Cockpit Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center shadow-xs">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-on-surface">
                Background Tasks & Services
              </h1>
              <p className="text-xs text-secondary mt-0.5">
                Monitor batch dispatches, PACS retrievals, cloud syncs, and background workers across sessions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allTasks.some((t) => t.status !== 'running' && t.status !== 'pending') && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearFinished}
              className="text-xs font-semibold gap-1.5 text-secondary hover:text-on-surface"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Finished</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Tracked"
          value={allTasks.length}
          icon={<Layers className="w-4 h-4 text-primary" />}
        />
        <StatCard
          label="Active Running"
          value={activeCount}
          highlight={activeCount > 0}
          icon={<Loader2 className={cn('w-4 h-4 text-amber-400', activeCount > 0 && 'animate-spin')} />}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          label="Stopped / Failed"
          value={stoppedFailedCount}
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
        />
      </div>

      {/* 3. Filter Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-high/80 border border-outline-variant/40 overflow-x-auto">
          <FilterTab
            label="All Tasks"
            count={allTasks.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterTab
            label="Active"
            count={activeCount}
            active={filter === 'active'}
            onClick={() => setFilter('active')}
          />
          <FilterTab
            label="Completed"
            count={completedCount}
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
          />
          <FilterTab
            label="Stopped / Failed"
            count={stoppedFailedCount}
            active={filter === 'stopped_failed'}
            onClick={() => setFilter('stopped_failed')}
          />
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-secondary absolute left-2.5 top-2.5 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or accession..."
            className="h-9 text-xs pl-8"
          />
        </div>
      </div>

      {/* 4. Tasks List or Empty State */}
      {searchedTasks.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container/30">
          <div className="w-12 h-12 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-secondary/60 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-on-surface">No tasks found</h3>
          <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No background operations match your search criteria.'
              : filter === 'active'
              ? 'There are currently no active background tasks running.'
              : 'Tasks such as batch HMIS sends, PACS pulls, or cloud syncs will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {searchedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStop={stopTask}
              onResume={resumeTask}
              onDismiss={dismissTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container/60 backdrop-blur-xs flex items-center justify-between gap-3',
        highlight && 'border-amber-500/40 bg-amber-500/5'
      )}
    >
      <div>
        <div className="text-[11px] font-medium text-secondary truncate">{label}</div>
        <div className="text-lg font-bold text-on-surface mt-0.5">{value}</div>
      </div>
      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
        {icon}
      </div>
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
        active
          ? 'bg-primary text-primary-foreground shadow-xs'
          : 'text-secondary hover:text-on-surface hover:bg-surface-container'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-surface-container text-secondary'
        )}
      >
        {count}
      </span>
    </button>
  );
}
