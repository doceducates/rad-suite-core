import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';
import { getDashboardSummary } from '@/services/dashboard.service';
import { telemetryService } from '@/services/telemetry.service';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { AtlasStudentDashboard } from '@/components/atlas/dashboard/atlas-student-dashboard';
import { getModules } from '@/services/anatomy.service';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return {
    title: isAtlas ? 'Academy Command Center' : 'Command Center',
    description: isAtlas
      ? 'Cross-sectional anatomy training, daily self-quiz, and academy learning streak.'
      : 'Central clinical dashboard and shift telemetry.',
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode || user?.role === 'student';

  if (isAtlas) {
    const modules = getModules();
    return (
      <AtlasStudentDashboard
        userName={user?.name || 'Student'}
        userRole={user?.role || 'student'}
        modules={modules}
      />
    );
  }

  const isAdmin = user?.role === 'admin';
  const summary = await getDashboardSummary(user?.id, isAdmin);
  const adminTelemetry =
    isAdmin
      ? await telemetryService.getTelemetrySummary().catch(() => null)
      : null;

  return (
    <DashboardView
      initialData={summary}
      userName={user?.name || 'Radiologist'}
      userRole={user?.role || 'radiologist'}
      userTitle={user?.title || user?.role || 'Radiologist'}
      adminTelemetry={adminTelemetry}
    />
  );
}
