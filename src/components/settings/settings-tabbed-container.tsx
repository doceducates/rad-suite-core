'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Building2,
  Palette,
  Cpu,
  Server,
  HardDrive,
  Database,
  ShieldAlert,
  User,
  ExternalLink,
  FileText,
  Blocks,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClinicianProfileSettings } from './clinician-profile-settings';
import { HmisProfileSettings } from './hmis-profile-settings';
import { GoogleSyncSettings } from './google-sync-settings';
import { WorkstationDisplaySettings } from './workstation-display-settings';
import { AdminPacsSettings } from './admin-pacs-settings';
import { AdminClinicNodeSettings } from './admin-clinic-node-settings';
import { SystemStorageSettings } from './system-storage-settings';
import { AiProviderCockpit } from './ai-provider-cockpit';
import { PluginManagerSettings } from './plugin-manager-settings';
import { AdminMcpSettings } from './admin-mcp-settings';
import type { User as UserType } from '@/types';

type SettingsTab = 'profile' | 'hmis' | 'google' | 'display' | 'ai' | 'pacs' | 'clinic-node' | 'storage' | 'plugins' | 'mcp';

interface SettingsTabbedContainerProps {
  user: UserType | null;
  pacsServers?: any[];
  initialTab?: SettingsTab;
  isAtlas?: boolean;
}

