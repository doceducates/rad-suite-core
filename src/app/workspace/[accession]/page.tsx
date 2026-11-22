import { notFound, redirect } from 'next/navigation';
import { resolveWorkspaceCase } from '@/services/workspace-case-resolver.service';
import { ZenWorkstation } from '@/components/workstation/zen-workstation';
import { getCurrentUser } from '@/services/auth.service';

interface PageProps {
  params: Promise<{ accession: string }>;
  searchParams?: Promise<{ mode?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function WorkspacePatientPage({ params, searchParams }: PageProps) {
  const { accession } = await params;
  const search = (await searchParams) || {};
  const validModes = ['fab', 'split', 'modal', 'full', 'report', 'review'];
  const initialMode = search.mode && validModes.includes(search.mode)
    ? (search.mode as any)
    : undefined;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/workspace/${accession}`)}`);
  }

  if (currentUser.status === 'waitlisted' || currentUser.status === 'pending_invite') {
    redirect('/pending-access');
  }

  if (currentUser.status === 'suspended') {
    redirect('/pending-access?status=suspended');
  }

  const resolved = await resolveWorkspaceCase(accession, currentUser);

  if (!resolved) {
    notFound();
  }

  return (
    <ZenWorkstation
      study={resolved.study}
      patient={resolved.patient}
      initialReport={resolved.initialReport}
      isLocalCase={resolved.isLocalCase}
      localCaseId={resolved.localCaseId}
      localSeries={resolved.localSeries}
      currentUser={currentUser}
      initialMode={initialMode}
    />
  );
}
