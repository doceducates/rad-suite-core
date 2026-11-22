// Layer 1 (Transport): Automated Status Sync for Current User's Active Cases
// Strict File Size Invariant: Target < 120 lines, max 250 lines

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/db';
import { studies } from '@/db/schema';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { syncCaseTrackingStatus } from '@/services/hmis/hmis-worklist-sync.service';
import { getUserHmisCredentials } from '@/services/auth.service';

/**
 * POST /api/cases/sync-my-cases-status
 * Silently or targeted queries HMIS tracking for the current clinician's cases.
 * Accepts optional body: { accessions?: string[] }
 * Automatically promotes newly acknowledged or published cases in the local database.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
    }

    try {
      const body = await req.json().catch(() => ({}));
      const explicitAccessions: string[] = Array.isArray(body?.accessions)
        ? body.accessions.filter((a: any) => typeof a === 'string' && a.trim().length > 0)
        : [];

      // Find studies: either explicit accessions or up to 50 recent unfinalized cases
      const queryWhere =
        explicitAccessions.length > 0
          ? inArray(studies.accessionNumber, explicitAccessions)
          : and(
              eq(studies.assignedRadiologistId, user.id),
              notInArray(studies.status, ['final', 'finalized'])
            );

      const targetStudies = await db
        .select({
          id: studies.id,
          accessionNumber: studies.accessionNumber,
          status: studies.status,
          hmisStatus: studies.hmisStatus,
        })
        .from(studies)
        .where(queryWhere)
        .limit(explicitAccessions.length > 0 ? explicitAccessions.length : 25);

      if (targetStudies.length === 0) {
        return NextResponse.json({
          success: true,
          scannedCount: 0,
          updatedCount: 0,
          message: 'No matching cases found to synchronize',
          cases: [],
        });
      }

      // Retrieve user's configured HMIS credentials to authenticate against portal
      const credentials = await getUserHmisCredentials(user.id);

      // Check each case's tracking milestone with realistic network timeout
      let updatedCount = 0;
      const results: any[] = [];
      for (const st of targetStudies) {
        try {
          const syncRes = await Promise.race([
            syncCaseTrackingStatus(st.accessionNumber, credentials),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
          ]).catch((err) => {
            console.warn('[SyncRoute] Timeout or error checking', st.accessionNumber, err?.message);
            return null;
          });

          if (syncRes) {
            const isUpdated =
              syncRes.hmisStatus === 'published' ||
              syncRes.status === 'final' ||
              syncRes.hmisStatus === 'verified' ||
              (syncRes.status !== st.status && syncRes.status !== 'draft' && syncRes.status !== 'scheduled');
            if (isUpdated) updatedCount++;
            results.push({ ...syncRes, isUpdated });
          }
        } catch {
          // Continue with next study
        }
      }

      return NextResponse.json({
        success: true,
        scannedCount: targetStudies.length,
        updatedCount,
        cases: results,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to sync my cases status' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'my_cases_status_sync',
      entityType: 'Study',
      details: 'Automated targeted HMIS tracking check for clinician cases',
    },
  }
);
