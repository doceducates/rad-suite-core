import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorklistRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (typeof v === 'string') params.set(k, v);
    else if (Array.isArray(v)) v.forEach((item) => params.append(k, item));
  }
  const qs = params.toString();
  redirect(qs ? `/hmis?${qs}` : '/hmis');
}
