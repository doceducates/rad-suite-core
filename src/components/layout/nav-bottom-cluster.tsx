'use client';

import React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HmisLogoutButton } from '@/components/hmis/hmis-logout-button';

interface NavBottomClusterProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  userName?: string;
  userRole?: string;
  isAtlas?: boolean;
}

export function NavBottomCluster({
  collapsed,
  userName = 'Lead Radiologist',
  userRole = 'Consultant Radiologist',
  isAtlas,
}: NavBottomClusterProps) {
  const { theme, setTheme } = useTheme();

  const isStudentOrAtlas = Boolean(
    isAtlas ||
    userRole?.toLowerCase().includes('student') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('atlas'))
  );

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (collapsed) {
    return (
      <div className="p-2 border-t border-outline-variant/60 flex flex-col items-center gap-2">
        {/* HMIS Quick Logout Icon Button (Clinical Only) */}
        {!isStudentOrAtlas && <HmisLogoutButton variant="icon" />}

        {/* Theme Toggle Button */}
        <div className="relative group">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs font-medium whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            Switch to {theme === 'dark' ? 'Terra Warm Light' : isStudentOrAtlas ? 'Academy Dark' : 'PACS Dark'}
          </div>
        </div>

        {/* User Avatar */}
        <div className="relative group">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center text-xs font-semibold cursor-pointer relative shadow-2xs">
            <User className="w-4 h-4" />
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface-container-low" />
          </div>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/80 text-on-surface text-xs whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
            <div className="font-semibold text-on-surface">{userName}</div>
            <div className="text-[11px] text-secondary">{userRole} · Online</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-outline-variant/60 space-y-2.5 bg-surface-container-lowest/50">
      {/* HMIS Quick Session Release Button (Clinical Only) */}
      {!isStudentOrAtlas && <HmisLogoutButton variant="sidebar" />}

      <div className="flex items-center justify-between gap-2">
        {/* User Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center text-xs font-semibold shrink-0 relative shadow-2xs">
            <User className="w-4 h-4" />
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface-container-low" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-on-surface truncate">{userName}</div>
            <div className="text-[10px] text-secondary truncate">
              {userRole} · {isStudentOrAtlas ? 'DocEducates Academy' : 'Diagnostic Workstation'}
            </div>
          </div>
        </div>

        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Terra Warm Light' : isStudentOrAtlas ? 'Academy Dark' : 'PACS Dark'}`}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
        </button>
      </div>
    </div>
  );
}
