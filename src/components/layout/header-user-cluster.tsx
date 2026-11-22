'use client';

// Layer 4: Decluttered Canonical Header User Cluster (<60 lines)
import React from 'react';
import { UserProfileDropdown } from './user-profile-dropdown';
import { PluginSlot } from '@/components/plugins/PluginSlot';
import { cn } from '@/lib/utils';

export interface HeaderUserClusterProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  userStatus?: string;
  showPlugins?: boolean;
  className?: string;
  isAtlas?: boolean;
}

export function HeaderUserCluster({
  userName = 'Dr. Muhammad Mudassir',
  userRole = 'Resident Radiologist & Lead Admin',
  userEmail,
  userStatus,
  showPlugins = true,
  className,
  isAtlas,
}: HeaderUserClusterProps) {
  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2 shrink-0 select-none', className)}>
      {showPlugins && <PluginSlot slotId="workstation:toolbar" />}
      <UserProfileDropdown
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
        userStatus={userStatus}
        isAtlas={isAtlas}
      />
    </div>
  );
}
