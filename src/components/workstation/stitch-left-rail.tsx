'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, NAV_CATEGORIES, NavCategory, isRouteActive } from '@/components/layout/nav-items';
import { NavItemRow } from '@/components/layout/nav-item-row';
import { NavBottomCluster } from '@/components/layout/nav-bottom-cluster';
import { WorkstationToolButton } from './workstation-tool-button';

interface StitchLeftRailProps {
  onToggleAiPanel?: () => void;
  isAiPanelActive?: boolean;
  onOpenReport?: () => void;
  isReportOpen?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userName?: string;
  userRole?: string;
  userTitle?: string;
  allowedScreens?: string[];
}

export function StitchLeftRail({
  onToggleAiPanel,
  isAiPanelActive = false,
  onOpenReport,
  isReportOpen = false,
  collapsed = true,
  onToggleCollapse,
  userName,
  userRole,
  userTitle,
  allowedScreens,
}: StitchLeftRailProps) {
  const pathname = usePathname();
  const categories: NavCategory[] = ['clinical', 'imaging', 'system'];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-surface-container-low z-50 flex flex-col justify-between border-r border-outline-variant/60 shadow-xs select-none transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Edge Floating Collapsible Arrow Pill */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand side menu ([)' : 'Collapse side menu ([)'}
          aria-label={collapsed ? 'Expand side menu' : 'Collapse side menu'}
          className="absolute -right-3 top-16 z-50 w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant/80 text-secondary hover:text-primary hover:bg-surface-container-highest flex items-center justify-center shadow-xs transition-transform hover:scale-110 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Brand Header */}
      <div className={cn(
        'h-14 border-b border-outline-variant/60 flex items-center shrink-0',
        collapsed ? 'justify-center px-1' : 'justify-between px-3.5'
      )}>
        <Link href="/worklist" className="flex items-center gap-2.5 overflow-hidden group">
          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs group-hover:opacity-90 transition-opacity">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="font-bold text-on-surface font-headline tracking-tight text-sm leading-tight">
                Rad Suite
              </div>
              <div className="text-[10px] text-secondary font-mono leading-tight">
                Diagnostic Workstation
              </div>
            </div>
          )}
        </Link>

        {!collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse side menu ([)"
            aria-label="Collapse side menu"
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Body */}
      <div className="flex-1 p-2 space-y-2.5 overflow-y-auto overflow-x-hidden scrollbar-none">
        {/* Workstation Tools */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
              Workstation Tools
            </div>
          )}
          <WorkstationToolButton
            onClick={onOpenReport}
            isActive={isReportOpen}
            icon={FileEdit}
            label="Diagnostic Report"
            badge={isReportOpen ? 'Open' : 'Split'}
            collapsed={collapsed}
          />
          <WorkstationToolButton
            onClick={onToggleAiPanel}
            isActive={isAiPanelActive}
            icon={Sparkles}
            label="AI CAD Overlays"
            badge={isAiPanelActive ? 'Active' : 'Off'}
            collapsed={collapsed}
          />
        </div>

        {/* Global Categorized Navigation */}
        {categories.map((cat) => {
          const items = NAV_ITEMS.filter((i) => i.category === cat)
            .filter((i) => !i.roles || (userRole && i.roles.includes(userRole as any)))
            .filter((i) => {
              if (userRole === 'admin') return true;
              if (i.id === 'pacs') return true;
              if (!allowedScreens || allowedScreens.includes('*')) return true;
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
            </div>
          );
        })}
      </div>

      {/* Docked Power Bottom Cluster */}
      <NavBottomCluster
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse || (() => {})}
        userName={userName}
        userRole={userTitle || userRole}
      />
    </aside>
  );
}
