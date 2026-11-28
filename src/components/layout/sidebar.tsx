'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, FilePlus } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { AtlasLogo } from '@/components/brand/atlas-logo';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NAV_CATEGORIES, NavCategory, isRouteActive } from './nav-items';
import { NavItemRow } from './nav-item-row';
import { NavBottomCluster } from './nav-bottom-cluster';
import { WorklistManualCaseModal } from '@/components/worklist/worklist-manual-case-modal';
import { PluginSlot } from '@/components/plugins/PluginSlot';
import { PluginSidebarItem } from '@/components/plugins/PluginSidebarItem';

interface SidebarProps {
  userRole?: string;
  userName?: string;
  userTitle?: string;
  allowedScreens?: string[];
  isAtlas?: boolean;
}

export function Sidebar({ userRole = 'radiologist', userName, userTitle, allowedScreens, isAtlas }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Synchronize persisted collapse state from localStorage and auto-collapse on compact viewports
  useEffect(() => {
    try {
      const stored = localStorage.getItem('radsuite-sidebar-collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      } else if (typeof window !== 'undefined' && window.innerWidth < 1200) {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('radsuite-sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Global hotkey listener: '[' or 'Ctrl+B' toggles sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === '[' || (e.ctrlKey && e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  const isAtlasHost = Boolean(isAtlas || (typeof window !== 'undefined' && window.location.hostname.includes('atlas')));
  const isAtlasAdmin = isAtlasHost && userRole === 'admin';
  const isStudent = userRole === 'student' || (isAtlasHost && !isAtlasAdmin);

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
    <aside
      className={cn(
        'hidden md:flex border-r border-outline-variant/60 bg-surface-container-low text-on-surface flex-col shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out select-none shadow-xs z-30 relative',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Brand Header with Single Canonical Collapse/Expand Toggle */}
      <div className={cn(
        'h-14 border-b border-outline-variant/60 flex items-center shrink-0',
        collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
      )}>
        {!collapsed ? (
          <>
            {isStudent || isAtlasHost ? (
              <AtlasLogo variant="full" size="sm" href="/dashboard" />
            ) : (
              <RadSuiteLogo variant="full" size="sm" href="/dashboard" />
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              title="Collapse sidebar ([)"
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Expand sidebar ([)"
            aria-label="Expand sidebar"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer group"
          >
            <PanelLeftOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
        )}
      </div>

      {/* Quick Manual Report Action Button (Clinical Users Only) */}
      {!isStudent && !isAtlasHost && (
        <div className={cn('shrink-0 border-b border-outline-variant/60', collapsed ? 'p-2 flex justify-center' : 'px-3 py-2.5')}>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            title="Create New Manual Report (Walk-in / Offline / Unscheduled)"
            aria-label="New Manual Report"
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-primary text-on-primary font-semibold shadow-xs hover:bg-primary/90 transition-all cursor-pointer group active:scale-95',
              collapsed ? 'w-10 h-10' : 'w-full px-3 py-2 text-xs'
            )}
          >
            <FilePlus className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            {!collapsed && <span className="truncate">New Manual Report</span>}
          </button>
        </div>
      )}

      {/* Categorized Navigation Body */}
      <nav className="flex-1 p-2 space-y-3 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-none">
        {isStudent ? (
          studentGroups.map((group) => {
            const items = group.items
              .map((id) => NAV_ITEMS.find((n) => n.id === id))
              .filter((x): x is typeof NAV_ITEMS[0] => Boolean(x));
            if (items.length === 0) return null;

            return (
              <div key={group.label} className="space-y-0.5">
                {!collapsed && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-secondary/70 font-mono">
                    {group.label}
                  </div>
                )}
                {items.map((item) => (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    isActive={isRouteActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            );
          })
        ) : isAtlasAdmin ? (
          atlasAdminGroups.map((group) => {
            const items = group.items
              .map((id) => NAV_ITEMS.find((n) => n.id === id))
              .filter((x): x is typeof NAV_ITEMS[0] => Boolean(x));
            if (items.length === 0) return null;

            return (
              <div key={group.label} className="space-y-0.5">
                {!collapsed && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-secondary/70 font-mono">
                    {group.label}
                  </div>
                )}
                {items.map((item) => (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    isActive={isRouteActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            );
          })
        ) : (
          categories.map((cat) => {
            const items = NAV_ITEMS.filter((i) => i.category === cat)
              .filter((i) => !i.roles || (userRole && i.roles.includes(userRole as any)))
              .filter((i) => {
                if (userRole === 'admin') return true;
                if (i.id === 'pacs') return true;
                if (!allowedScreens || allowedScreens.includes('*')) return true;
                if (i.id === 'hmis' && (allowedScreens.includes('hmis') || allowedScreens.includes('worklist'))) return true;
                return allowedScreens.includes(i.id);
              });
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-0.5">
                {!collapsed && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-secondary/70 font-mono">
                    {NAV_CATEGORIES[cat]}
                  </div>
                )}
                {items.map((item) => (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    isActive={isRouteActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ))}

                {cat === 'system' && (
                  <PluginSlot
                    slotId="navigation:sidebar"
                    className="space-y-0.5"
                    renderItem={(contribution) => (
                      <PluginSidebarItem
                        key={contribution.id}
                        contribution={contribution}
                        collapsed={collapsed}
                        pathname={pathname}
                      />
                    )}
                  />
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Docked Power Bottom Cluster */}
      <NavBottomCluster
        collapsed={collapsed}
        userName={userName}
        userRole={userTitle || userRole}
        isAtlas={isAtlasHost}
      />

      {/* Quick Manual Case Entry Modal */}
      <WorklistManualCaseModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />
    </aside>
  );
}
