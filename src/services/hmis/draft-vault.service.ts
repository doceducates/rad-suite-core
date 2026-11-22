/**
 * HMIS Durable Draft Vault Service
 * Guarantees zero data loss by recording pre-save drafts and audit verification states.
 */

import { eq, desc, and } from 'drizzle-orm';
import { db } from '@/db';
import { hmisDraftVault } from '@/db/schema';
import { logAudit } from '@/services/audit.service';

export interface CreateVaultDraftInput {
  accession: string;
  patientMrn: string;
  patientName?: string;
  investigationId?: string;
  moduleId: string;
  clinicalHistory?: string;
  technique?: string;
  findings: string;
  impression: string;
  comments?: string;
  pgrName?: string;
  consultantName?: string;
  userId?: string;
  userName?: string;
}

export async function createVaultDraft(input: CreateVaultDraftInput) {
  const existing = await db
    .select({ version: hmisDraftVault.version })
    .from(hmisDraftVault)
    .where(eq(hmisDraftVault.accession, input.accession))
    .orderBy(desc(hmisDraftVault.createdAt))
    .limit(1);

  const nextVersion = existing.length > 0 ? String(parseInt(existing[0].version || '0', 10) + 1) : '1';

  const [record] = await db
    .insert(hmisDraftVault)
    .values({
      accession: input.accession,
      patientMrn: input.patientMrn,
      patientName: input.patientName || '',
      investigationId: input.investigationId || '',
      moduleId: input.moduleId,
      version: nextVersion,
      clinicalHistory: input.clinicalHistory || '',
      technique: input.technique || '',
      findings: input.findings,
      impression: input.impression,
      comments: input.comments || '',
      pgrName: input.pgrName || '',
      consultantName: input.consultantName || '',
      status: 'pending',
    })
    .returning();

  await logAudit({
    userId: input.userId,
    userName: input.userName,
    action: 'hmis_draft_vault_created',
    entityType: 'HmisDraftVault',
    entityId: record?.id,
    details: `Created draft vault entry for accession ${input.accession} (v${nextVersion}, module ${input.moduleId})`,
  });

  return record;
}

export async function updateVaultStatus(
  vaultId: string,
  status: 'verified' | 'unverified' | 'failed' | 'reverted',
  options?: { verificationAudit?: string; auditScreenshot?: string; userId?: string }
) {
  const updateData: Record<string, any> = {
    status,
    verificationAudit: options?.verificationAudit || '',
    auditScreenshot: options?.auditScreenshot || '',
  };

  if (status === 'verified') {
    updateData.verifiedAt = new Date() as any;
  }

  const [updated] = await db
    .update(hmisDraftVault)
    .set(updateData)
    .where(eq(hmisDraftVault.id, vaultId))
    .returning();

  await logAudit({
    userId: options?.userId,
    action: `hmis_draft_vault_${status}`,
    entityType: 'HmisDraftVault',
    entityId: vaultId,
    details: `HMIS draft vault record marked ${status}`,
  });

  return updated;
}

export async function getLatestVaultDraft(accession: string) {
  const drafts = await db
    .select()
    .from(hmisDraftVault)
    .where(eq(hmisDraftVault.accession, accession))
    .orderBy(desc(hmisDraftVault.createdAt))
    .limit(1);

  return drafts[0] || null;
}

export async function getVaultHistory(accession: string) {
  return await db
    .select()
    .from(hmisDraftVault)
    .where(eq(hmisDraftVault.accession, accession))
    .orderBy(desc(hmisDraftVault.createdAt));
}
