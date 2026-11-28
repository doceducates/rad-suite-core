'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, User as UserIcon, FilePlus } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { AtlasLogo } from '@/components/brand/atlas-logo';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NAV_CATEGORIES, NavCategory, isRouteActive } from './nav-items';
import { NavItemRow } from './nav-item-row';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WorklistManualCaseModal } from '@/components/worklist/worklist-manual-case-modal';
import { PluginSlot } from '@/components/plugins/PluginSlot';
import { PluginSidebarItem } from '@/components/plugins/PluginSidebarItem';
import { HmisLogoutButton } from '@/components/hmis/hmis-logout-button';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
  userTitle?: string;
  allowedScreens?: string[];
  isAtlas?: boolean;
}

export function MobileNavDrawer({
  isOpen,
  onClose,
  userRole = 'radiologist',
  userName = 'Dr. Sarah Lin',
  userTitle = 'Resident Radiologist (PGR)',
  allowedScreens,
  isAtlas,
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const isAtlasHost = Boolean(isAtlas || (typeof window !== 'undefined' && window.location.hostname.includes('atlas')));
  const isAtlasAdmin = isAtlasHost && userRole === 'admin';
  const isStudent = userRole === 'student' || (isAtlasHost && !isAtlasAdmin);
  const isStudentOrAtlas = isStudent || isAtlasHost;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories: NavCategory[] = ['clinical', 'imaging', 'system'];

  const studentGroups = [
    { label: 'Academy Hub', items: ['dashboard', 'atlas'] },
    { label: 'Preferences', items: ['settings'] },
  ];

  const atlasAdminGroups = [
    { label: 'Academy Hub', items: ['dashboard', 'atlas'] },
    { label: 'Administration', items: ['users', 'audit'] },
    { label: 'Platform', items: ['settings'] },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Sheet Panel */}
      <div className="relative w-4/5 max-w-xs bg-surface-container-low text-on-surface h-full flex flex-col z-10 shadow-2xl border-r border-outline-variant/60 animate-in slide-in-from-left duration-250 select-none">
        {/* Header with Brand & Close Button */}
        <div className="h-16 px-4 border-b border-outline-variant/60 flex items-center justify-between shrink-0">
          <div onClick={onClose} className="cursor-pointer">
            {isStudentOrAtlas ? (
              <AtlasLogo variant="full" size="sm" href="/dashboard" />
            ) : (
              <RadSuiteLogo variant="full" size="sm" href="/dashboard" />
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 min-h-0">
          {/* Quick Manual Report Action Button (Clinical Only) */}
          {!isStudentOrAtlas && (
            <div className="px-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsManualModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                <FilePlus className="w-4 h-4" />
                <span>New Manual Report</span>
              </button>
            </div>
          )}

          {isAtlasAdmin ? (
            atlasAdminGroups.map((group) => {
              const items = group.items
                .map((id) => NAV_ITEMS.find((n) => n.id === id))
                .filter((x): x is typeof NAV_ITEMS[0] => Boolean(x));
              if (items.length === 0) return null;

              return (
                <div key={group.label} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-secondary/70">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <div key={item.id} onClick={onClose}>
                          <NavItemRow item={item} isActive={active} collapsed={false} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : isStudent ? (
            studentGroups.map((group) => {
              const items = group.items
                .map((id) => NAV_ITEMS.find((n) => n.id === id))
                .filter((x): x is typeof NAV_ITEMS[0] => Boolean(x));
              if (items.length === 0) return null;

              return (
                <div key={group.label} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-secondary/70">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <div key={item.id} onClick={onClose}>
                          <NavItemRow item={item} isActive={active} collapsed={false} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            categories.map((category) => {
              const items = NAV_ITEMS.filter((item) => {
                if (item.category !== category) return false;
                if (item.roles && !item.roles.includes(userRole as any)) return false;
                if (userRole !== 'admin') {
                  if (item.id === 'pacs') return true;
                  if (item.id === 'hmis' && allowedScreens && (allowedScreens.includes('hmis') || allowedScreens.includes('worklist'))) {
                    return true;
                  }
                  if (allowedScreens && !allowedScreens.includes('*') && !allowedScreens.includes(item.id)) {
                    return false;
                  }
                }
                return true;
              });

              if (items.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-secondary/70">
                    {NAV_CATEGORIES[category]}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = isRouteActive(pathname, item.href);
                      return (
                        <div key={item.id} onClick={onClose}>
                          <NavItemRow item={item} isActive={active} collapsed={false} />
                        </div>
                      );
                    })}
                    {category === 'system' && (
                      <div onClick={onClose}>
                        <PluginSlot
                          slotId="navigation:sidebar"
                          className="space-y-0.5"
                          renderItem={(contribution) => (
                            <PluginSidebarItem
                              key={contribution.id}
                              contribution={contribution}
                              collapsed={false}
                              pathname={pathname}
                            />
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Profile & Utility Cluster */}
        <div className="p-3 border-t border-outline-variant/60 bg-surface-container shrink-0 space-y-2">
          {/* HMIS Quick Session Release Button (Clinical Only) */}
          {!isStudentOrAtlas && (
            <div onClick={onClose}>
              <HmisLogoutButton variant="sidebar" />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-1">
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-on-surface truncate leading-tight">{userName}</div>
              <div className="text-[10px] text-secondary truncate leading-tight">
                {userTitle || (isStudentOrAtlas ? 'Medical Student / Anatomy Learner' : userRole)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <WorklistManualCaseModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </div>
  );
}
