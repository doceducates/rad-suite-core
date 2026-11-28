'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Activity, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PacsStudyResult } from '@/types/pacs';

interface DashboardUrgentTriageProps {
  cases: PacsStudyResult[];
  totalShiftCases: number;
}

export function DashboardUrgentTriage({ cases, totalShiftCases }: DashboardUrgentTriageProps) {
  const statCount = cases.filter((c) => c.priority === 'stat').length;

  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3 p-4 sm:p-5">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base sm:text-lg">Urgent Triage Queue</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
              {cases.length} Recent
            </Badge>
            {statCount > 0 && (
              <Badge variant="danger" className="animate-pulse text-[10px] py-0 px-1.5">
                {statCount} STAT
              </Badge>
            )}
          </div>
          <p className="text-xs text-secondary">
            Emergency scans & acute cases awaiting radiologist evaluation
          </p>
        </div>

        <Link href="/hmis">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary hover:text-primary">
            <span className="hidden sm:inline">Worklist</span>
            <span>({totalShiftCases})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col justify-between">
        {cases.length === 0 ? (
          <div className="p-8 text-center text-xs text-secondary my-auto">
            <Activity className="w-8 h-8 mx-auto text-outline-variant/80 mb-2" />
            <p className="font-medium text-on-surface">No Urgent Cases Pending</p>
            <p className="text-[11px] mt-0.5">All acute priority cases for this shift have been reviewed.</p>
          </div>
        ) : (
          /* Space-saving scrollable container: shows 3-4 cases at a glance, others scrollable */
          <div className="max-h-[220px] sm:max-h-[235px] overflow-y-auto divide-y divide-outline-variant/40 overscroll-contain">
            {cases.map((c) => {
              const isStat = c.priority === 'stat';
              const isUrgent = c.priority === 'urgent';

              return (
                <div
                  key={c.accessionNumber}
                  className="px-4 py-2.5 sm:px-5 sm:py-3 hover:bg-surface-container/60 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Priority Indicator */}
                    <div className="shrink-0">
                      {isStat ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-error inline-block animate-ping" />
                      ) : isUrgent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs sm:text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                          {c.patientName}
                        </span>
                        <Badge
                          variant={isStat ? 'danger' : isUrgent ? 'warning' : 'outline'}
                          className="text-[10px] uppercase font-mono py-0 px-1"
                        >
                          {c.modality}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-secondary mt-0.5 font-mono">
                        <span className="truncate max-w-[140px] sm:max-w-xs text-on-surface-variant font-sans">
                          {c.studyDescription || c.bodyPart || 'Diagnostic Scan'}
                        </span>
                        <span>•</span>
                        <span>#{c.accessionNumber}</span>
                        {c.studyTime && (
                          <>
                            <span className="hidden md:inline">•</span>
                            <span className="hidden md:inline-flex items-center gap-0.5">
                              <Clock className="w-3 h-3 inline" /> {c.studyTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Launch Button */}
                  <Link
                    href={`/workstation?accession=${encodeURIComponent(c.accessionNumber)}`}
                    className="shrink-0"
                  >
                    <Button
                      size="sm"
                      variant={isStat ? 'danger' : 'secondary'}
                      className="text-xs px-2 sm:px-2.5 py-1 gap-1 font-medium shadow-2xs group-hover:scale-105 transition-transform"
                    >
                      <span>Report</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-2.5 sm:p-3 bg-surface-container/30 border-t border-outline-variant/40 text-center">
          <Link
            href="/hmis"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>View Full Hospital Worklist Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
