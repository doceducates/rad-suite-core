import { NextResponse } from 'next/server';
import { IS_SQLITE } from '@/db';
import { DEFAULT_LGH_PACS } from '@/services/pacs.service';
import { getAllBackgroundJobs } from '@/services/background-jobs.service';

export async function GET() {
  const jobs = getAllBackgroundJobs();

  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    database: {
      dialect: IS_SQLITE ? 'sqlite' : 'postgresql',
      status: 'connected',
    },
    pacs: {
      status: 'configured',
      defaultNode: DEFAULT_LGH_PACS.name,
      protocol: DEFAULT_LGH_PACS.retrieveProtocol,
    },
    backgroundServices: jobs.map((j) => ({
      id: j.id,
      name: j.name,
      status: j.status,
      runCount: j.runCount,
      lastRunAt: j.lastRunAt,
    })),
  });
}
