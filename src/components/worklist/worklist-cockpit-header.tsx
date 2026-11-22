'use client';

// Layer 4 (Presentation): Unified Worklist Diagnostic Hub & Responsive Header (<240 lines)
import React from 'react';
import {
  MoreHorizontal,
  Plus,
  Settings,
  Download,
  Printer,
  MessageCircle,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { HmisQuickStatusButton } from '@/components/hmis/hmis-quick-status-button';
import { useHmisStatus } from '@/hooks/use-hmis-status';
import { notify } from '@/services/notification.service';
import { exportCasesCsv, printCasesLogbook, copyWhatsAppHandover } from './worklist-export-utils';
import type { WorklistTabType } from './worklist-tab-bar';
import type { WorklistStats } from '@/hooks/use-worklist-cases';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistCockpitHeaderProps {
  tabFilter: WorklistTabType;
  onTabChange: (tab: WorklistTabType) => void;
  stats?: WorklistStats;
  cases?: PacsStudyResult[];
  totalCount?: number;
  proceededCount?: number;
  trackingCount?: number;
  pendingAckCount?: number;
  syncingHmis?: boolean;
  loading?: boolean;
  onSyncHmis?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenManualCaseModal?: () => void;
  onResetFilters?: () => void;
}

export function WorklistCockpitHeader({
  tabFilter,
  onTabChange,
  stats,
  cases = [],
  totalCount = 0,
  proceededCount,
  trackingCount,
  pendingAckCount = 0,
  syncingHmis = false,
  loading = false,
  onSyncHmis,
  onOpenSettingsModal,
  onOpenManualCaseModal,
  onResetFilters,
}: WorklistCockpitHeaderProps) {
  const { hasActiveSession, logoutPortal } = useHmisStatus();

  const isProceededActive =
    tabFilter === 'proceeded' ||
    tabFilter === 'all' ||
    tabFilter === 'hmis' ||
    tabFilter === 'unassigned' ||
    tabFilter === 'archive';
  const effectiveProceededCount = proceededCount ?? stats?.hmisCount ?? stats?.total;

  // Canonical Three-Dots Overflow Menu Items
  const menuItems: DropdownMenuItem[] = [
    ...(onOpenSettingsModal
      ? [
          {
            id: 'settings',
            label: 'HMIS Settings & Credentials',
            icon: <Settings className="w-3.5 h-3.5" />,
            onClick: onOpenSettingsModal,
          },
        ]
      : []),
    ...(hasActiveSession
      ? [
          {
            id: 'hmis-logout',
            label: 'Logout / Release HMIS Session',
            icon: <LogOut className="w-3.5 h-3.5 text-rose-500" />,
            onClick: async () => {
              const res = await logoutPortal();
              if (res.success) notify.success('HMIS session released successfully');
            },
          },
        ]
      : []),
    {
      id: 'export-csv',
      label: 'Export CSV Spreadsheet',
      icon: <Download className="w-3.5 h-3.5" />,
      onClick: () => exportCasesCsv(cases),
    },
    {
      id: 'print-logbook',
      label: 'Print Case Logbook',
      icon: <Printer className="w-3.5 h-3.5" />,
      onClick: () => printCasesLogbook(cases),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Daily Handover',
      icon: <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />,
      onClick: () => copyWhatsAppHandover(cases),
    },
    ...(onResetFilters
      ? [
          {
            id: 'reset',
            label: 'Reset All Filters',
            icon: <RotateCcw className="w-3.5 h-3.5" />,
            danger: true,
            onClick: onResetFilters,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-outline-variant/60">
      {/* 1. Left Cluster: Clinical Workstation Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
        {/* Tab 1: Reporting Queue */}
        <button
          type="button"
          onClick={() => onTabChange('proceeded')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            isProceededActive
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>🏥 Reporting Queue</span>
          {typeof effectiveProceededCount === 'number' && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isProceededActive
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {effectiveProceededCount}
            </span>
          )}
        </button>

        {/* Tab 2: Published Reports & Patient Priors Archive */}
        <button
          type="button"
          onClick={() => onTabChange('published')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            tabFilter === 'published'
              ? 'bg-primary text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>📜 Published &amp; Priors</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary/20 text-primary font-medium">
            All-Time
          </span>
        </button>

        {/* Tab 4: Turnaround Time (TAT) Analytics */}
        <button
          type="button"
          onClick={() => onTabChange('tat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            tabFilter === 'tat'
              ? 'bg-primary text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span>⏱️ TAT Analytics</span>
        </button>
      </div>

      {/* 2. Right Cluster: Stats Badges, Unified Smart HMIS Button, Manual Case, & Three-Dots Menu */}
      <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap sm:flex-nowrap">
        {/* Real-time Clinical Stats Badges (Visible on larger screens) */}
        {stats && (
          <div className="hidden xl:flex items-center gap-1.5 text-[11px]">
            <Badge variant="outline" className="h-7 px-2 font-medium">
              {stats.total ?? totalCount} Total
            </Badge>
            <Badge variant="warning" className="h-7 px-2 font-medium">
              {stats.draftCount ?? 0} Drafts
            </Badge>
            <Badge variant="success" className="h-7 px-2 font-medium">
              {stats.finalCount ?? 0} Final
            </Badge>
            {Boolean(stats.statCount && stats.statCount > 0) && (
              <Badge variant="danger" className="h-7 px-2 font-bold animate-pulse ring-1 ring-error">
                {stats.statCount} STAT
              </Badge>
            )}
          </div>
        )}

        {/* Unified Smart HMIS Button: Offline -> Launch | Standby -> Login | Active -> Sync */}
        <HmisQuickStatusButton
          compact
          onSyncHmis={onSyncHmis}
          syncingHmis={syncingHmis}
        />

        {/* Create Manual Case Button */}
        {onOpenManualCaseModal && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenManualCaseModal}
            title="Create Standalone Case without PACS"
            className="h-8 px-2.5 gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manual Report</span>
          </Button>
        )}

        {/* Three Dots Responsive Overflow Menu */}
        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              className="h-8 w-8 rounded-lg border border-outline-variant/60 flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer shadow-2xs"
              title="More options, exports, and clinical logbook tools"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={menuItems}
        />
      </div>
    </div>
  );
}
