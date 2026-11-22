// Layer 2: Workstation Backup, Export & Migration Service
// Invariant: Strictly under 250 lines. All database operations parameterized.

import { db } from '@/db';
import { patients, studies, reports, reportRevisions, templates } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { logAudit } from './audit.service';
import { applyCaseBundle, buildCaseBundle } from './sync/case-sync-bundle.service';
import { z } from 'zod';
import type { User } from '@/types';

export const WorkstationBackupSchema = z.object({
  version: z.string().default('1.0.0'),
  exportedAt: z.string(),
  exportedBy: z.string().optional(),
  cases: z.array(z.any()).default([]),
  customTemplates: z.array(z.any()).default([]),
});

export type WorkstationBackupPayload = z.infer<typeof WorkstationBackupSchema>;

export class BackupService {
  /**
   * Generates a complete standalone JSON archive of all local cases, reports, and templates.
   */
  public async exportAllData(actorUser: User): Promise<WorkstationBackupPayload> {
    const allStudies = await db.select({ accessionNumber: studies.accessionNumber }).from(studies);
    const caseBundles: any[] = [];

    for (const s of allStudies) {
      if (!s.accessionNumber) continue;
      const bundle = await buildCaseBundle(s.accessionNumber);
      if (bundle && bundle.action !== 'delete') {
        caseBundles.push(bundle);
      }
    }

    const allTemplates = await db.select().from(templates).catch(() => []);

    await logAudit({
      userId: actorUser.id,
      userName: actorUser.name,
      action: 'BACKUP_EXPORT',
      entityType: 'SystemBackup',
      details: `Exported ${caseBundles.length} cases and ${allTemplates.length} templates.`,
    });

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: actorUser.name,
      cases: caseBundles,
      customTemplates: allTemplates,
    };
  }

  /**
   * Ingests an uploaded workstation backup JSON and merges cases safely.
   */
  public async importBackupData(
    rawJson: unknown,
    actorUser: User
  ): Promise<{ success: boolean; importedCases: number; importedTemplates: number; conflicts: number }> {
    const parsed = WorkstationBackupSchema.safeParse(rawJson);
    if (!parsed.success) {
      throw new Error(`Invalid backup file format: ${parsed.error.errors[0]?.message || 'Schema mismatch'}`);
    }

    const { cases, customTemplates } = parsed.data;
    let importedCases = 0;
    let conflicts = 0;

    for (const bundle of cases) {
      if (!bundle || !bundle.accessionNumber) continue;
      try {
        const result = await applyCaseBundle(bundle, actorUser);
        if (result.success) {
          importedCases++;
          if (result.conflict) conflicts++;
        }
      } catch (err) {
        console.warn(`[BACKUP_IMPORT_WARN] Failed ingesting accession ${bundle.accessionNumber}:`, err);
      }
    }

    let importedTemplates = 0;
    if (Array.isArray(customTemplates) && customTemplates.length > 0) {
      for (const t of customTemplates) {
        if (!t.name || !t.id) continue;
        try {
          await db
            .insert(templates)
            .values({
              id: t.id,
              name: t.name,
              category: t.category || 'general',
              modality: t.modality || 'ALL',
              bodyPart: t.bodyPart || 'General',
              findings: t.findings || '',
              impression: t.impression || '',
              technique: t.technique || '',
              comparison: t.comparison || '',
              isStandard: Boolean(t.isStandard),
              createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
              updatedAt: new Date(),
            } as any)
            .onConflictDoNothing();
          importedTemplates++;
        } catch {}
      }
    }

    await logAudit({
      userId: actorUser.id,
      userName: actorUser.name,
      action: 'BACKUP_IMPORT',
      entityType: 'SystemBackup',
      details: `Imported ${importedCases} cases and ${importedTemplates} templates (Conflicts preserved: ${conflicts}).`,
    });

    return {
      success: true,
      importedCases,
      importedTemplates,
      conflicts,
    };
  }
}

export const backupService = new BackupService();
