'use client';

import React, { useState } from 'react';
import { UserCheck, Clock, Key, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CliniciansRbacTab } from './clinicians-rbac-tab';
import { AlphaWaitlistTab } from './alpha-waitlist-tab';
import { InviteCodesTab } from './invite-codes-tab';
import { ClientWorkstationsTab } from './client-workstations-tab';
import type { WorkstationItem, TelemetrySummary } from '@/services/telemetry.service';

type TabType = 'clinicians' | 'waitlist' | 'invites' | 'workstations';

interface UsersClientContainerProps {
  initialUsers: any[];
  initialPreRegistrations: any[];
  initialInvites: any[];
  initialWorkstations?: WorkstationItem[];
  initialTelemetry?: TelemetrySummary;
}

export function UsersClientContainer({
  initialUsers,
  initialPreRegistrations,
  initialInvites,
  initialWorkstations = [],
  initialTelemetry,
}: UsersClientContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('clinicians');
  const [usersList, setUsersList] = useState(initialUsers);

  const waitlistedUsers = usersList.filter(
    (u) => u.status === 'waitlisted' || u.status === 'pending_invite'
  );

  const pendingLeadsCount = initialPreRegistrations.filter(
    (p) => p.status === 'waitlisted'
  ).length;

  const totalWaitlistCount = waitlistedUsers.length + initialPreRegistrations.length;
  const totalPendingActionCount = waitlistedUsers.length + pendingLeadsCount;

  const handleApproveClinicianSuccess = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
    );
  };

  const onlineWorkstationsCount = initialWorkstations.filter((w) => w.status === 'online').length;

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('clinicians')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'clinicians'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Clinicians & RBAC ({usersList.length})</span>
          {waitlistedUsers.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse">
              {waitlistedUsers.length} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waitlist')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'waitlist'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Alpha Waitlist ({totalWaitlistCount})</span>
          {totalPendingActionCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {totalPendingActionCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invites')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'invites'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Invite Codes ({initialInvites.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workstations')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'workstations'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          )}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Workstations ({initialWorkstations.length})</span>
          {onlineWorkstationsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              {onlineWorkstationsCount} online
            </span>
          )}
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="pt-2">
        {activeTab === 'clinicians' && <CliniciansRbacTab initialUsers={usersList} />}
        {activeTab === 'waitlist' && (
          <AlphaWaitlistTab
            initialPreRegistrations={initialPreRegistrations}
            waitlistedUsers={waitlistedUsers}
            onApproveSuccess={handleApproveClinicianSuccess}
          />
        )}
        {activeTab === 'invites' && <InviteCodesTab initialInvites={initialInvites} />}
        {activeTab === 'workstations' && <ClientWorkstationsTab initialWorkstations={initialWorkstations} />}
      </div>
    </div>
  );
}
