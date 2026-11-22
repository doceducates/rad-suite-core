'use client';

// Layer 4 (Presentation Hook): Progressive HMIS Status Tracking Queue for My Cases (<140 lines)
import { useState, useCallback } from 'react';
import { notify, type ProgressItemDetail } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface UseMyCasesStatusTrackerProps {
  cases: PacsStudyResult[];
  setCases: React.Dispatch<React.SetStateAction<PacsStudyResult[]>>;
  fetchMyCases: () => Promise<void>;
}

export function useMyCasesStatusTracker({
  cases,
  setCases,
  fetchMyCases,
}: UseMyCasesStatusTrackerProps) {
  const [syncingMyStatus, setSyncingMyStatus] = useState(false);

  const trackCasesStatus = useCallback(
    async (targetAccessions?: string[], silent = true) => {
      const accsToTrack =
        targetAccessions && targetAccessions.length > 0
          ? targetAccessions
          : cases.map((c) => c.accessionNumber);

      if (accsToTrack.length === 0) {
        if (!silent) notify.info('No cases found to verify');
        return;
      }

      const targetStudies = cases.filter((c) => accsToTrack.includes(c.accessionNumber));
      const jobId = 'my-cases-tracking-queue';

      try {
        if (!silent) setSyncingMyStatus(true);

        const notifItems: ProgressItemDetail[] = targetStudies.map((c) => ({
          id: c.accessionNumber,
          label: c.patientName || 'Patient',
          secondary: `${c.modality || 'Study'} · Acc: ${c.accessionNumber}`,
          status: 'pending',
        }));

        if (!silent) {
          notify.progress({
            id: jobId,
            title: 'HMIS Status Verification',
            current: 0,
            total: targetStudies.length,
            statusText: `Checking ${targetStudies.length} case(s) against HMIS tracking...`,
            unit: 'cases',
            items: notifItems,
          });
        }

        let updatedCount = 0;
        let processed = 0;

        for (const study of targetStudies) {
          processed++;
          const acc = study.accessionNumber;

          if (!silent) {
            notify.progress({
              id: jobId,
              title: 'HMIS Status Verification',
              current: processed,
              total: targetStudies.length,
              statusText: `Verifying ${study.patientName || acc} (${processed}/${targetStudies.length})...`,
              items: notifItems.map((it) => (it.id === acc ? { ...it, status: 'saving' } : it)),
            });
          }

          try {
            const res = await fetch('/api/cases/sync-my-cases-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessions: [acc] }),
            });

            if (res.ok) {
              const data = await res.json();
              const wasUpdated = Boolean(data.updatedCount && data.updatedCount > 0);
              const syncedStudy = data.cases?.[0];

              if (syncedStudy) {
                if (wasUpdated || syncedStudy.isUpdated) {
                  updatedCount += 1;
                }
                // Instant optimistic live update for this case in the table!
                setCases((prev) =>
                  prev.map((c) => {
                    const cAcc = c.accessionNumber.toLowerCase();
                    const targetAcc = acc.toLowerCase();
                    const isMatch =
                      cAcc === targetAcc ||
                      cAcc.endsWith(targetAcc) ||
                      targetAcc.endsWith(cAcc) ||
                      (syncedStudy.accession && cAcc === syncedStudy.accession.toLowerCase());

                    return isMatch
                      ? {
                          ...c,
                          status: syncedStudy.status || c.status,
                          hmisStatus: syncedStudy.hmisStatus || c.hmisStatus,
                        }
                      : c;
                  })
                );
              }

              if (!silent) {
                notify.progress({
                  id: jobId,
                  title: 'HMIS Status Verification',
                  current: processed,
                  total: targetStudies.length,
                  items: notifItems.map((it) =>
                    it.id === acc
                      ? {
                          ...it,
                          status: 'success',
                          secondary: wasUpdated
                            ? `Found: ${(syncedStudy?.hmisStatus || 'Published').toUpperCase()}`
                            : 'Up to Date',
                        }
                      : it
                  ),
                });
              }
            }
          } catch {
            if (!silent) {
              notify.progress({
                id: jobId,
                title: 'HMIS Status Verification',
                current: processed,
                total: targetStudies.length,
                items: notifItems.map((it) => (it.id === acc ? { ...it, status: 'failed' } : it)),
              });
            }
          }
        }

        if (!silent) {
          notify.progress({
            id: jobId,
            title: 'HMIS Status Verification',
            current: targetStudies.length,
            total: targetStudies.length,
            statusText: `Verification complete: ${updatedCount} case(s) updated`,
            completed: true,
          });

          if (updatedCount > 0) {
            notify.success(`Status verified: ${updatedCount} case(s) promoted on HMIS!`);
            fetchMyCases();
          } else {
            notify.info(`All ${targetStudies.length} cases are already up to date on HMIS`);
          }
        }
      } catch {
        if (!silent) notify.error('Failed to complete HMIS tracking check');
      } finally {
        if (!silent) setSyncingMyStatus(false);
      }
    },
    [cases, setCases, fetchMyCases]
  );

  return {
    syncingMyStatus,
    trackCasesStatus,
  };
}
