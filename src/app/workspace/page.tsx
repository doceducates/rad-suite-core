import { redirect } from 'next/navigation';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq, or, desc, exists, and } from 'drizzle-orm';
import { ZenWorkstation } from '@/components/workstation/zen-workstation';
import { getLocalCases } from '@/services/local-cases.service';
import { queryIndexedHospitalPacs } from '@/services/hospital-pacs-index.service';
import { getCurrentUser } from '@/services/auth.service';
import type { StandbyCaseItem } from '@/components/workstation/zen-workstation-standby';

export const dynamic = 'force-dynamic';

export default async function WorkspaceStandalonePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?callbackUrl=' + encodeURIComponent('/workspace'));
  }

  if (currentUser.status === 'waitlisted' || currentUser.status === 'pending_invite') {
    redirect('/pending-access');
  }

  if (currentUser.status === 'suspended') {
    redirect('/pending-access?status=suspended');
  }

  const recentCases: StandbyCaseItem[] = [];

  // 1. Strict User Isolation: Load studies claimed by or assigned to this user
  if (currentUser?.id) {
    try {
      const dbStudies = await db
        .select({
          study: studies,
          patient: patients,
        })
        .from(studies)
        .innerJoin(patients, eq(patients.id, studies.patientId))
        .where(
          or(
            eq(studies.assignedRadiologistId, currentUser.id),
            exists(
              db
                .select()
                .from(reports)
                .where(
                  and(
                    eq(reports.studyId, studies.id),
                    or(
                      eq(reports.authorId, currentUser.id),
                      eq(reports.pgrAuthorId, currentUser.id)
                    )
                  )
                )
            )
          )
        )
        .orderBy(desc(studies.createdAt))
        .limit(8);

      for (const row of dbStudies) {
        recentCases.push({
          id: row.study.id,
          patientName: row.patient.fullName,
          patientId: row.patient.mrNumber || row.study.accessionNumber,
          accessionNumber: row.study.accessionNumber,
          modality: row.study.modality,
          studyDescription: row.study.scanType || row.study.bodyPart || 'Diagnostic Scan',
          numSeries: 1,
          numInstances: 1,
          source: 'pacs' as const,
        });
      }
    } catch (err) {
      console.warn('[WORKSPACE_STANDBY_USER_CASES_WARN]', err);
    }
  }

  // 2. Fallback: If user has no active cases, check local folder (E:\Cases)
  if (recentCases.length === 0) {
    try {
      const localCases = getLocalCases();
      for (const c of localCases.slice(0, 8)) {
        recentCases.push({
          id: c.id,
          patientName: c.patientName,
          patientId: c.patientId,
          accessionNumber: c.accessionNumber || c.id,
          modality: c.modality,
          studyDescription: c.studyDescription,
          numSeries: c.series?.length || 1,
          numInstances: c.numInstances || 1,
          source: 'local' as const,
        });
      }
    } catch {}
  }

  // 3. Fallback: If still empty, populate with recent available scans from PACS Archive
  // This ensures the radiologist is never presented with an empty dead-end screen
  if (recentCases.length === 0) {
    try {
      const pacsRes = await queryIndexedHospitalPacs({
        limit: 8,
        allowedStorageSources: currentUser?.allowedStorageSources,
        isAdmin: currentUser?.role === 'admin',
      });
      for (const st of pacsRes.studies) {
        recentCases.push({
          id: st.id,
          patientName: st.patientName || 'PATIENT',
          patientId: st.patientMrn || st.patientId || st.accessionNumber,
          accessionNumber: st.accessionNumber,
          modality: st.modality,
          studyDescription: st.studyDescription || `${st.modality} Scan`,
          numSeries: st.numSeries || 1,
          numInstances: st.numInstances || 1,
          source: 'pacs' as const,
        });
      }
    } catch (pacsErr) {
      console.warn('[WORKSPACE_STANDBY_PACS_FALLBACK_WARN]', pacsErr);
    }
  }

  return (
    <ZenWorkstation
      study={null}
      patient={null}
      initialReport={null}
      isLocalCase={false}
      recentCases={recentCases}
      currentUser={currentUser}
    />
  );
}
