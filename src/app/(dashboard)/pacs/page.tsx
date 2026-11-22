import React from 'react';
import { queryIndexedHospitalPacs } from '@/services/hospital-pacs-index.service';
import { HospitalPacsClientView } from '@/components/pacs/hospital-pacs-client-view';
import { getCurrentUser } from '@/services/auth.service';
import { rbacService } from '@/services/rbac.service';
import { HardDrive, Radio, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HospitalPacsPage() {
  const user = await getCurrentUser();
  const hasPacsAccess = rbacService.canAccessScreen(user, 'pacs');

  if (!hasPacsAccess) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border border-outline-variant/80 bg-surface-container-low text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-on-surface font-headline">PACS Direct Access Disabled</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Direct hospital PACS server querying and slice harvesting is currently restricted to designated workstations. Your account does not currently have PACS query permissions.
        </p>
        <p className="text-[11px] text-muted-foreground">
          You can continue viewing assigned patient studies and reporting via the HMIS Worklist. Contact your system administrator to request PACS access.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <Link href="/worklist">
            <Button size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to HMIS Worklist
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  let initialStudies: any[] = [];
  let initialTotal = 0;

  try {
    const res = await queryIndexedHospitalPacs({
      datePreset: '48h',
      limit: 25,
      allowedStorageSources: user?.allowedStorageSources,
      isAdmin: user?.role === 'admin',
    });
    initialStudies = res.studies;
    initialTotal = res.total;
  } catch (err) {
    console.error('Initial PACS index query error:', err);
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <span>PACS Imaging Worklist</span>
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Clinical DICOM Query &amp; Diagnostic Archive
          </p>
        </div>

        {user?.role === 'admin' && (
          <Link
            href="/clinic-node"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors shadow-2xs text-xs font-medium cursor-pointer"
            title="Clinic Edge Node Telemetry & Harvester (Admin Only)"
          >
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="hidden sm:inline">Edge Node</span>
          </Link>
        )}
      </div>

      {/* Interactive Unified Harvester Workstation Table */}
      <HospitalPacsClientView
        initialStudies={initialStudies}
        initialTotal={initialTotal}
        isAdmin={user?.role === 'admin'}
        allowedSources={user?.allowedStorageSources}
      />
    </div>
  );
}
