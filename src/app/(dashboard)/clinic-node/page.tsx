import React from 'react';
import { getCurrentUser } from '@/services/auth.service';
import { rbacService } from '@/services/rbac.service';
import { AdminClinicNodeSettings } from '@/components/settings/admin-clinic-node-settings';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ClinicNodePage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const hasStorageAccess = rbacService.canAccessStorageSource(user, 'remote_node');

  if (!isAdmin && !hasStorageAccess) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border border-outline-variant/80 bg-surface-container-low text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-on-surface font-headline">Clinic Node Access Restricted</h2>
        <p className="text-xs text-secondary leading-relaxed">
          The Clinic Edge Node microservice, telemetry dashboard, and LAN harvest controls are restricted to administrators.
        </p>
        <p className="text-[11px] text-muted-foreground">
          If you require access to diagnostic imaging archives or specific cases, please use the HMIS Worklist or PACS screen.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <Link href="/dashboard">
            <Button size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Main Dedicated Cockpit */}
      <AdminClinicNodeSettings />
    </div>
  );
}
