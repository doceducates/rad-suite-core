// Layer 1 (Transport/Page): HMIS Worklist Cockpit Route (<35 lines)
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';
import { rbacService } from '@/services/rbac.service';
import { config } from '@/lib/config';
import { getUnifiedWorklist } from '@/services/unified-case.service';
import { WorklistTable } from '@/components/worklist/worklist-table';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'HMIS Worklist',
  description: 'Central clinical patient queue and worklist.',
};

export default async function WorklistPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;
  const user = await getCurrentUser();

  if (isAtlas || !rbacService.canAccessScreen(user, 'worklist')) {
    redirect('/dashboard');
  }

  const { total, cases, stats } = await getUnifiedWorklist({ limit: 25, page: 1, dateRange: 'shift' });

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto">
      <WorklistTable
        initialCases={cases}
        initialTotal={total}
        initialStats={stats}
      />
    </div>
  );
}
