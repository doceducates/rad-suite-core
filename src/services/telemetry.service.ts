// Layer 2 (Domain/Services): Workstation Telemetry & System Analytics Service
import { eq, desc, sql, gte } from 'drizzle-orm';
import { db } from '@/db';
import { clientWorkstations, users, preRegistrations, auditLog } from '@/db/schema';
import { logAudit } from './audit.service';
import { getAllClinicNodes } from './clinic-node.service';

export interface HeartbeatPayload {
  machineId: string;
  hostname?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface TelemetrySummary {
  users: {
    total: number;
    active: number;
    waitlisted: number;
    pendingInvite: number;
  };
  workstations: {
    totalInstalled: number;
    onlineNow: number;
    byPlatform: Record<string, number>;
  };
  clinicNodes: {
    total: number;
    online: number;
  };
  downloads: {
    totalDownloads: number;
    lastDownloadAt?: string;
  };
}

export interface WorkstationItem {
  id: string;
  machineId: string;
  hostname: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  lastUserId?: string | null;
  lastUserName?: string | null;
  ipAddress: string;
  status: 'online' | 'offline';
  metadata: Record<string, any>;
  installedAt: string;
  lastSeenAt: string;
}

const ONLINE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const telemetryService = {
  /**
   * Upserts client workstation heartbeat
   */
  async recordHeartbeat(data: HeartbeatPayload): Promise<{ success: boolean; id: string }> {
    if (!data.machineId || data.machineId.trim().length === 0) {
      throw new Error('Machine ID is required for workstation heartbeat');
    }

    const cleanMachineId = data.machineId.trim();
    const nowIso = new Date().toISOString();

    const [existing] = await db
      .select()
      .from(clientWorkstations)
      .where(eq(clientWorkstations.machineId, cleanMachineId))
      .limit(1);

    if (existing) {
      await db
        .update(clientWorkstations)
        .set({
          hostname: data.hostname || existing.hostname || '',
          platform: data.platform || existing.platform || 'windows',
          osVersion: data.osVersion || existing.osVersion || '',
          appVersion: data.appVersion || existing.appVersion || '1.0.0',
          lastUserId: data.userId || existing.lastUserId,
          lastUserName: data.userName || existing.lastUserName || '',
          ipAddress: data.ipAddress || existing.ipAddress || '',
          status: 'online',
          metadata: data.metadata ? JSON.stringify(data.metadata) : existing.metadata,
          lastSeenAt: nowIso as any,
        })
        .where(eq(clientWorkstations.id, existing.id));

      return { success: true, id: existing.id };
    }

    const newId = crypto.randomUUID();
    await db.insert(clientWorkstations).values({
      id: newId,
      machineId: cleanMachineId,
      hostname: data.hostname || '',
      platform: data.platform || 'windows',
      osVersion: data.osVersion || '',
      appVersion: data.appVersion || '1.0.0',
      lastUserId: data.userId,
      lastUserName: data.userName || '',
      ipAddress: data.ipAddress || '',
      status: 'online',
      metadata: JSON.stringify(data.metadata || {}),
      installedAt: nowIso as any,
      lastSeenAt: nowIso as any,
    });

    return { success: true, id: newId };
  },

  /**
   * Records a desktop installer download audit event
   */
  async recordDownload(info: { userAgent?: string; ipAddress?: string; fileName?: string }): Promise<void> {
    try {
      await logAudit({
        action: 'download_desktop_installer',
        entityType: 'System',
        entityId: info.fileName || 'RadSuite_Desktop',
        details: `Workstation installer downloaded: ${info.fileName || 'Desktop Setup'}`,
        ipAddress: info.ipAddress || '127.0.0.1',
        userAgent: info.userAgent || '',
      });
    } catch (err) {
      console.warn('[TELEMETRY_WARN] Failed recording download audit log:', err);
    }
  },

  /**
   * Fetches high-level telemetry and KPI summary for admin dashboard
   */
  async getTelemetrySummary(): Promise<TelemetrySummary> {
    const now = Date.now();
    const thresholdIso = new Date(now - ONLINE_WINDOW_MS).toISOString();

    // 1. Users metrics
    const allUsers = await db.select({ status: users.status }).from(users);
    const userSummary = {
      total: allUsers.length,
      active: allUsers.filter((u) => u.status === 'active').length,
      waitlisted: allUsers.filter((u) => u.status === 'waitlisted').length,
      pendingInvite: allUsers.filter((u) => u.status === 'pending_invite').length,
    };

    // 2. Workstation metrics
    const allWorkstations = await db.select().from(clientWorkstations);
    const byPlatform: Record<string, number> = {};
    let onlineCount = 0;

    for (const ws of allWorkstations) {
      const plat = ws.platform || 'windows';
      byPlatform[plat] = (byPlatform[plat] || 0) + 1;

      const lastSeen = new Date(ws.lastSeenAt as any).getTime();
      if (!isNaN(lastSeen) && now - lastSeen <= ONLINE_WINDOW_MS) {
        onlineCount++;
      }
    }

    // 3. Clinic Nodes metrics
    let nodeTotal = 0;
    let nodeOnline = 0;
    try {
      const nodes = getAllClinicNodes();
      nodeTotal = nodes.length;
      nodeOnline = nodes.filter((n) => n.status === 'online').length;
    } catch {}

    // 4. Download metrics
    let downloadCount = 0;
    let lastDownloadAt: string | undefined;
    try {
      const downloads = await db
        .select({ timestamp: auditLog.timestamp })
        .from(auditLog)
        .where(eq(auditLog.action, 'download_desktop_installer'))
        .orderBy(desc(auditLog.createdAt))
        .limit(100);

      downloadCount = downloads.length;
      if (downloads.length > 0 && downloads[0].timestamp) {
        lastDownloadAt = downloads[0].timestamp;
      }
    } catch {}

    return {
      users: userSummary,
      workstations: {
        totalInstalled: allWorkstations.length,
        onlineNow: onlineCount,
        byPlatform,
      },
      clinicNodes: {
        total: nodeTotal,
        online: nodeOnline,
      },
      downloads: {
        totalDownloads: downloadCount,
        lastDownloadAt,
      },
    };
  },

  /**
   * Lists registered workstations with online status calculation
   */
  async listWorkstations(limit = 50): Promise<WorkstationItem[]> {
    const rows = await db
      .select()
      .from(clientWorkstations)
      .orderBy(desc(clientWorkstations.lastSeenAt))
      .limit(limit);

    const now = Date.now();

    return rows.map((r) => {
      const lastSeenMs = new Date(r.lastSeenAt as any).getTime();
      const isOnline = !isNaN(lastSeenMs) && now - lastSeenMs <= ONLINE_WINDOW_MS;

      let meta: Record<string, any> = {};
      try {
        meta = JSON.parse(r.metadata || '{}');
      } catch {}

      return {
        id: r.id,
        machineId: r.machineId,
        hostname: r.hostname || 'Unknown Host',
        platform: r.platform || 'windows',
        osVersion: r.osVersion || '',
        appVersion: r.appVersion || '1.0.0',
        lastUserId: r.lastUserId,
        lastUserName: r.lastUserName,
        ipAddress: r.ipAddress || '',
        status: isOnline ? 'online' : 'offline',
        metadata: meta,
        installedAt: String(r.installedAt),
        lastSeenAt: String(r.lastSeenAt),
      };
    });
  },
};
