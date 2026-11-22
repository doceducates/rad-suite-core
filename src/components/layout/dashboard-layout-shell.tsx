'use client';

// Layer 4: Dashboard Layout Shell with Persistent Universal Footer (<80 lines)
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { WorkstationFooter } from './workstation-footer';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { useUniversalSync } from '@/hooks/use-universal-sync';
import { useWorkstationTelemetry } from '@/hooks/use-workstation-telemetry';

interface DashboardLayoutShellProps {
  user?: {
    id?: string;
    role?: string;
    name?: string;
    title?: string;
    email?: string;
    status?: string;
    allowedScreens?: string[];
  } | null;
  isAtlas?: boolean;
  children: React.ReactNode;
}

export function DashboardLayoutShell({ user, isAtlas, children }: DashboardLayoutShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  useUniversalSync();
  useWorkstationTelemetry();

  const isFullBleed =
    pathname === '/atlas' ||
    pathname?.startsWith('/atlas') ||
    pathname?.startsWith('/workstation') ||
    pathname?.startsWith('/workspace');

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-background text-on-surface transition-colors">
      {/* Desktop Persistent Sidebar (hidden on mobile) */}
      <Sidebar
        userRole={user?.role}
        userName={user?.name}
        userTitle={user?.title}
        allowedScreens={user?.allowedScreens}
        isAtlas={isAtlas}
      />

      {/* Mobile Slide-out Drawer */}
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        userRole={user?.role}
        userName={user?.name}
        userTitle={user?.title}
        allowedScreens={user?.allowedScreens}
        isAtlas={isAtlas}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar
          userName={user?.name}
          userRole={user?.role}
          userEmail={user?.email}
          userStatus={user?.status || (user?.role === 'admin' ? (isAtlas ? 'Academy Admin' : 'Alpha Admin') : (user?.role === 'student' || isAtlas) ? 'Active Learner' : 'Workstation PRO')}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          isAtlas={isAtlas}
        />
        <main
          className={
            isFullBleed
              ? 'flex-1 min-h-0 overflow-hidden p-0'
              : 'flex-1 min-h-0 overflow-y-auto p-4 sm:p-6'
          }
        >
          {children}
        </main>
        <WorkstationFooter isAtlas={isAtlas} />
      </div>
    </div>
  );
}
