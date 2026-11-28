'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, User, ArrowUpRight, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PendingCaseItem } from '@/types/dashboard';

interface DashboardPendingQueueProps {
  cases: PendingCaseItem[];
}

export function DashboardPendingQueue({ cases }: DashboardPendingQueueProps) {
  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3 p-4 sm:p-5">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Clinical Pending Cases</CardTitle>
            <Badge variant="warning" className="text-[10px] font-mono py-0 px-1.5 font-semibold">
              {cases.length} On Hold
            </Badge>
          </div>
          <p className="text-xs text-secondary">
            Studies awaiting prior films, lab renal profile, or clinician clarification
          </p>
        </div>

        <Link href="/hmis?status=pending">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-secondary hover:text-on-surface">
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col justify-between">
        {cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-secondary my-auto">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/70 mb-2" />
            <p className="font-medium text-on-surface">Zero Cases On Hold</p>
            <p className="text-[11px] mt-0.5">All studies are actively progressing with zero pending bottlenecks.</p>
          </div>
        ) : (
          /* Responsive, space-saving scrollable container */
          <div className="max-h-[260px] sm:max-h-[280px] overflow-y-auto divide-y divide-outline-variant/40 overscroll-contain">
            {cases.map((c) => (
              <div
                key={c.accessionNumber}
                className="px-4 py-3 sm:px-5 hover:bg-surface-container/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  {/* Top Row: Patient Name, Modality & Reason */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {c.patientName}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 px-1 uppercase">
                      {c.modality}
                    </Badge>
                    {/* Reason Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{c.pendingReasonLabel}</span>
                    </span>
                  </div>

                  {/* Middle Row: Assigned Consultant & Study Description */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary font-mono">
                    <span className="truncate max-w-[180px] sm:max-w-xs text-on-surface-variant font-sans">
                      {c.studyDescription}
                    </span>
                    <span>•</span>
                    <span>#{c.accessionNumber}</span>
                    <span>•</span>
                    {/* Assigned Consultant Indicator */}
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary font-sans font-medium">
                      <User className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-none">{c.assignedConsultantName}</span>
                    </span>
                  </div>

                  {/* Optional Notes snippet if present */}
                  {c.pendingNotes && (
                    <div className="text-[11px] text-secondary italic line-clamp-1 max-w-xl flex items-center gap-1 font-sans mt-0.5">
                      <FileText className="w-2.5 h-2.5 text-secondary shrink-0" />
                      <span>Note: &ldquo;{c.pendingNotes}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Right Action: Hold Duration & Workstation Resume Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 self-stretch sm:self-center pt-1 sm:pt-0 border-t sm:border-t-0 border-outline-variant/30">
                  <span className="text-[10px] sm:text-[11px] font-mono text-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{c.pendingRelative}</span>
                  </span>

                  <Link
                    href={`/workstation?accession=${encodeURIComponent(c.accessionNumber)}`}
                    className="shrink-0"
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs px-2 sm:px-2.5 py-1 gap-1 font-medium shadow-2xs group-hover:border-primary/50 group-hover:text-primary transition-all cursor-pointer"
                    >
                      <span>Resume</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-2.5 sm:p-3 bg-surface-container/30 border-t border-outline-variant/40 text-center">
          <Link
            href="/hmis?status=pending"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Manage All Cases On Hold In Worklist</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
