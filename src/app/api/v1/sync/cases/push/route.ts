// Layer 1: Inbound Case Synchronization Batch Ingestion Controller
import { NextRequest, NextResponse } from 'next/server';
import { CaseSyncPushSchema } from '@/lib/validation';
import { applyCaseBundle } from '@/services/sync/case-sync-bundle.service';
import { getVpsSyncApiKey } from '@/services/sync/case-sync-client.service';
import { authenticateRequest } from '@/lib/auth-guard';
import { logAudit } from '@/services/audit.service';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  // 1. Verify Authorization (User Bearer token, session cookie, or machine x-api-key)
  let syncUser: User | null = null;
  const authResult = await authenticateRequest(req);
  if ('user' in authResult) {
    syncUser = authResult.user;
  } else {
    const authHeader = req.headers.get('authorization') || '';
    const apiKeyHeader = req.headers.get('x-api-key') || '';
    const expectedKey = getVpsSyncApiKey();
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKeyHeader.trim();
    if (token && token === expectedKey) {
      syncUser = {
        id: 'api-service-account',
        name: 'Clinic Edge Node',
        email: 'edge-node@radsuite.internal',
        role: 'admin',
        title: 'Edge Node Agent',
        department: 'Infrastructure',
        avatarColor: '#10b981',
        createdAt: new Date(),
      };
    }
  }

  if (!syncUser) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing sync credentials' },
      { status: 401 }
    );
  }

  // 2. Parse & Validate Payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  const parsed = CaseSyncPushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Invalid sync bundle payload' },
      { status: 400 }
    );
  }

  // 3. Process Bundles with Topological Safety & Claim Protection
  const syncedAccessions: string[] = [];
  const conflicts: Array<{ accessionNumber: string; reason: string; archivedRevisionVersion?: number }> = [];

  for (const bundle of parsed.data.bundles) {
    try {
      const outcome = await applyCaseBundle(bundle as any, syncUser);
      if (outcome.success) {
        syncedAccessions.push(bundle.accessionNumber);
        if (outcome.conflict) {
          conflicts.push({
            accessionNumber: bundle.accessionNumber,
            reason: outcome.conflict.reason,
            archivedRevisionVersion: outcome.conflict.archivedVersion,
          });
        }
      }
    } catch (ingestErr: any) {
      console.warn(`[SYNC_PUSH_INGEST_ERR] Failed accession ${bundle.accessionNumber}:`, ingestErr);
    }
  }

  await logAudit({
    userId: syncUser.id,
    userName: syncUser.name,
    action: 'CASE_SYNC_PUSH_RECEIVED',
    entityType: 'CaseSync',
    details: `Ingested ${syncedAccessions.length} of ${parsed.data.bundles.length} bundles by ${syncUser.name} (${syncUser.role}). Preserved conflicts: ${conflicts.length}`,
  });

  let syncedPacsStudiesCount = 0;
  if (Array.isArray(parsed.data.pacsStudies) && parsed.data.pacsStudies.length > 0) {
    try {
      const { indexHospitalPacsStudies } = await import('@/services/hospital-pacs-index.service');
      const res = await indexHospitalPacsStudies(parsed.data.pacsStudies);
      syncedPacsStudiesCount = (res.upserted || 0) + (res.updated || 0);
    } catch (pacsErr: any) {
      console.warn('[SYNC_PUSH_PACS_INDEX_WARN]', pacsErr.message);
    }
  }

  return NextResponse.json({
    success: true,
    processedCount: syncedAccessions.length,
    syncedAccessions,
    syncedPacsStudiesCount,
    conflicts,
    serverTime: new Date().toISOString(),
  });
}
