'use client';

import React from 'react';
import { HardDrive, Server, Cloud, Database, Radio, Activity } from 'lucide-react';
import type { StorageSourceType } from '@/types/pacs';

interface PacsSourceBadgeProps {
  source?: string;
  availableSources?: StorageSourceType[];
  isDownloaded?: boolean;
  className?: string;
}

export function PacsSourceBadge({
  source = 'local_archive',
  availableSources = [],
  isDownloaded,
  className = '',
}: PacsSourceBadgeProps) {
  const normSource = source === 'pacs' ? 'hospital_pacs' : source === 'local' ? 'local_archive' : source;

  const getSourceConfig = (type: string) => {
    switch (type) {
      case 'hospital_pacs':
        return {
          icon: <Server className="w-2.5 h-2.5" />,
          label: 'Hospital PACS',
          style: 'border-blue-500/40 bg-blue-500/10 text-blue-500 dark:text-blue-400',
        };
      case 'gdrive':
        return {
          icon: <Cloud className="w-2.5 h-2.5" />,
          label: 'Google Drive',
          style: 'border-sky-500/40 bg-sky-500/10 text-sky-500 dark:text-sky-400',
        };
      case 's3':
        return {
          icon: <Database className="w-2.5 h-2.5" />,
          label: 'S3 Cloud',
          style: 'border-amber-500/40 bg-amber-500/10 text-amber-500 dark:text-amber-400',
        };
      case 'remote_node':
        return {
          icon: <Radio className="w-2.5 h-2.5" />,
          label: 'Clinic Node',
          style: 'border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400',
        };
      case 'hmis':
        return {
          icon: <Activity className="w-2.5 h-2.5" />,
          label: 'Punjab HMIS',
          style: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400',
        };
      case 'local_archive':
      default:
        return {
          icon: <HardDrive className="w-2.5 h-2.5" />,
          label: 'Local Storage',
          style: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
    }
  };

  const primary = getSourceConfig(normSource);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Primary Source Badge */}
      <span
        className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${primary.style}`}
      >
        {primary.icon}
        <span>{primary.label}</span>
      </span>

      {/* Synced Mirrors (secondary icons if study exists in multiple tiers) */}
      {availableSources.length > 1 && (
        <span className="flex items-center gap-0.5 text-[9px] text-zinc-400 dark:text-zinc-500 font-mono" title={`Synced across: ${availableSources.join(', ')}`}>
          {availableSources
            .filter((s) => s !== normSource)
            .map((secSource) => {
              const sec = getSourceConfig(secSource);
              return (
                <span
                  key={secSource}
                  className="p-0.5 rounded border border-outline-variant/40 bg-surface-container/60 hover:text-on-surface transition-colors"
                  title={`Synced to ${sec.label}`}
                >
                  {sec.icon}
                </span>
              );
            })}
        </span>
      )}
    </div>
  );
}
