'use client';

import React from 'react';
import Link from 'next/link';
import { History, ShieldCheck, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { RecentActivityItem } from '@/types/dashboard';

interface DashboardRecentActivityProps {
  activities: RecentActivityItem[];
  isAdmin?: boolean;
}

export function DashboardRecentActivity({ activities, isAdmin = false }: DashboardRecentActivityProps) {
  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3 p-4 sm:p-5">
        <div>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span>Audit & Event Stream</span>
          </CardTitle>
          <p className="text-xs text-secondary mt-0.5">
            Tamper-evident cryptographic ledger of clinical operations
          </p>
        </div>

        {isAdmin ? (
          <Link
            href="/audit"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Full Trail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="text-[11px] font-mono text-secondary px-2 py-0.5 rounded bg-surface border border-outline-variant/40">
            Encrypted Log
          </span>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 flex-1">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-secondary">
            No recent activity recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-2.5 rounded-xl bg-surface border border-outline-variant/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0" title="Tamper-evident cryptographically signed event">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface truncate">
                      {act.actionTitle}
                    </p>
                    <p className="text-[11px] text-secondary truncate font-mono">
                      By {act.userName} • {act.entityType} {act.entityId ? `#${act.entityId.slice(0, 8)}` : ''}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono text-secondary shrink-0">
                  {act.relativeTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
