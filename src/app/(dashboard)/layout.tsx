import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';
import { DashboardLayoutShell } from '@/components/layout/dashboard-layout-shell';
import { config } from '@/lib/config';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Alpha Gating Check: Waitlisted or pending users cannot access dashboard screens
  if (user.status === 'waitlisted' || user.status === 'pending_invite') {
    redirect('/pending-access');
  }

  if (user.status === 'suspended') {
    redirect('/pending-access?status=suspended');
  }

  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return (
    <DashboardLayoutShell user={user} isAtlas={isAtlas}>
      {children}
    </DashboardLayoutShell>
  );
}
