'use client';

import React from 'react';
import { HardDrive, Cloud, Server, Database, Radio, Globe } from 'lucide-react';
import type { StorageSourceType } from '@/types/pacs';

interface PacsSourceFilterPillsProps {
  activeSource: string;
  onSourceChange: (source: string) => void;
  counts?: Record<string, number>;
}

export function PacsSourceFilterPills({
  activeSource,
  onSourceChange,
  counts = {},
}: PacsSourceFilterPillsProps) {
  const sources: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'All Sources', icon: Globe },
    { id: 'local_archive', label: 'Local Disk (E:)', icon: HardDrive },
    { id: 's3', label: 'S3 Cloud', icon: Cloud },
    { id: 'gdrive', label: 'Google Drive', icon: Database },
    { id: 'hospital_pacs', label: 'Hospital PACS', icon: Server },
    { id: 'remote_node', label: 'Clinic PACS', icon: Radio },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
      {sources.map((src) => {
        const Icon = src.icon;
        const isActive = activeSource === src.id;
        const count = counts[src.id];

        return (
          <button
            key={src.id}
            type="button"
            onClick={() => onSourceChange(src.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs font-semibold'
                : 'bg-card text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            <span>{src.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
