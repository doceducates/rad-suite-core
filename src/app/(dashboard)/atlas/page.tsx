import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/services/auth.service';
import { rbacService } from '@/services/rbac.service';
import { getModules } from '@/services/anatomy.service';
import { AtlasView } from '@/components/atlas/atlas-view';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Interactive Cross-Sectional Anatomy Atlas',
  description: 'Interactive Multi-Planar Cross-Sectional Anatomy Atlas with Diagnostic & Self-Quiz Modes',
};

export default async function AtlasPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const hasAtlasAccess = rbacService.canAccessScreen(user, 'atlas');
  if (!hasAtlasAccess) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border border-outline-variant/80 bg-surface-container-low text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-on-surface font-headline">Anatomy Atlas Access Disabled</h2>
        <p className="text-xs text-secondary leading-relaxed">
          Interactive multi-planar anatomy atlas and self-quiz modes are currently restricted. Your account does not have Atlas access permissions.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Contact your workstation administrator to grant access to the Anatomy Atlas module.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <Link href="/dashboard">
            <Button size="sm" className="gap-1.5 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Command Center
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const initialModules = getModules();

  return <AtlasView initialModules={initialModules} />;
}
