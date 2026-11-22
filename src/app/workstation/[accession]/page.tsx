import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ accession: string }>;
  searchParams?: Promise<{ mode?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function WorkstationAccessionRedirectPage({ params, searchParams }: PageProps) {
  const { accession } = await params;
  const search = (await searchParams) || {};
  const query = search.mode ? `?mode=${encodeURIComponent(search.mode)}` : '';
  redirect(`/workspace/${encodeURIComponent(accession)}${query}`);
}
