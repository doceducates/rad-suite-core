// Layer 2: Settings Synchronization Service (Templates, PACS Sources, Edge Settings)
import crypto from 'crypto';
import { db } from '@/db';
import { templates, pacsServers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { SettingsSyncBundle } from './case-sync-types';
import { getClinicNodeStatus, updateClinicNodeConfig } from '../clinic-node.service';
import { logAudit } from '../audit.service';

export async function exportSettingsBundle(): Promise<SettingsSyncBundle> {
  let allTemplates: any[] = [];
  let allPacsServers: any[] = [];

  try {
    allTemplates = await db.select().from(templates);
  } catch {}

  try {
    allPacsServers = await db.select().from(pacsServers);
  } catch {}

  const clinicStatus = getClinicNodeStatus('clinic-pc-primary');
  const clinicSettings = {
    maxStorageSizeGb: clinicStatus.disk?.maxStorageSizeGb,
    autoRetention: clinicStatus.autoRetention,
    heartbeatIntervalMs: clinicStatus.heartbeatIntervalMs,
    compression: clinicStatus.compression,
    syncRules: clinicStatus.syncRules,
    schedule: clinicStatus.schedule,
    harvestSchedule: clinicStatus.harvestSchedule,
    stallWatchdog: clinicStatus.stallWatchdog,
    peerCooperation: clinicStatus.peerCooperation,
  };

  return {
    templates: allTemplates,
    pacsServers: allPacsServers,
    clinicSettings,
    exportedAt: new Date().toISOString(),
  };
}

export async function applySettingsBundle(bundle: SettingsSyncBundle): Promise<{
  success: boolean;
  appliedCounts: { templates: number; pacsServers: number; clinicSettings: boolean };
}> {
  let templatesCount = 0;
  let pacsCount = 0;
  let clinicConfigUpdated = false;

  // 1. Ingest Templates
  if (Array.isArray(bundle.templates)) {
    for (const t of bundle.templates) {
      if (!t.title || !t.modality) continue;
      try {
        const [existing] = await db
          .select()
          .from(templates)
          .where(and(eq(templates.title, t.title), eq(templates.modality, t.modality)))
          .limit(1);

        if (!existing) {
          await db.insert(templates).values({
            id: t.id || crypto.randomUUID(),
            title: t.title,
            name: t.title,
            modality: t.modality,
            study: t.study || t.title,
            bodyPart: t.study || t.title,
            technique: t.technique || '',
            findings: t.findings || '',
            impression: t.impression || '',
            recommendation: t.recommendation || '',
          } as any);
          templatesCount++;
        } else {
          await db
            .update(templates)
            .set({
              study: t.study || existing.study,
              bodyPart: t.study || existing.study,
              name: t.title || existing.title,
              technique: t.technique ?? existing.technique,
              findings: t.findings ?? existing.findings,
              impression: t.impression ?? existing.impression,
              recommendation: t.recommendation ?? existing.recommendation,
            } as any)
            .where(eq(templates.id, existing.id));
          templatesCount++;
        }
      } catch (err: any) {
        console.error('NOW_ERR:', err?.message || err);
      }
    }
  }

  // 2. Ingest PACS Servers
  if (Array.isArray(bundle.pacsServers)) {
    for (const s of bundle.pacsServers) {
      if (!s.name || !s.aeTitle || !s.host || !s.port) continue;
      try {
        const [existing] = await db
          .select()
          .from(pacsServers)
          .where(and(eq(pacsServers.aeTitle, s.aeTitle), eq(pacsServers.host, s.host)))
          .limit(1);

        if (!existing) {
          await db.insert(pacsServers).values({
            id: s.id || crypto.randomUUID(),
            name: s.name,
            aeTitle: s.aeTitle,
            host: s.host,
            port: Number(s.port),
            callingAeTitle: s.callingAeTitle || 'RADIANT',
            listenerPort: Number(s.listenerPort || 11112),
            retrieveProtocol: s.retrieveProtocol || 'C-GET',
            isDefault: Boolean(s.isDefault),
            isActive: s.isActive !== undefined ? Boolean(s.isActive) : true,
            description: s.description || '',
          } as any);
          pacsCount++;
        } else {
          await db
            .update(pacsServers)
            .set({
              name: s.name,
              port: Number(s.port),
              callingAeTitle: s.callingAeTitle || existing.callingAeTitle,
              listenerPort: Number(s.listenerPort || existing.listenerPort),
              retrieveProtocol: s.retrieveProtocol || existing.retrieveProtocol,
              isActive: s.isActive !== undefined ? Boolean(s.isActive) : existing.isActive,
            })
            .where(eq(pacsServers.id, existing.id));
          pacsCount++;
        }
      } catch {}
    }
  }

  // 3. Ingest Clinic Settings
  if (bundle.clinicSettings && typeof bundle.clinicSettings === 'object') {
    try {
      const res = updateClinicNodeConfig('clinic-pc-primary', bundle.clinicSettings);
      clinicConfigUpdated = res.success;
    } catch {}
  }

  await logAudit({
    action: 'SETTINGS_SYNC_APPLIED',
    entityType: 'SystemSettings',
    details: `Applied ${templatesCount} templates, ${pacsCount} PACS servers, clinic config: ${clinicConfigUpdated}`,
  });

  return {
    success: true,
    appliedCounts: {
      templates: templatesCount,
      pacsServers: pacsCount,
      clinicSettings: clinicConfigUpdated,
    },
  };
}
