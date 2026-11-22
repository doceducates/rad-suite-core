'use client';

// Layer 4 (Presentation): Hook to sync live case status and highlights for WhatsApp handover
// Strict File Size Invariant: Target < 100 lines

import { useState, useEffect } from 'react';
import type { PacsStudyResult } from '@/types/pacs';

export function useWhatsappSyncedCases(isOpen: boolean, selectedCases: PacsStudyResult[]) {
  const [syncedCases, setSyncedCases] = useState<PacsStudyResult[]>(selectedCases);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSyncedCases(selectedCases);
  }, [selectedCases]);

  useEffect(() => {
    if (!isOpen || selectedCases.length === 0) return;

    let isMounted = true;
    setIsSyncing(true);

    fetch('/api/worklist/sync-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessions: selectedCases.map((c) => c.accessionNumber),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.cases)) {
          setSyncedCases((prev) =>
            prev.map((c) => {
              const match = data.cases.find(
                (sc: any) => sc.accessionNumber?.toUpperCase() === c.accessionNumber?.toUpperCase()
              );
              if (!match) return c;
              return {
                ...c,
                status: match.status || c.status,
                hmisStatus: match.hmisStatus || c.hmisStatus,
                impression: match.impression || c.impression,
                diagnosisHighlight: match.diagnosisHighlight || c.diagnosisHighlight,
                pendingReason: match.pendingReason !== undefined ? match.pendingReason : c.pendingReason,
                pendingNotes: match.pendingNotes !== undefined ? match.pendingNotes : c.pendingNotes,
              };
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCases]);

  return { syncedCases, isSyncing };
}
