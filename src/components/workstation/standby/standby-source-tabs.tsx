'use client';

import React from 'react';
import {
  HardDrive,
  Cloud,
  Database,
  Server,
  Radio,
  Layers,
} from 'lucide-react';
import { StandbySourceTab, STANDBY_SOURCE_CONFIGS } from './standby-types';

interface StandbySourceTabsProps {
  activeTab: StandbySourceTab;
  onSelectTab: (tab: StandbySourceTab) => void;
  counts?: Partial<Record<StandbySourceTab, number>>;
  allowedSources?: string[];
  isAdmin?: boolean;
}

export function StandbySourceTabs({
  activeTab,
  onSelectTab,
  counts = {},
  allowedSources,
  isAdmin = false,
}: StandbySourceTabsProps) {
  const visibleConfigs = React.useMemo(() => {
    if (isAdmin) return STANDBY_SOURCE_CONFIGS;
    const allowed = allowedSources && allowedSources.length > 0 ? allowedSources : ['local', 'gdrive'];
    return STANDBY_SOURCE_CONFIGS.filter(
      (cfg) => cfg.id === 'all' || allowed.includes(cfg.id)
    );
  }, [isAdmin, allowedSources]);

  React.useEffect(() => {
    if (!visibleConfigs.some((c) => c.id === activeTab)) {
      onSelectTab('all');
    }
  }, [visibleConfigs, activeTab, onSelectTab]);
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'local':
        return <HardDrive className="w-3.5 h-3.5 text-emerald-500" />;
      case 's3':
        return <Database className="w-3.5 h-3.5 text-amber-500" />;
      case 'gdrive':
        return <Cloud className="w-3.5 h-3.5 text-sky-500" />;
      case 'pacs':
        return <Server className="w-3.5 h-3.5 text-blue-500" />;
      case 'remote':
        return <Radio className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="w-full flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/40 overflow-x-auto scrollbar-none">
      {visibleConfigs.map((cfg) => {
        const isActive = activeTab === cfg.id;
        const count = counts[cfg.id];

        return (
          <button
            key={cfg.id}
            type="button"
            onClick={() => onSelectTab(cfg.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              isActive
                ? 'bg-surface text-on-surface shadow-xs font-semibold border border-outline-variant/60'
                : 'text-secondary hover:text-on-surface hover:bg-surface-container/60 border border-transparent'
            }`}
          >
            {getIcon(cfg.iconName)}
            <span>{cfg.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/20 font-bold'
                    : 'bg-surface-container text-secondary border-outline-variant/40'
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
