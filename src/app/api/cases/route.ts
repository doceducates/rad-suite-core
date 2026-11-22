import { NextResponse } from 'next/server';
import { getLocalCases } from '@/services/local-cases.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async () => {
    try {
      const cases = getLocalCases();
      let reportMap = new Map<string, { impression?: string; diagnosisHighlight?: string }>();
      try {
        const { db } = await import('@/db');
        const { studies, reports } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');
        const { extractDiagnosisHighlight } = await import('@/lib/clinical-summary');
        const rows = await db
          .select({
            accessionNumber: studies.accessionNumber,
            impression: reports.impression,
          })
          .from(studies)
          .innerJoin(reports, eq(reports.studyId, studies.id));

        for (const r of rows) {
          if (r.accessionNumber && r.impression) {
            reportMap.set(r.accessionNumber.toLowerCase(), {
              impression: r.impression,
              diagnosisHighlight: extractDiagnosisHighlight(r.impression) || undefined,
            });
          }
        }
      } catch {}

      return NextResponse.json({
        success: true,
        cases: cases.map((c) => {
          const rep = c.accessionNumber ? reportMap.get(c.accessionNumber.toLowerCase()) : undefined;
          return {
            id: c.id,
            patientName: c.patientName,
            patientId: c.patientId,
            accessionNumber: c.accessionNumber,
            modality: c.modality,
            studyDescription: c.studyDescription,
            studyDate: c.studyDate,
            age: c.age,
            gender: c.gender,
            numInstances: c.numInstances,
            impression: rep?.impression,
            diagnosisHighlight: rep?.diagnosisHighlight,
            seriesCount: c.series.length,
            series: c.series.map((s) => ({
              seriesNumber: s.seriesNumber,
              seriesDescription: s.seriesDescription,
              orientation: s.orientation,
              sliceCount: s.sliceCount,
              firstIpp: s.firstIpp,
              lastIpp: s.lastIpp,
              iop: s.iop,
              pixelSpacing: s.pixelSpacing,
              rows: s.rows,
              columns: s.columns,
            })),
          };
        }),
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to scan cases' },
        { status: 500 }
      );
    }
  },
  {
    audit: {
      action: 'list_local_cases',
      entityType: 'Study',
      details: 'Scanned local patient cases and impressions',
    },
  }
);
