// Layer 1 (Transport/Page): My Cases Clinical Reporting Workstation Route (<35 lines)
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';
import { rbacService } from '@/services/rbac.service';
import { config } from '@/lib/config';
import { getUnifiedWorklist } from '@/services/unified-case.service';
import { MyCasesTable } from '@/components/my-cases/my-cases-table';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Cases',
  description: 'Assigned active reporting cases.',
};

export default async function MyCasesPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;
  const user = await getCurrentUser();

  if (isAtlas || !rbacService.canAccessScreen(user, 'my_cases')) {
    redirect('/dashboard');
  }

  const { total, cases, stats } = await getUnifiedWorklist({
    assignedTo: 'me',
    dateRange: 'shift',
    limit: 25,
    page: 1,
    currentUserId: user?.id,
  });

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto">
      <MyCasesTable
        initialCases={cases}
        initialTotal={total}
        initialStats={stats}
        currentUserId={user?.id}
        currentUserName={user?.name}
      />
    </div>
  );
}
