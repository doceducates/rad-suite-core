'use client';

import { Users, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CollabUser {
  id: string;
  name: string;
  role: string;
  color: string;
}

interface CollabStatusBadgeProps {
  activeUsers?: CollabUser[];
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

export function CollabStatusBadge({
  activeUsers = [
    { id: '1', name: 'Dr. Ayesha', role: 'Consultant', color: '#4a7c59' },
    { id: '2', name: 'Dr. Sana', role: 'Resident', color: '#f59e0b' },
  ],
  syncStatus = 'synced',
}: CollabStatusBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex -space-x-1.5 items-center">
        {activeUsers.map((u) => (
          <div
            key={u.id}
            title={u.name + ' (' + u.role + ') ? Active in Document'}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-900 shadow-sm"
            style={{ backgroundColor: u.color }}
          >
            {u.name.charAt(4)}
          </div>
        ))}
      </div>

      <Badge variant="outline" className="gap-1 text-[11px] py-0 px-2 text-zinc-600 dark:text-zinc-300">
        <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
        <span>Live Co-Editing</span>
      </Badge>
    </div>
  );
}
