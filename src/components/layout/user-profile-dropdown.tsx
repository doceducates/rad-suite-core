'use client';

// Layer 4: Standard Clinical Dashboard Profile & Settings Dropdown (<200 lines)
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { ProfileThemeControls } from './profile-theme-controls';
import { ProfileHmisControls } from './profile-hmis-controls';
import { ProfileTasksSubmenu } from './profile-tasks-submenu';
import { WorkstationGuideModal } from '@/components/workstation/WorkstationGuideModal';
import { cn } from '@/lib/utils';

export interface UserProfileDropdownProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  userStatus?: string;
  className?: string;
  isAtlas?: boolean;
}

export function UserProfileDropdown({
  userName = 'Dr. Muhammad Mudassir',
  userRole = 'Resident Radiologist & Lead Admin',
  userEmail,
  userStatus,
  className,
  isAtlas,
}: UserProfileDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isStudentOrAtlas = Boolean(
    isAtlas ||
    userRole?.toLowerCase().includes('student') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('atlas'))
  );

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'DR';
    const clean = name.replace(/^(Dr\.|Doctor|Prof\.)\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase() || 'DR';
  };

  const initials = getInitials(userName);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left select-none', className)}>
      {/* Sleek, Decluttered Header Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`${userName} (${userRole}) — Account & Dashboard Settings`}
        className={cn(
          'flex items-center gap-1.5 p-1 rounded-xl transition-all cursor-pointer border border-transparent hover:border-outline-variant/60 hover:bg-surface-container active:scale-95',
          isOpen && 'bg-surface-container border-primary/40'
        )}
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center font-bold text-xs shadow-xs">
            {initials}
          </div>
          {/* Active Workstation Online Indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-secondary transition-transform duration-200',
            isOpen && 'rotate-180 text-primary'
          )}
        />
      </button>

      {/* Mobile Backdrop Dismissal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Profile & Settings Dropdown Menu Card (Fully Responsive for Mobile, Tablet & Desktop) */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin rounded-2xl border border-outline-variant/80 bg-surface-container-high/95 backdrop-blur-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-on-surface divide-y divide-outline-variant/40 space-y-2.5">
          {/* 1. Dynamic User Header (Name, Email, Role & Subscription Status) */}
          <div className="pb-2.5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-on-surface truncate">{userName}</div>
              {userEmail && <div className="text-[11px] text-secondary truncate">{userEmail}</div>}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 max-w-[170px] truncate">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="truncate">{userRole}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span>{userStatus || (isStudentOrAtlas ? (userRole === 'admin' ? 'Academy Admin' : 'Academy Learner') : 'PRO Workstation')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. Workstation Appearance & 3D Aesthetic Theme */}
          <div className="pt-2">
            <ProfileThemeControls onCloseMenu={() => setIsOpen(false)} />
          </div>

          {/* 3. HMIS Gateway & Session Lock Controls (Clinical Workstation Only) */}
          {!isStudentOrAtlas && (
            <div className="pt-2">
              <ProfileHmisControls onCloseMenu={() => setIsOpen(false)} />
            </div>
          )}

          {/* 4. Dashboard Settings & System Navigation */}
          <div className="pt-2 space-y-0.5">
            <ProfileTasksSubmenu
              onNavigate={(path) => {
                setIsOpen(false);
                router.push(path);
              }}
            />

            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/users');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>{isStudentOrAtlas ? 'Academy User Management' : 'User Management & RBAC'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
            >
              <Settings className="w-3.5 h-3.5 text-secondary" />
              <span>{isStudentOrAtlas ? 'Atlas Preferences' : 'Workstation Settings'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowGuide(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
            >
              <span className="flex items-center gap-2.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" />
                <span>Shortcuts & Guide</span>
              </span>
              <kbd className="font-mono text-[9px] px-1 py-0.5 rounded bg-surface-container text-secondary border border-outline-variant/40">
                Shift+?
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-founder-welcome'));
                }
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
            >
              <Info className="w-3.5 h-3.5 text-secondary" />
              <span>{isStudentOrAtlas ? 'About DocEducates Atlas' : 'About Rad Suite'}</span>
            </button>
          </div>

          {/* 5. Destructive Sign Out */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <WorkstationGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
