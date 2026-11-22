import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Activity,
  Mic,
  Layers,
  Inbox,
  ClipboardList,
  Send,
  ShieldCheck,
  Settings,
  HardDrive,
  Users,
  BookOpen,
  ListTodo,
} from 'lucide-react';

import type { UserRole } from '@/types';

export type NavCategory = 'clinical' | 'imaging' | 'system';

export interface NavItemDef {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: NavCategory;
  badge?: string;
  shortcut?: string;
  roles?: UserRole[];
}

export const NAV_CATEGORIES: Record<NavCategory, string> = {
  clinical: 'Clinical Core',
  imaging: 'Imaging & Intake',
  system: 'Hospital System',
};

export const NAV_ITEMS: NavItemDef[] = [
  // Clinical Core
  { id: 'dashboard', href: '/dashboard', label: 'Command Center', icon: LayoutDashboard, category: 'clinical', shortcut: '1' },
  { id: 'my_cases', href: '/my-cases', label: 'My Cases', icon: CheckSquare, category: 'clinical', badge: 'Active', shortcut: '2' },
  { id: 'worklist', href: '/worklist', label: 'HMIS', icon: FileText, category: 'clinical', shortcut: '3' },
  { id: 'pacs', href: '/pacs', label: 'PACS', icon: HardDrive, category: 'clinical', shortcut: '4' },
  { id: 'workspace', href: '/workspace', label: 'Workspace', icon: Activity, category: 'clinical', shortcut: '5' },

  // Voice & Intake
  { id: 'studio', href: '/studio', label: 'Voice Lab', icon: Mic, category: 'imaging', shortcut: '6' },
  { id: 'atlas', href: '/atlas', label: 'Anatomy Atlas', icon: BookOpen, category: 'imaging', shortcut: 'a' },
  { id: 'intake', href: '/intake', label: 'Intake & OCR', icon: Inbox, category: 'imaging', shortcut: '7' },
  { id: 'archive', href: '/worklist?tab=archive', label: 'Archive & Logbook', icon: ClipboardList, category: 'imaging', shortcut: '8' },

  // Hospital System
  { id: 'tasks', href: '/tasks', label: 'Background Tasks', icon: ListTodo, category: 'system', shortcut: 't' },
  { id: 'audit', href: '/audit', label: 'Audit Trail', icon: ShieldCheck, category: 'system', shortcut: '0', roles: ['admin'] },
  { id: 'users', href: '/users', label: 'Users & RBAC', icon: Users, category: 'system', shortcut: 'u', roles: ['admin'] },
  { id: 'settings', href: '/settings', label: 'Settings', icon: Settings, category: 'system' },
];

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/tasks' && (pathname === '/tasks' || pathname.startsWith('/tasks/'))) return true;
  if (href === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) return true;
  if (href === '/my-cases' && (pathname === '/my-cases' || pathname.startsWith('/my-cases/'))) return true;
  if (href === '/worklist' && pathname === '/worklist') return true;
  if (href === '/hmis' && (pathname === '/hmis' || pathname.startsWith('/hmis/'))) return true;
  if (href === '/pacs' && (pathname === '/pacs' || pathname.startsWith('/pacs/'))) return true;
  if ((href.startsWith('/workspace') || href.startsWith('/workstation')) && (pathname.startsWith('/workspace') || pathname.startsWith('/workstation'))) return true;
  if (href === '/atlas' && (pathname === '/atlas' || pathname.startsWith('/atlas/'))) return true;
  if (href.startsWith('/worklist?tab=archive') && pathname === '/worklist') return false; // Handled dynamically if tab matches
  return pathname.startsWith(href) && href !== '/';
}
