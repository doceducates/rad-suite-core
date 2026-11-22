'use client';

import React from 'react';
import { Clock, RefreshCw, PlusCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ShiftInfo } from '@/types/dashboard';

interface DashboardHeaderProps {
  shift: ShiftInfo;
  userName: string;
  userRole?: string;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onOpenManualCase: () => void;
}

export function DashboardHeader({
  shift,
  userName,
  userRole = 'Radiologist',
  isRefreshing = false,
  onRefresh,
  onOpenManualCase,
}: DashboardHeaderProps) {
  // Extract first name or greeting
  const firstName = userName ? userName.split(' ')[0] : 'Doctor';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/60 shadow-xs backdrop-blur-sm">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold font-headline text-on-surface tracking-tight">
            Welcome back, {firstName}
          </h1>
          <Badge
            variant={shift.isTraumaShift ? 'danger' : 'info'}
            className="gap-1.5 py-0.5 px-2.5 shadow-2xs"
          >
            {shift.isTraumaShift ? (
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-error" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="font-medium">{shift.shiftLabel}</span>
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-secondary flex items-center gap-1.5">
          <span>{shift.scheduleDescription}</span>
          <span className="text-outline-variant">•</span>
          <span className="font-medium text-on-surface-variant capitalize">{userRole}</span>
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
        {/* Real-time Clock Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/60 text-xs font-mono text-secondary shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>{shift.currentTimeFormatted}</span>
          <span className="text-outline-variant">|</span>
          <span className="font-sans text-xs">{shift.currentDateFormatted}</span>
        </div>

        {/* Manual Intake Trigger */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenManualCase}
          className="gap-1.5 text-xs font-medium"
        >
          <PlusCircle className="w-3.5 h-3.5 text-primary" />
          <span>New Case</span>
        </Button>

        {/* Live Refresh Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-2.5 text-secondary hover:text-on-surface"
          title="Refresh dashboard stats (R)"
          aria-label="Refresh telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
