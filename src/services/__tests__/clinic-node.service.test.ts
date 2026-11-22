import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getClinicNodeStatus,
  getAllClinicNodes,
  recordClinicHeartbeat,
  dispatchClinicAction,
  resetClinicNodeState,
} from '../clinic-node.service';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('Clinic Node Service - Telemetry & Remote Control', () => {
  const mockAdmin = {
    id: 'admin-uuid-1',
    name: 'Dr. System Administrator',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetClinicNodeState();
  });

  it('reports node as offline when no recent heartbeat has been received', () => {
    const status = getClinicNodeStatus();
    expect(status.online).toBe(false);
    expect(status.nodeId).toBe('clinic-pc-primary');
    expect(status.orthancStatus).toBe('stopped');
  });

  it('updates telemetry and marks node as online when heartbeat is received', () => {
    const heartbeatData = {
      nodeId: 'clinic-pc-primary',
      orthancStatus: 'running' as const,
      disk: { totalGb: 500, usedGb: 120, freeGb: 380, usedPercent: 24 },
      casesToday: 14,
      instancesToday: 820,
      syncedStudies: [
        {
          id: 'PATIENT_1_20260930',
          patientName: 'John Doe',
          patientId: 'MRN-101',
          accession: 'ACC-555',
          modality: 'CT',
          studyDate: '20260930',
          time: '11:20 AM',
          status: 'synced' as const,
        },
      ],
    };

    const res = recordClinicHeartbeat(heartbeatData);
    expect(res.success).toBe(true);
    expect(res.pendingAction).toBeNull();

    const status = getClinicNodeStatus();
    expect(status.online).toBe(true);
    expect(status.orthancStatus).toBe('running');
    expect(status.casesToday).toBe(14);
    expect(status.instancesToday).toBe(820);
    expect(status.disk.usedPercent).toBe(24);
    expect(status.syncedStudies.length).toBe(1);
  });

  it('queues an action and delivers it to the clinic agent on next heartbeat', async () => {
    const queueRes = await dispatchClinicAction('start', mockAdmin);
    expect(queueRes.success).toBe(true);

    // Node sends heartbeat, receiving queued action
    const heartbeatRes = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(heartbeatRes.pendingAction).toBe('start');

    // Subsequent heartbeat has null pendingAction because it was consumed
    const nextHeartbeat = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(nextHeartbeat.pendingAction).toBeNull();
  });

  it('records audit log when admin dispatches a clinic node action', async () => {
    const { logAudit } = await import('../audit.service');
    await dispatchClinicAction('clear-cache', mockAdmin);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_CLINIC_NODE_ACTION',
        userId: mockAdmin.id,
        userName: mockAdmin.name,
        entityType: 'System',
      })
    );
  });

  it('handles pause-sync, set-schedule, and diagnostics telemetry', async () => {
    // Admin queues pause-sync
    await dispatchClinicAction('pause-sync', mockAdmin);

    // Heartbeat receives action and updates diagnostics telemetry
    const hb = recordClinicHeartbeat({
      nodeId: 'clinic-pc-primary',
      syncPaused: true,
      schedule: { enabled: true, startHour: 21, endHour: 7, allowWeekends: false },
      compression: { enabled: true, method: 'deflate' },
      diagnostics: {
        timestamp: new Date().toISOString(),
        orthancHttp: { status: 'pass', latencyMs: 14, version: '1.12.1' },
        orthancDicom: { status: 'pass', port: 11115 },
        s3Write: { status: 'pass', latencyMs: 76, bucket: 'rad-suite' },
        hospitalPacs: { status: 'pass', host: '10.0.0.100', port: 8040, latencyMs: 25 },
        disk: { status: 'pass', freeGb: 280, usedPercent: 45 },
      },
    });

    expect(hb.pendingAction).toBe('pause-sync');

    const status = getClinicNodeStatus();
    expect(status.syncPaused).toBe(true);
    expect(status.schedule?.startHour).toBe(21);
    expect(status.schedule?.allowWeekends).toBe(false);
    expect(status.compression?.method).toBe('deflate');
    expect(status.diagnostics?.orthancHttp.status).toBe('pass');
    expect(status.diagnostics?.s3Write.status).toBe('pass');
    expect(status.diagnostics?.hospitalPacs.status).toBe('pass');
  });

  it('supports tracking multiple clinic nodes independently and routing actions to target nodes', async () => {
    // Node 1 (MRI) sends heartbeat
    recordClinicHeartbeat({
      nodeId: 'clinic-mri-01',
      orthancStatus: 'running',
      casesToday: 10,
    });

    // Node 2 (CT) sends heartbeat
    recordClinicHeartbeat({
      nodeId: 'clinic-ct-02',
      orthancStatus: 'running',
      casesToday: 25,
    });

    // Queue action targeted specifically at Node 2
    await dispatchClinicAction('restart', mockAdmin, undefined, 'clinic-ct-02');

    // Both nodes exist in all nodes list
    const all = getAllClinicNodes();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.some((n) => n.nodeId === 'clinic-mri-01' && n.casesToday === 10)).toBe(true);
    expect(all.some((n) => n.nodeId === 'clinic-ct-02' && n.casesToday === 25)).toBe(true);

    // Node 1 heartbeats - should NOT receive Node 2's action
    const hb1 = recordClinicHeartbeat({ nodeId: 'clinic-mri-01' });
    expect(hb1.pendingAction).toBeNull();

    // Node 2 heartbeats - should receive its targeted action
    const hb2 = recordClinicHeartbeat({ nodeId: 'clinic-ct-02' });
    expect(hb2.pendingAction).toBe('restart');
  });

  it('allows registering and decommissioning clinic nodes', async () => {
    const regRes = await dispatchClinicAction('register-node', mockAdmin, { targetCases: 60 }, 'clinic-xr-03');
    expect(regRes.success).toBe(true);

    const status = getClinicNodeStatus('clinic-xr-03');
    expect(status.nodeId).toBe('clinic-xr-03');

    const removeRes = await dispatchClinicAction('remove-node', mockAdmin, undefined, 'clinic-xr-03');
    expect(removeRes.success).toBe(true);

    const all = getAllClinicNodes();
    expect(all.some((n) => n.nodeId === 'clinic-xr-03')).toBe(false);
  });

  it('dispatches uninstall-agent action and delivers it to node on next heartbeat', async () => {
    const queueRes = await dispatchClinicAction('uninstall-agent', mockAdmin, undefined, 'clinic-pc-primary');
    expect(queueRes.success).toBe(true);

    const hb = recordClinicHeartbeat({ nodeId: 'clinic-pc-primary' });
    expect(hb.pendingAction).toBe('uninstall-agent');

    const status = getClinicNodeStatus('clinic-pc-primary');
    expect(status.orthancStatus).toBe('stopped');
  });

  it('allows nicknaming and renaming a clinic node with persistent updates', async () => {
    recordClinicHeartbeat({
      nodeId: 'node-desktop-1ldu8l1',
      hostname: 'DESKTOP-1LDU8L1',
      name: 'DESKTOP-1LDU8L1',
      orthancStatus: 'running',
    });

    const renameRes = await dispatchClinicAction('rename-node', mockAdmin, { name: 'Main MRI 1.5T Console' }, 'node-desktop-1ldu8l1');
    expect(renameRes.success).toBe(true);

    const status = getClinicNodeStatus('node-desktop-1ldu8l1');
    expect(status.name).toBe('Main MRI 1.5T Console');
    expect(status.hostname).toBe('DESKTOP-1LDU8L1');

    // Heartbeat with default name does not overwrite custom nickname
    recordClinicHeartbeat({
      nodeId: 'node-desktop-1ldu8l1',
      hostname: 'DESKTOP-1LDU8L1',
      name: 'DESKTOP-1LDU8L1',
    });
    const statusAfter = getClinicNodeStatus('node-desktop-1ldu8l1');
    expect(statusAfter.name).toBe('Main MRI 1.5T Console');
  });

  it('supports 1-click pause-sync and resume-sync toggling', async () => {
    const pauseRes = await dispatchClinicAction('pause-sync', mockAdmin, undefined, 'node-desktop-1ldu8l1');
    expect(pauseRes.success).toBe(true);
    expect(getClinicNodeStatus('node-desktop-1ldu8l1').syncPaused).toBe(true);

    const resumeRes = await dispatchClinicAction('resume-sync', mockAdmin, undefined, 'node-desktop-1ldu8l1');
    expect(resumeRes.success).toBe(true);
    expect(getClinicNodeStatus('node-desktop-1ldu8l1').syncPaused).toBe(false);
  });

  it('permanently decommissions a node and prunes it from active nodes', async () => {
    recordClinicHeartbeat({
      nodeId: 'node-to-delete',
      hostname: 'DESKTOP-OBSOLETE',
      name: 'Obsolete Machine',
    });
    expect(getAllClinicNodes().some((n) => n.nodeId === 'node-to-delete')).toBe(true);

    const removeRes = await dispatchClinicAction('remove-node', mockAdmin, { uninstallAgent: true }, 'node-to-delete');
    expect(removeRes.success).toBe(true);
    expect(getAllClinicNodes().some((n) => n.nodeId === 'node-to-delete')).toBe(false);

    // Active status does not return decommissioned node
    const active = getClinicNodeStatus();
    expect(active.nodeId).not.toBe('node-to-delete');

    // If decommissioned node attempts to send heartbeat, it receives uninstall-agent and does not resurrect
    const rogueHb = recordClinicHeartbeat({ nodeId: 'node-to-delete' });
    expect(rogueHb.pendingAction).toBe('uninstall-agent');
    expect(getAllClinicNodes().some((n) => n.nodeId === 'node-to-delete')).toBe(false);
  });
});
