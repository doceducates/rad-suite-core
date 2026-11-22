import crypto from 'crypto';
import { db } from '@/db';
import { pacsServers } from '@/db/schema';
import { eq, or, isNull, and } from 'drizzle-orm';
import type { PacsServer } from '@/types/pacs';

export const CLINIC_EDGE_PACS: PacsServer = {
  id: 'pacs-clinic-edge',
  name: 'Clinic PACS Archive',
  aeTitle: 'RADIANT',
  host: '127.0.0.1',
  port: 11115,
  callingAeTitle: 'RAD_SUITE',
  listenerPort: 11112,
  retrieveProtocol: 'C-GET',
  isDefault: true,
  isActive: true,
  description: 'On-premise high-speed diagnostic DICOM vault',
  lastPingStatus: 'online',
  createdAt: new Date().toISOString(),
};

export const DEFAULT_LGH_PACS: PacsServer = {
  id: 'pacs-default',
  name: process.env.DEFAULT_PACS_NAME || 'Hospital Central PACS',
  aeTitle: process.env.DEFAULT_PACS_AET || 'PACS_CENTRAL',
  host: process.env.DEFAULT_PACS_HOST || '127.0.0.1',
  port: parseInt(process.env.DEFAULT_PACS_PORT || '8040', 10),
  callingAeTitle: process.env.DEFAULT_CALLING_AET || 'RAD_SUITE',
  listenerPort: 11112,
  retrieveProtocol: 'C-GET',
  isDefault: true,
  isActive: true,
  description: 'Hospital Radiology PACS Archive',
  lastPingStatus: 'unknown',
  createdAt: new Date().toISOString(),
};

export async function getPacsServers(userId?: string, isAdmin = false): Promise<PacsServer[]> {
  try {
    let rows: any[] = [];
    if (isAdmin) {
      rows = await db.select().from(pacsServers);
    } else if (userId) {
      rows = await db
        .select()
        .from(pacsServers)
        .where(or(isNull(pacsServers.userId), eq(pacsServers.userId, userId)));
    } else {
      rows = await db
        .select()
        .from(pacsServers)
        .where(isNull(pacsServers.userId));
    }

    if (rows && rows.length > 0) {
      const mapped = rows.map((r: any) => ({
        ...r,
        isDefault: Boolean(r.isDefault),
        isActive: Boolean(r.isActive),
      }));
      // Ensure Clinic PACS (Admin only) and LGH default are included
      if (isAdmin && !mapped.some((s) => s.id === CLINIC_EDGE_PACS.id)) {
        mapped.unshift(CLINIC_EDGE_PACS);
      }
      if (!mapped.some((s) => s.id === DEFAULT_LGH_PACS.id || s.aeTitle === DEFAULT_LGH_PACS.aeTitle)) {
        mapped.push(DEFAULT_LGH_PACS);
      }
      return mapped;
    }
  } catch {}
  return isAdmin ? [CLINIC_EDGE_PACS, DEFAULT_LGH_PACS] : [DEFAULT_LGH_PACS];
}

export async function savePacsServer(
  data: Omit<PacsServer, 'id'> & { id?: string },
  userId?: string,
  isAdmin = false
): Promise<PacsServer> {
  const id = data.id || crypto.randomUUID();
  const effectiveUserId = isAdmin ? (data.userId ?? null) : (userId || null);

  // Non-admins cannot overwrite system presets
  if (!isAdmin && data.id) {
    const [existing] = await db.select().from(pacsServers).where(eq(pacsServers.id, data.id)).limit(1);
    if (existing && (!existing.userId || existing.userId !== userId)) {
      throw new Error('Unauthorized to modify this system PACS preset');
    }
  }

  const serverObj: PacsServer = {
    id,
    userId: effectiveUserId,
    name: data.name,
    aeTitle: data.aeTitle,
    host: data.host,
    port: data.port,
    callingAeTitle: data.callingAeTitle || 'RADIANT',
    listenerPort: data.listenerPort || 11112,
    retrieveProtocol: data.retrieveProtocol || 'C-GET',
    isDefault: data.isDefault ?? false,
    isActive: data.isActive ?? true,
    description: data.description || '',
    lastPingStatus: data.lastPingStatus || 'unknown',
    lastPingAt: data.lastPingAt || null,
    createdAt: new Date().toISOString(),
  };

  const dbValues = {
    ...serverObj,
    createdAt: new Date(),
    lastPingAt: data.lastPingAt ? new Date(data.lastPingAt) : null,
  };

  try {
    if (data.id) {
      await db.update(pacsServers).set(dbValues as any).where(eq(pacsServers.id, data.id));
    } else {
      await db.insert(pacsServers).values(dbValues as any);
    }
  } catch (err) {
    console.warn('[PACS_DB_WARN] Could not persist to table:', err);
  }
  return serverObj;
}

export async function deletePacsServer(id: string, userId?: string, isAdmin = false): Promise<boolean> {
  try {
    if (id === DEFAULT_LGH_PACS.id) {
      throw new Error('Cannot delete default LGH PACS server preset');
    }

    if (isAdmin) {
      await db.delete(pacsServers).where(eq(pacsServers.id, id));
      return true;
    }

    if (!userId) return false;
    const [existing] = await db.select().from(pacsServers).where(eq(pacsServers.id, id)).limit(1);
    if (!existing || existing.userId !== userId) {
      throw new Error('Unauthorized to delete this PACS server');
    }

    await db.delete(pacsServers).where(and(eq(pacsServers.id, id), eq(pacsServers.userId, userId)));
    return true;
  } catch (err: any) {
    console.warn('[PACS_DB_WARN] Could not delete server:', err.message);
    return false;
  }
}

export async function setDefaultPacsServer(id: string, userId?: string, isAdmin = false): Promise<boolean> {
  try {
    if (isAdmin) {
      await db.update(pacsServers).set({ isDefault: false } as any);
      await db.update(pacsServers).set({ isDefault: true } as any).where(eq(pacsServers.id, id));
      return true;
    }

    if (!userId) return false;
    await db.update(pacsServers).set({ isDefault: false } as any).where(eq(pacsServers.userId, userId));
    await db.update(pacsServers).set({ isDefault: true } as any).where(and(eq(pacsServers.id, id), eq(pacsServers.userId, userId)));
    return true;
  } catch (err) {
    console.warn('[PACS_DB_WARN] Could not set default server:', err);
    return false;
  }
}

export async function getDefaultPacsServer(userId?: string): Promise<PacsServer> {
  const servers = await getPacsServers(userId);
  const def = servers.find((s) => s.isDefault && s.isActive);
  return def || servers[0] || DEFAULT_LGH_PACS;
}

