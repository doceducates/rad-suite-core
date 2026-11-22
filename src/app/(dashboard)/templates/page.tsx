// Layer 1 (Transport/Page): Departmental Templates Workstation Route
// Invariant: Target < 250 lines, max 350 lines (AGENTS.md Rule 1)

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';
import { rbacService } from '@/services/rbac.service';
import { config } from '@/lib/config';
import { TemplatesHub } from '@/components/templates/templates-hub';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reporting Templates',
  description: 'Departmental standardized clinical reporting templates for CT, MRI, USG, and X-Ray.',
};

export default async function TemplatesPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;
  const user = await getCurrentUser();

  if (isAtlas || (user && !rbacService.canAccessScreen(user, 'templates'))) {
    redirect('/dashboard');
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <TemplatesHub />
    </div>
  );
}
