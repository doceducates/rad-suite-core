import { testPacsTcpConnection, queryPacsArchive, DEFAULT_LGH_PACS } from './pacs.service';
import { logAudit } from './audit.service';
import { syncHmisAndPacsWorklist } from './hmis/hmis-worklist-sync.service';
import { runWorklistRetentionCleanup } from './worklist-retention.service';

export interface BackgroundJob {
  id: string;
  name: string;
  intervalSec: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  status: 'idle' | 'running' | 'success' | 'failed';
  runCount: number;
  lastMessage?: string;
}

const jobsRegistry: Record<string, BackgroundJob> = {
  'pacs-heartbeat': {
    id: 'pacs-heartbeat',
    name: 'Hospital PACS Heartbeat & TCP Watchdog',
    intervalSec: 60,
    lastRunAt: null,
    nextRunAt: null,
    status: 'idle',
    runCount: 0,
    lastMessage: 'Ready to monitor PACS host',
  },
  'pacs-poller': {
    id: 'pacs-poller',
    name: 'PACS Archive New Studies Poller (C-FIND)',
    intervalSec: 120,
    lastRunAt: null,
    nextRunAt: null,
    status: 'idle',
    runCount: 0,
    lastMessage: 'Ready to poll new today scans',
  },
  'hmis-sync': {
    id: 'hmis-sync',
    name: 'Punjab HMIS Portal Sync & Queue Engine',
    intervalSec: 300,
    lastRunAt: null,
    nextRunAt: null,
    status: 'idle',
    runCount: 0,
    lastMessage: 'Bridge queue synchronized',
  },
  'worklist-retention': {
    id: 'worklist-retention',
    name: 'Worklist Pruning & Database Vacuum Reaper',
    intervalSec: 86400,
    lastRunAt: null,
    nextRunAt: null,
    status: 'idle',
    runCount: 0,
    lastMessage: 'Ready to prune stale orphaned orders',
  },
  'vps-case-sync': {
    id: 'vps-case-sync',
    name: 'VPS Central Case Sync Watchdog',
    intervalSec: 60,
    lastRunAt: null,
    nextRunAt: null,
    status: 'idle',
    runCount: 0,
    lastMessage: 'Ready to sync offline outbox',
  },
};

export async function runJob(jobId: string): Promise<BackgroundJob> {
  const job = jobsRegistry[jobId];
  if (!job) throw new Error(`Unknown job: ${jobId}`);

  job.status = 'running';
  job.lastRunAt = new Date().toISOString();
  job.runCount++;

  try {
    if (jobId === 'pacs-heartbeat') {
      const ping = await testPacsTcpConnection(DEFAULT_LGH_PACS.host, DEFAULT_LGH_PACS.port, 2000);
      job.status = ping.reachable ? 'success' : 'failed';
      job.lastMessage = ping.reachable
        ? `Online (${ping.latencyMs}ms latency to ${DEFAULT_LGH_PACS.host})`
        : `Offline / Timeout: ${ping.error || 'Check Ethernet / HMIS Wi-Fi'}`;
    } else if (jobId === 'pacs-poller') {
      const todayStudies = await queryPacsArchive({ dateRange: 'today' });
      job.status = 'success';
      job.lastMessage = `Polled archive: ${todayStudies.length} active studies in today queue`;
    } else if (jobId === 'hmis-sync') {
      const summary = await syncHmisAndPacsWorklist();
      job.status = summary.error ? 'failed' : 'success';
      job.lastMessage = summary.error
        ? `Sync note: ${summary.error}`
        : `Synced ${summary.totalFetched} cases (New: ${summary.newStudiesCreated}, Local DICOM: ${summary.matchedWithLocalDicom})`;
    } else if (jobId === 'worklist-retention') {
      const ret = await runWorklistRetentionCleanup(5);
      job.status = 'success';
      job.lastMessage = `Pruned ${ret.orphanedOrdersPruned} unassigned orders (${ret.protectedCasesCount} doctor cases protected, Vacuum: ${ret.vacuumExecuted})`;
    } else if (jobId === 'vps-case-sync') {
      const { drainSyncOutbox, pullRemoteCaseUpdates } = await import('./sync/case-sync-outbox.service');
      const pushRes = await drainSyncOutbox(25);
      const pullRes = await pullRemoteCaseUpdates();
      job.status = 'success';
      job.lastMessage = `Push: ${pushRes.synced}/${pushRes.attempted} (conflicts: ${pushRes.conflicts}), Pull: ${pullRes.received}`;
    }

    job.nextRunAt = new Date(Date.now() + job.intervalSec * 1000).toISOString();
    await logAudit({
      action: 'BACKGROUND_JOB_RUN',
      entityType: 'SystemJob',
      entityId: job.id,
      details: `${job.name} -> ${job.lastMessage}`,
    });
  } catch (err: any) {
    job.status = 'failed';
    job.lastMessage = err?.message || 'Job execution error';
  }

  return job;
}

export function getAllBackgroundJobs(): BackgroundJob[] {
  return Object.values(jobsRegistry);
}
