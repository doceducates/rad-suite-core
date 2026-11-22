// Layer 1 (Transport): Dynamic Case Status & Summary Sync Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/db';
import { studies, reports } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { extractDiagnosisHighlight } from '@/lib/clinical-summary';
import { generateAiDiagnosisHighlight } from '@/services/ai-clinical-summary.service';

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const rawAccessions: unknown = body?.accessions;

      if (!Array.isArray(rawAccessions) || rawAccessions.length === 0) {
        return NextResponse.json({ success: true, cases: [] });
      }

      const accessions = rawAccessions
        .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        .map((a) => a.trim().toUpperCase());

      if (accessions.length === 0) {
        return NextResponse.json({ success: true, cases: [] });
      }

      // 1. Fetch matching studies and reports from DB
      const studyRows = await db
        .select({
          studyId: studies.id,
          accessionNumber: studies.accessionNumber,
          studyStatus: studies.status,
          hmisStatus: studies.hmisStatus,
          priority: studies.priority,
          reportId: reports.id,
          reportStatus: reports.status,
          impression: reports.impression,
          findings: reports.findings,
          diagnosisHighlight: reports.diagnosisHighlight,
          pendingReason: reports.pendingReason,
          pendingNotes: reports.pendingNotes,
          pendingAt: reports.pendingAt,
          pendingBy: reports.pendingBy,
        })
        .from(studies)
        .leftJoin(reports, eq(reports.studyId, studies.id))
        .where(inArray(studies.accessionNumber, accessions));

      // 2. Build map and resolve dynamic status + highlight
      const resultMap = new Map<string, any>();

      for (const row of studyRows) {
        const acc = row.accessionNumber.toUpperCase();
        const effectiveStatus = row.reportStatus || row.studyStatus || 'scheduled';
        let highlight = row.diagnosisHighlight;

        // If highlight missing but impression exists, extract or AI-generate
        if (!highlight && (row.impression || row.findings)) {
          highlight = extractDiagnosisHighlight(row.impression || row.findings || '');

          // Trigger AI synthesis in background if AI is available
          if (row.reportId && (row.impression || row.findings)) {
            generateAiDiagnosisHighlight(row.findings || '', row.impression || '')
              .then(async (aiHighlight) => {
                if (aiHighlight && aiHighlight !== highlight) {
                  try {
                    await db
                      .update(reports)
                      .set({ diagnosisHighlight: aiHighlight })
                      .where(eq(reports.id, row.reportId!));
                  } catch {}
                }
              })
              .catch(() => {});
          }
        }

        const caseObj: Record<string, any> = {
          accessionNumber: row.accessionNumber,
          status: effectiveStatus,
          hmisStatus: row.hmisStatus,
          priority: row.priority,
          impression: row.impression,
          diagnosisHighlight: highlight,
        };
        if (row.pendingReason) caseObj.pendingReason = row.pendingReason;
        if (row.pendingNotes) caseObj.pendingNotes = row.pendingNotes;
        if (row.pendingAt) caseObj.pendingAt = row.pendingAt;
        if (row.pendingBy) caseObj.pendingBy = row.pendingBy;
        resultMap.set(acc, caseObj);
      }

      // Return ordered list matching requested accessions
      const cases = accessions.map((acc) => {
        return (
          resultMap.get(acc) || {
            accessionNumber: acc,
            status: 'scheduled',
            hmisStatus: 'awaiting_report',
          }
        );
      });

      return NextResponse.json({
        success: true,
        cases,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to sync summary' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'consultant', 'pgr'],
  }
);