export function SettingsTabbedContainer({
  user,
  pacsServers = [],
  initialTab = 'profile',
  isAtlas,
}: SettingsTabbedContainerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || initialTab);
  const [currentUser, setCurrentUser] = useState<UserType | null>(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleProfileUpdated = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    router.refresh();
  };

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleSelectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  const isAtlasHost = Boolean(
    isAtlas ||
    (typeof window !== 'undefined' && window.location.hostname.includes('atlas'))
  );
  const isAtlasAdmin = isAtlasHost && currentUser?.role === 'admin';
  const isStudent = currentUser?.role === 'student' || (isAtlasHost && !isAtlasAdmin);
  const isRadSuiteAdmin = currentUser?.role === 'admin' && !isAtlasHost;
  const isAnyAdmin = currentUser?.role === 'admin';

  const allowedTabs: SettingsTab[] = isAtlasAdmin
    ? ['profile', 'display', 'storage', 'mcp']
    : isStudent
    ? ['profile', 'display']
    : isRadSuiteAdmin
    ? ['profile', 'hmis', 'google', 'display', 'ai', 'pacs', 'clinic-node', 'storage', 'plugins', 'mcp']
    : ['profile', 'hmis', 'google', 'display', 'plugins'];

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('profile');
      router.replace('/settings?tab=profile', { scroll: false });
    }
  }, [allowedTabs, activeTab, router]);

  const clinicalTabs = isAtlasAdmin
    ? [{ id: 'profile' as const, label: 'Admin Profile', icon: User }, { id: 'display' as const, label: 'Atlas Display & 3D', icon: Palette }, { id: 'storage' as const, label: 'Atlas Storage', icon: HardDrive }, { id: 'mcp' as const, label: 'AI Agents & MCP', icon: Bot }]
    : isStudent
    ? [{ id: 'profile' as const, label: 'Student Profile', icon: User }, { id: 'display' as const, label: 'Display & 3D Themes', icon: Palette }]
    : isRadSuiteAdmin
    ? [{ id: 'profile' as const, label: 'Clinician Profile', icon: ShieldCheck }, { id: 'hmis' as const, label: 'Punjab HMIS Portal', icon: Building2 }, { id: 'google' as const, label: 'Google Docs & Drive', icon: FileText }, { id: 'display' as const, label: 'Workstation Display', icon: Palette }, { id: 'ai' as const, label: 'AI Diagnostic Engines', icon: Cpu, badge: 'Admin' }]
    : [{ id: 'profile' as const, label: 'Clinician Profile', icon: ShieldCheck }, { id: 'hmis' as const, label: 'Punjab HMIS Portal', icon: Building2 }, { id: 'google' as const, label: 'Google Docs & Drive', icon: FileText }, { id: 'display' as const, label: 'Workstation Display', icon: Palette }, { id: 'plugins' as const, label: 'Plugins & Add-ons', icon: Blocks }];

  const adminTabs = isRadSuiteAdmin
    ? [{ id: 'mcp' as const, label: 'AI Agents & MCP', icon: Bot, badge: 'Admin' }, { id: 'pacs' as const, label: 'PACS & DICOM Routing', icon: Server, badge: 'Admin' }, { id: 'clinic-node' as const, label: 'Clinic PC Node', icon: HardDrive, badge: 'Admin' }, { id: 'storage' as const, label: 'Storage & Architecture', icon: Database, badge: 'Admin' }, { id: 'plugins' as const, label: 'Plugins & Modules', icon: Blocks, badge: 'Admin' }]
    : [];

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : 'DR';

  const isCurrentTabAdminOnly = ['pacs', 'clinic-node', 'storage', 'mcp'].includes(activeTab);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-xs font-sans">
      {/* Header Summary Card */}
      <Card className="bg-surface-container-low border-outline-variant/60">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: currentUser?.avatarColor || '#4a7c59' }}
            >
              {initials}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-on-surface font-headline leading-tight">
                  {currentUser?.name || (isStudent ? 'Student Learner' : 'Lead Radiologist')}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-[10px] uppercase font-semibold',
                    isStudent
                      ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      : isAnyAdmin
                      ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                      : 'border-primary/40 text-primary bg-primary/10'
                  )}
                >
                  {isStudent ? 'Medical Student' : isAnyAdmin ? 'System Administrator' : currentUser?.role || 'Radiologist'}
                </Badge>
              </div>
              <p className="text-[11px] text-secondary mt-0.5">
                {currentUser?.title || (isStudent ? 'Anatomy Learner' : 'Resident Radiologist')} • {currentUser?.department || (isStudent ? 'Medical Sciences' : 'Radiology')} • {isStudent ? 'Student ID' : 'License'}:{' '}
                <span className="font-mono text-primary">{currentUser?.licenseNo || (isStudent ? 'STD-2026-01' : 'REG-00001')}</span>
              </p>
            </div>
          </div>

          {isAtlasAdmin ? (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button variant="outline" size="sm" onClick={() => router.push('/users')} className="gap-1 text-xs">
                <span>Manage Users & RBAC</span>
                <ExternalLink className="w-3 h-3 text-secondary" />
              </Button>
            </div>
          ) : !isAtlasHost && !isStudent ? (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[11px] px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-surface-container font-mono text-secondary">
                Station ID: #{currentUser?.hmisHospitalId || '0'}
              </span>
              <Button variant="outline" size="sm" onClick={() => handleSelectTab('hmis')} className="gap-1 text-xs">
                <span>Bridge Status</span>
                <ExternalLink className="w-3 h-3 text-secondary" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-col gap-2 border-b border-outline-variant/60 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <div className="flex items-center gap-1 shrink-0">
            {clinicalTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                    isActive ? 'bg-primary text-white shadow-xs font-semibold' : 'text-secondary hover:text-on-surface hover:bg-surface-container'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {adminTabs.length > 0 && (
            <>
              <div className="h-4 w-px bg-outline-variant/60 mx-1 shrink-0" />
              <div className="flex items-center gap-1 shrink-0">
                {adminTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                        isActive ? 'bg-amber-600 dark:bg-amber-500 text-white shadow-xs font-semibold' : 'text-secondary hover:text-on-surface hover:bg-surface-container'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded border border-amber-500/30 text-amber-500 bg-amber-500/10">Admin</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Panes */}
      <div className="min-h-[400px]">
        {isCurrentTabAdminOnly && !isAnyAdmin ? (
          <Card className="text-center p-8 border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-on-surface">Administrator Access Required</h2>
            <p className="text-xs text-secondary max-w-md mx-auto">
              System-level configuration and storage telemetry are strictly restricted to Administrators.
            </p>
            <div className="pt-2">
              <Button size="sm" onClick={() => handleSelectTab('profile')}>Return to Profile</Button>
            </div>
          </Card>
        ) : (
          <>
            {activeTab === 'profile' && (
              <ClinicianProfileSettings
                initialName={currentUser?.name}
                initialLicenseNo={currentUser?.licenseNo}
                initialTitle={currentUser?.title}
                initialDepartment={currentUser?.department}
                role={currentUser?.role}
                avatarColor={currentUser?.avatarColor}
                onProfileUpdated={handleProfileUpdated}
              />
            )}
            {activeTab === 'display' && <WorkstationDisplaySettings />}
            {activeTab === 'storage' && (isAtlasAdmin || isRadSuiteAdmin) && <SystemStorageSettings />}
            {activeTab === 'mcp' && (isAtlasAdmin || isRadSuiteAdmin) && <AdminMcpSettings isAdmin={isAnyAdmin} />}
            {activeTab === 'hmis' && !isAtlasHost && !isStudent && (
              <HmisProfileSettings
                initialHospitalId={currentUser?.hmisHospitalId}
                initialUsername={currentUser?.hmisUsername}
                initialHasPassword={currentUser?.hasHmisPassword}
                initialReportingDoctorName={currentUser?.hmisReportingDoctorName}
                initialSupervisingConsultantName={currentUser?.supervisingConsultantName}
                onProfileUpdated={handleProfileUpdated}
              />
            )}
            {activeTab === 'google' && !isAtlasHost && !isStudent && <GoogleSyncSettings />}
            {activeTab === 'ai' && isRadSuiteAdmin && <AiProviderCockpit />}
            {activeTab === 'pacs' && isRadSuiteAdmin && <AdminPacsSettings initialServers={pacsServers} />}
            {activeTab === 'clinic-node' && isRadSuiteAdmin && <AdminClinicNodeSettings />}
            {activeTab === 'plugins' && !isAtlasHost && (
              <PluginManagerSettings isAdmin={isRadSuiteAdmin} currentUserEmail={currentUser?.email} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
