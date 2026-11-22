import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/services/auth.service';
import { TasksCockpit } from '@/components/tasks/tasks-cockpit';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Background Tasks & Services | Rad Suite',
  description: 'Monitor batch dispatches, PACS retrievals, cloud syncs, and background workers.',
};

export default async function TasksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <TasksCockpit user={user} />;
}
