import { useEffect, Dispatch, SetStateAction } from 'react';
import { ReportEditorState } from './use-report-editor-actions';
import { normalizeImpressionSignatureHtml } from '@/lib/clinical-format';

export interface UseHmisDoctorSignatureOptions {
  isTakenUpByMe?: boolean;
  isClaimedByOther?: boolean;
  reportStatus?: string;
  readOnly?: boolean;
}

/**
 * Hook to automatically ensure and synchronize the HMIS Reporting Doctor
 * signature in the clinical impression section.
 * Enforces strict idempotency and eliminates duplicate or malformed signatures.
 * Safely guards against overwriting another doctor's signature in multi-user environments.
 */
export function useHmisDoctorSignature(
  pgrName: string | undefined,
  setReport: Dispatch<SetStateAction<ReportEditorState>>,
  options?: UseHmisDoctorSignatureOptions
) {
  useEffect(() => {
    // Strictly prevent empty strings or generic placeholder roles like 'Resident Radiologist'
    if (!pgrName || !pgrName.trim() || pgrName.trim() === 'Resident Radiologist') return;

    // Multi-user guard: never overwrite signature if claimed by another doctor, read-only, or already submitted/final
    if (options?.isClaimedByOther || options?.readOnly) return;
    if (options?.reportStatus === 'submitted' || options?.reportStatus === 'final') return;

    setReport((prev) => {
      const currentImp = prev.impression || '';
      const plainText = currentImp.replace(/<[^>]*>/g, '').trim();
      if (!plainText) return prev;

      // If the case is NOT taken up by me, and the report already has an existing signature from another doctor, do not overwrite it
      if (!options?.isTakenUpByMe && /Reported\s+by:?|Attribution:?/i.test(currentImp)) {
        if (!currentImp.toLowerCase().includes(pgrName.trim().toLowerCase())) {
          return prev;
        }
      }

      // Normalize impression with current active doctor signature
      const normalizedImp = normalizeImpressionSignatureHtml(currentImp, pgrName);

      // If already perfectly normalized, avoid redundant state updates & re-renders
      if (currentImp === normalizedImp) return prev;

      return {
        ...prev,
        impression: normalizedImp,
      };
    });
  }, [pgrName, setReport, options?.isTakenUpByMe, options?.isClaimedByOther, options?.reportStatus, options?.readOnly]);
}
