import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { users, preRegistrations } from '@/db/schema';
import { getCurrentUser } from '@/services/auth.service';
import { inviteService } from '@/services/invite.service';
import { telemetryService } from '@/services/telemetry.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsersClientContainer } from '@/components/admin/users-client-container';
import { AdminTelemetryBanner } from '@/components/admin/admin-telemetry-banner';
import { Users, ShieldAlert, ArrowLeft } from 'lucide-react';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return {
    title: isAtlas ? 'Academy User Management' : 'User Management & Alpha RBAC',
    description: isAtlas
      ? 'Manage anatomy student accounts, academy invite codes, and system administrators.'
      : 'Manage clinical access, granular screen permissions, and monitor active client workstations.',
  };
}

export default async function UsersAdminPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border border-outline-variant/80 bg-surface-container text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-on-surface font-headline">Administrator Access Required</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Account provisioning, RBAC screen privileges, and access invitations are strictly protected and restricted to System Administrators.
        </p>
        <Link href="/dashboard">
          <Button size="sm" className="mt-2 gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Command Center</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Fetch initial data
  const [usersList, preRegList, invitesList, telemetrySummary, workstationsList] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(100),
    db.select().from(preRegistrations).orderBy(desc(preRegistrations.createdAt)).limit(100),
    inviteService.listInviteCodes(),
    telemetryService.getTelemetrySummary().catch(() => ({
      users: { total: 0, active: 0, waitlisted: 0, pendingInvite: 0 },
      workstations: { totalInstalled: 0, onlineNow: 0, byPlatform: {} },
      clinicNodes: { total: 0, online: 0 },
      downloads: { totalDownloads: 0 },
    })),
    telemetryService.listWorkstations(100).catch(() => []),
  ]);

  const sanitizedUsers = usersList.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || 'active',
    phone: u.phone,
    hospital: u.hospital,
    title: u.title,
    department: u.department,
    allowedScreens: (() => {
      try {
        return JSON.parse(u.allowedScreens || '["*"]');
      } catch {
        return ['*'];
      }
    })(),
    createdAt: u.createdAt,
  }));

  const sanitizedPreRegs = preRegList.map((p: any) => ({
    ...p,
    modalitiesOfInterest: (() => {
      try {
        return JSON.parse(p.modalitiesOfInterest || '[]');
      } catch {
        return [];
      }
    })(),
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface font-headline flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span>User Management & Alpha RBAC</span>
          </h1>
          <p className="text-xs text-secondary">
            Manage clinical access, granular screen permissions, and monitor active client workstations.
          </p>
        </div>

        <Badge variant="info" className="self-start sm:self-auto gap-1 text-xs font-mono">
          <span>Admin Portal Active</span>
        </Badge>
      </div>

      {/* System Telemetry & Workstation Overview Bar */}
      <AdminTelemetryBanner summary={telemetrySummary} />

      <UsersClientContainer
        initialUsers={sanitizedUsers}
        initialPreRegistrations={sanitizedPreRegs}
        initialInvites={invitesList}
        initialWorkstations={workstationsList}
        initialTelemetry={telemetrySummary}
      />
    </div>
  );
}
