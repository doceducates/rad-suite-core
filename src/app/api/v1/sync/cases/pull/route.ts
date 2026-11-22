// Layer 1: Outbound Case Synchronization Pull Controller
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { studies, tombstonedAccessions, hospitalPacsStudies } from '@/db/schema';
import { gte, desc, eq, and, or } from 'drizzle-orm';
import { buildCaseBundle } from '@/services/sync/case-sync-bundle.service';
import { getVpsSyncApiKey } from '@/services/sync/case-sync-client.service';
import { authenticateRequest } from '@/lib/auth-guard';
import { rbacService } from '@/services/rbac.service';
import { CaseSyncPullQuerySchema } from '@/lib/validation';
import type { CaseSyncBundle } from '@/services/sync/case-sync-types';
import type { User } from '@/types';

export async function GET(req: NextRequest) {
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

  // 2. Validate Query Parameters
  const { searchParams } = new URL(req.url);
  const parsed = CaseSyncPullQuerySchema.safeParse({
    since: searchParams.get('since') || undefined,
    limit: searchParams.get('limit') || undefined,
    scope: searchParams.get('scope') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid query parameters' }, { status: 400 });
  }

  const { since, limit } = parsed.data;
  let scope = parsed.data.scope || 'active_shift';
  // Non-admins cannot pull the entire historical archive without admin permissions
  if (scope === 'all' && syncUser.role !== 'admin') {
    scope = 'active_shift';
  }

  const bundles: CaseSyncBundle[] = [];

  try {
    // 3. Query Modified Studies based on Scope & Timestamps
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000);
    const sinceDate = since ? new Date(since) : null;

    let conditions: any[] = [];
    if (sinceDate) {
      conditions.push(gte(studies.updatedAt, sinceDate));
    }

    if (scope === 'my_cases' && syncUser.id !== 'api-service-account') {
      conditions.push(eq(studies.assignedRadiologistId, syncUser.id));
    } else if (scope === 'active_shift' && !sinceDate) {
      conditions.push(
        or(
          gte(studies.scheduledAt, fortyEightHoursAgo as any),
          eq(studies.status, 'pending'),
          eq(studies.status, 'in_progress')
        )
      );
    }

    let query = db
      .select({ accession: studies.accessionNumber })
      .from(studies)
      .orderBy(desc(studies.updatedAt))
      .limit(limit);

    if (conditions.length === 1) {
      query = db
        .select({ accession: studies.accessionNumber })
        .from(studies)
        .where(conditions[0])
        .orderBy(desc(studies.updatedAt))
        .limit(limit) as any;
    } else if (conditions.length > 1) {
      query = db
        .select({ accession: studies.accessionNumber })
        .from(studies)
        .where(and(...conditions))
        .orderBy(desc(studies.updatedAt))
        .limit(limit) as any;
    }

    const modifiedStudies = await query;
    for (const row of modifiedStudies) {
      if (row.accession) {
        const bundle = await buildCaseBundle(row.accession);
        if (bundle) bundles.push(bundle);
      }
    }

    // 4. Query Tombstoned Accessions since timestamp
    if (since) {
      const tombstones = await db
        .select()
        .from(tombstonedAccessions)
        .where(gte(tombstonedAccessions.deletedAt, since))
        .limit(20);

      for (const t of tombstones) {
        const bundle = await buildCaseBundle(t.accession);
        if (bundle) bundles.push(bundle);
      }
    }

    // 5. Query Hospital PACS Studies (Shielded by Storage RBAC)
    let pacsStudies: any[] = [];
    const canAccessPacs = syncUser.role === 'admin' || rbacService.canAccessStorageSource(syncUser, 'pacs');

    if (canAccessPacs && scope !== 'my_cases') {
      let pacsQuery = db
        .select()
        .from(hospitalPacsStudies)
        .orderBy(desc(hospitalPacsStudies.studyDate), desc(hospitalPacsStudies.lastIndexedAt))
        .limit(limit);

      if (since) {
        const pacsSinceDate = new Date(since);
        pacsQuery = db
          .select()
          .from(hospitalPacsStudies)
          .where(gte(hospitalPacsStudies.lastIndexedAt, pacsSinceDate))
          .orderBy(desc(hospitalPacsStudies.studyDate), desc(hospitalPacsStudies.lastIndexedAt))
          .limit(limit) as any;
      }
      pacsStudies = await pacsQuery.catch(() => []);
    }

    return NextResponse.json({
      success: true,
      bundles,
      pacsStudies,
      scope,
      serverTime: new Date().toISOString(),
      totalAvailable: bundles.length + pacsStudies.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed generating pull bundle' },
      { status: 500 }
    );
  }
}
