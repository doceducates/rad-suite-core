import crypto from 'crypto';
import { desc, asc } from 'drizzle-orm';
import { db } from '@/db';
import { auditLog } from '@/db/schema';

export interface LogAuditParams {
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const AUDIT_GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function computeAuditHash(
  prevHash: string,
  timestamp: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash}|${timestamp}|${userId}|${action}|${entityType}|${entityId}|${details}`)
    .digest('hex');
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    let prevHash = AUDIT_GENESIS_HASH;

    try {
      const lastEntry = await db
        .select({ hash: auditLog.hash })
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(1);

      if (lastEntry[0]?.hash) {
        prevHash = lastEntry[0].hash;
      }
    } catch {
      // Fallback to genesis hash if table is empty or error occurs
    }

    const currentHash = computeAuditHash(
      prevHash,
      timestamp,
      params.userId || '',
      params.action,
      params.entityType,
      params.entityId || '',
      params.details || ''
    );

    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      prevHash,
      hash: currentHash,
      createdAt: new Date() as any,
    });
  } catch (error) {
    // Non-blocking: log to console so audit failure doesn't halt clinical operations
    console.error('[AUDIT_ERROR] Failed to record audit log:', error);
  }
}

export async function verifyAuditIntegrity(): Promise<{
  valid: boolean;
  tamperedId?: string;
  totalRecords: number;
}> {
  try {
    const records = await db.select().from(auditLog).orderBy(asc(auditLog.createdAt));
    let expectedPrevHash = AUDIT_GENESIS_HASH;

    for (const record of records) {
      if (!record.hash) {
        // Legacy unhashed record, skip validation
        continue;
      }
      if (record.prevHash && record.prevHash !== expectedPrevHash) {
        return { valid: false, tamperedId: record.id, totalRecords: records.length };
      }
      const timeStr =
        typeof record.createdAt === 'string'
          ? record.createdAt
          : (record.createdAt as Date).toISOString();
      const expectedHash = computeAuditHash(
        record.prevHash || AUDIT_GENESIS_HASH,
        timeStr,
        record.userId || '',
        record.action,
        record.entityType,
        record.entityId || '',
        record.details || ''
      );
      if (expectedHash !== record.hash) {
        return { valid: false, tamperedId: record.id, totalRecords: records.length };
      }
      expectedPrevHash = record.hash;
    }

    return { valid: true, totalRecords: records.length };
  } catch (err) {
    console.error('[AUDIT_VERIFY_ERROR]', err);
    return { valid: false, totalRecords: 0 };
  }
}
