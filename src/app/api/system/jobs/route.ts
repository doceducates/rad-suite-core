import { NextResponse } from 'next/server';
import { getAllBackgroundJobs, runJob } from '@/services/background-jobs.service';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';

const RunJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

export const GET = withAuth(
  async () => {
    const jobs = getAllBackgroundJobs();
    return NextResponse.json({ success: true, jobs });
  },
  { roles: ['admin'] }
);

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = RunJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const job = await runJob(parsed.data.jobId);
    return NextResponse.json({ success: true, job });
  },
  {
    roles: ['admin'],
    audit: {
      action: 'execute_background_job',
      entityType: 'SystemJob',
    },
  }
);
