import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  getClinicNodeStatus,
  recordClinicHeartbeat,
  dispatchClinicAction,
  resetClinicNodeState,
} from '../clinic-node.service';

/**
 * Test Suite: Clinic Agent Heartbeat, Diagnostics & Action Queuing
 * Enforces contracts between local clinic background agent and cloud Rad Suite.
 */

// Zod Schema mirror from src/app/api/clinic-node/heartbeat/route.ts
const HeartbeatSchema = z.object({
  nodeId: z.string().optional(),
  token: z.string().optional(),
  status: z.enum(['running', 'stopped', 'starting', 'stopping', 'unknown']).optional(),
  disk: z
    .object({
      totalGb: z.number(),
      usedGb: z.number(),
      freeGb: z.number(),
      usedPercent: z.number(),
    })
    .optional(),
  casesToday: z.number().optional(),
  instancesToday: z.number().optional(),
  syncedStudies: z.array(z.any()).optional(),
  googleDrive: z
    .object({
      configured: z.boolean(),
      folderId: z.string().optional(),
      totalSynced: z.number().optional(),
      lastTestMessage: z.string().nullable().optional(),
      lastTestSuccess: z.boolean().nullable().optional(),
    })
    .optional(),
  pacsStatus: z
    .object({
      connected: z.boolean(),
      latencyMs: z.number().optional(),
      message: z.string().optional(),
      targetHost: z.string().optional(),
      targetPort: z.number().optional(),
      lastChecked: z.string().optional(),
    })
    .optional(),
  syncPaused: z.boolean().optional(),
  schedule: z
    .object({
      enabled: z.boolean(),
      startHour: z.number(),
      endHour: z.number(),
      allowWeekends: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  diagnostics: z
    .object({
      timestamp: z.string(),
      orthancHttp: z.object({
        status: z.enum(['pass', 'fail']),
        latencyMs: z.number().optional(),
        version: z.string().optional(),
      }),
      orthancDicom: z.object({
        status: z.enum(['pass', 'fail']),
        port: z.number().optional(),
      }),
      s3Write: z.object({
        status: z.enum(['pass', 'fail']),
        latencyMs: z.number().optional(),
        bucket: z.string().optional(),
      }),
      hospitalPacs: z.object({
        status: z.enum(['pass', 'fail', 'skipped']),
        host: z.string().optional(),
        port: z.number().optional(),
        latencyMs: z.number().optional(),
      }),
      disk: z.object({
        status: z.enum(['pass', 'warn', 'fail']),
        freeGb: z.number(),
        usedPercent: z.number(),
      }),
    })
    .nullable()
    .optional(),
  compression: z
    .object({
      enabled: z.boolean(),
      method: z.string(),
    })
    .optional(),
});

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('Clinic Node Heartbeat & Telemetry Contract', () => {
  const mockAdmin = { id: 'admin-1', name: 'Dr. Admin' };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetClinicNodeState();
  });

  it('validates heartbeat schema accepts null values for lastTestMessage and lastTestSuccess', () => {
    const rawPayload = {
      nodeId: 'clinic-pc-primary',
      token: 'clinic-secret-token',
      status: 'stopped' as const,
      disk: { totalGb: 661.7, usedGb: 535.5, freeGb: 126.3, usedPercent: 81 },
      googleDrive: {
        configured: false,
        folderId: '',
        totalSynced: 0,
        lastTestMessage: null,
        lastTestSuccess: null,
      },
      pacsStatus: {
        connected: false,
        message: 'Timeout (Check Ethernet cable / Hospital LAN)',
        targetHost: '10.0.0.100',
        targetPort: 8040,
        lastChecked: new Date().toISOString(),
      },
    };

    const parsed = HeartbeatSchema.safeParse(rawPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.googleDrive?.lastTestMessage).toBeNull();
      expect(parsed.data.googleDrive?.lastTestSuccess).toBeNull();
      expect(parsed.data.pacsStatus?.connected).toBe(false);
      expect(parsed.data.pacsStatus?.targetHost).toBe('10.0.0.100');
    }
  });

  it('correctly persists and reports pacsStatus and googleDrive telemetry', () => {
    recordClinicHeartbeat({
      nodeId: 'clinic-pc-primary',
      orthancStatus: 'running',
      pacsStatus: {
        connected: true,
        latencyMs: 4,
        message: 'Connected (4ms)',
        targetHost: '10.0.0.100',
        targetPort: 8040,
        lastChecked: '2026-09-30T10:00:00Z',
      },
      googleDrive: {
        configured: true,
        folderId: '1AbCdEfGhIjKlMnOp',
        totalSynced: 19,
        lastTestMessage: 'Key verified',
        lastTestSuccess: true,
      },
    });

    const status = getClinicNodeStatus();
    expect(status.online).toBe(true);
    expect(status.pacsStatus?.connected).toBe(true);
    expect(status.pacsStatus?.latencyMs).toBe(4);
    expect(status.googleDrive?.configured).toBe(true);
    expect(status.googleDrive?.folderId).toBe('1AbCdEfGhIjKlMnOp');
    expect(status.googleDrive?.totalSynced).toBe(19);
  });

  it('queues ping-pacs action and delivers it to the clinic agent', async () => {
    const dispatchResult = await dispatchClinicAction('ping-pacs', mockAdmin);
    expect(dispatchResult.success).toBe(true);

    // Agent polls heartbeat
    const res = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(res.pendingAction).toBe('ping-pacs');

    // Consumed
    const secondRes = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(secondRes.pendingAction).toBeNull();
  });

  it('serializes set-gdrive-folder payload with JSON encoding', async () => {
    await dispatchClinicAction('set-gdrive-folder', mockAdmin, {
      folderId: '0BwwAAB5xxxx',
    });

    const res = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(res.pendingAction).toBe('set-gdrive-folder:{"folderId":"0BwwAAB5xxxx"}');
  });

  it('queues harvest-pacs action with payload and delivers it on heartbeat', async () => {
    await dispatchClinicAction('harvest-pacs', mockAdmin, {
      modality: 'MR',
      date: 'today',
    });

    const res = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(res.pendingAction).toBe('harvest-pacs:{"modality":"MR","date":"today"}');

    // Action should be cleared after consumption
    const nextRes = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(nextRes.pendingAction).toBeNull();
  });

  it('queues fetch-accession action and delivers it to clinic agent', async () => {
    await dispatchClinicAction('fetch-accession', mockAdmin, {
      accession: '2609012345',
    });

    const res = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(res.pendingAction).toBe('fetch-accession:{"accession":"2609012345"}');
  });

  it('queues pause-sync, set-schedule, and run-diagnostics actions', async () => {
    // 1. Pause sync
    await dispatchClinicAction('pause-sync', mockAdmin);
    let hb = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(hb.pendingAction).toBe('pause-sync');

    // 2. Set schedule
    await dispatchClinicAction('set-schedule', mockAdmin, {
      enabled: true,
      startHour: 22,
      endHour: 6,
    });
    hb = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(hb.pendingAction).toBe('set-schedule:{"enabled":true,"startHour":22,"endHour":6}');

    // 3. Run diagnostics
    await dispatchClinicAction('run-diagnostics', mockAdmin);
    hb = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(hb.pendingAction).toBe('run-diagnostics');
  });
});
