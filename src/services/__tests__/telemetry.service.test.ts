import { describe, it, expect, beforeEach } from 'vitest';
import { telemetryService } from '../telemetry.service';
import { db } from '@/db';
import { clientWorkstations, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Workstation Telemetry & System Analytics Service Suite', () => {
  const testMachineId = `test_ws_${crypto.randomUUID()}`;

  beforeEach(async () => {
    // Cleanup any test machine records
    await db.delete(clientWorkstations).where(eq(clientWorkstations.machineId, testMachineId));
  });

  it('records a new client workstation heartbeat successfully', async () => {
    const res = await telemetryService.recordHeartbeat({
      machineId: testMachineId,
      hostname: 'Workstation-Dell-Precision',
      platform: 'windows',
      osVersion: 'Windows 11 Pro 64-bit',
      appVersion: '1.0.1',
      userName: 'Dr. Jane Doe',
      ipAddress: '192.168.10.55',
      metadata: { gpuAccelerated: true, cpuCores: 16 },
    });

    expect(res.success).toBe(true);
    expect(res.id).toBeDefined();

    // Verify record in database
    const [row] = await db
      .select()
      .from(clientWorkstations)
      .where(eq(clientWorkstations.machineId, testMachineId));

    expect(row).toBeDefined();
    expect(row.hostname).toBe('Workstation-Dell-Precision');
    expect(row.platform).toBe('windows');
    expect(row.appVersion).toBe('1.0.1');
    expect(row.lastUserName).toBe('Dr. Jane Doe');
  });

  it('updates an existing workstation on subsequent heartbeats', async () => {
    // Initial heartbeat
    await telemetryService.recordHeartbeat({
      machineId: testMachineId,
      hostname: 'Initial-Host',
      platform: 'windows',
      appVersion: '1.0.0',
    });

    // Subsequent heartbeat with updated version
    const updated = await telemetryService.recordHeartbeat({
      machineId: testMachineId,
      hostname: 'Updated-Host',
      platform: 'windows',
      appVersion: '1.0.1',
      userName: 'Dr. Consultant',
    });

    expect(updated.success).toBe(true);

    const [row] = await db
      .select()
      .from(clientWorkstations)
      .where(eq(clientWorkstations.machineId, testMachineId));

    expect(row.hostname).toBe('Updated-Host');
    expect(row.appVersion).toBe('1.0.1');
    expect(row.lastUserName).toBe('Dr. Consultant');
  });

  it('rejects heartbeat if machine ID is blank or missing', async () => {
    await expect(
      telemetryService.recordHeartbeat({
        machineId: '   ',
        hostname: 'Invalid',
      })
    ).rejects.toThrow('Machine ID is required');
  });

  it('lists registered workstations with online status calculation', async () => {
    await telemetryService.recordHeartbeat({
      machineId: testMachineId,
      hostname: 'Active-Workstation-1',
      platform: 'windows',
      appVersion: '1.0.1',
    });

    const list = await telemetryService.listWorkstations(50);
    expect(Array.isArray(list)).toBe(true);

    const found = list.find((w) => w.machineId === testMachineId);
    expect(found).toBeDefined();
    expect(found?.status).toBe('online');
    expect(found?.hostname).toBe('Active-Workstation-1');
  });

  it('records desktop installer download audit logs', async () => {
    await telemetryService.recordDownload({
      fileName: 'Rad Suite_1.0.1_x64-setup.exe',
      ipAddress: '10.0.0.99',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'download_desktop_installer'))
      .orderBy(eq(auditLog.createdAt, auditLog.createdAt))
      .limit(1);

    expect(entry).toBeDefined();
    expect(entry.action).toBe('download_desktop_installer');
  });

  it('computes comprehensive telemetry summary for admin command center', async () => {
    await telemetryService.recordHeartbeat({
      machineId: testMachineId,
      hostname: 'Summary-Host',
      platform: 'windows',
      appVersion: '1.0.1',
    });

    const summary = await telemetryService.getTelemetrySummary();

    expect(summary.users).toBeDefined();
    expect(summary.users.total).toBeGreaterThanOrEqual(0);
    expect(summary.workstations).toBeDefined();
    expect(summary.workstations.totalInstalled).toBeGreaterThan(0);
    expect(summary.workstations.onlineNow).toBeGreaterThan(0);
    expect(summary.downloads).toBeDefined();
  });
});
