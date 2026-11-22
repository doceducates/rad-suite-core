'use client';

import { useState, useCallback } from 'react';
import { notify } from '@/services/notification.service';
import { executeReleaseCase } from './worklist-case-utils';

interface UseWorkstationStudyClaimParams {
  currentStudy: any;
  setCurrentStudy: React.Dispatch<React.SetStateAction<any>>;
  activeStudy: any;
  currentUser: any;
  isTakenUpByMe: boolean;
  isClaimedByOther: boolean;
  handleSendToHmis: (opts?: { deepVerify?: boolean }) => Promise<any>;
  handleSubmitToHmis: (opts?: { deepVerify?: boolean }) => Promise<any>;
}

export function useWorkstationStudyClaim({
  currentStudy,
  setCurrentStudy,
  activeStudy,
  currentUser,
  isTakenUpByMe,
  isClaimedByOther,
  handleSendToHmis,
  handleSubmitToHmis,
}: UseWorkstationStudyClaimParams) {
  const [claimingCase, setClaimingCase] = useState(false);
  const [releasingCase, setReleasingCase] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);

  const handleClaimCurrentStudy = useCallback(async () => {
    const acc = currentStudy?.accessionNumber || activeStudy?.accessionNumber;
    if (!acc || !currentUser?.id) return;
    setClaimingCase(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(acc)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radiologistId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) { notify.error(data.error || 'Failed to take up case'); return; }
      notify.success('Case assigned to your worklist');
      setCurrentStudy((prev: any) => ({ ...prev, assignedRadiologistId: currentUser.id, assignedRadiologistName: currentUser.name }));
    } catch (err: any) {
      notify.error(`Failed to take up case: ${err.message}`);
    } finally {
      setClaimingCase(false);
    }
  }, [currentStudy?.accessionNumber, activeStudy?.accessionNumber, currentUser?.id, currentUser?.name, setCurrentStudy]);

  const handleReleaseCurrentStudy = useCallback(async () => {
    const acc = currentStudy?.accessionNumber || activeStudy?.accessionNumber;
    if (!acc) return;
    setReleasingCase(true);
    try {
      const result = await executeReleaseCase(acc, true);
      if (result.success) {
        notify.info('Case released back to HMIS worklist pool');
        setCurrentStudy((prev: any) => ({ ...prev, assignedRadiologistId: null, assignedRadiologistName: null }));
      } else {
        notify.error(result.error || 'Failed to release case');
      }
    } catch (err: any) {
      notify.error(`Failed to release case: ${err.message}`);
    } finally {
      setReleasingCase(false);
    }
  }, [currentStudy?.accessionNumber, activeStudy?.accessionNumber, setCurrentStudy]);

  const handleUploadStudyToGoogleDrive = useCallback(async () => {
    const acc = currentStudy?.accessionNumber || activeStudy?.accessionNumber;
    if (!acc) return notify.warning('No active case loaded to upload');
    setUploadingToDrive(true);
    const progressId = notify.progress({ title: 'Uploading DICOM study to Google Drive...', current: 1, total: 2, statusText: 'Packaging instances' });
    try {
      const res = await fetch('/api/google/upload-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessionNumber: acc }),
      });
      const data = await res.json();
      notify.dismiss(progressId);
      if (!res.ok) return notify.error(data.error || 'Upload to Google Drive failed');
      notify.success(`Uploaded ${data.fileName || acc} to Google Drive!`);
      if (data.webViewLink) {
        notify.info('Study saved to Google Drive', {
          actionLabel: 'Open in Drive',
          onAction: () => window.open(data.webViewLink, '_blank'),
        });
      }
    } catch (err: any) {
      notify.dismiss(progressId);
      notify.error(err?.message || 'Failed to upload study to Google Drive');
    } finally {
      setUploadingToDrive(false);
    }
  }, [currentStudy?.accessionNumber, activeStudy?.accessionNumber]);

  const handleSendToHmisWithAutoClaim = useCallback(async (opts?: { deepVerify?: boolean }) => {
    if (!isTakenUpByMe && !isClaimedByOther && currentUser?.id) await handleClaimCurrentStudy();
    return handleSendToHmis(opts);
  }, [isTakenUpByMe, isClaimedByOther, currentUser?.id, handleClaimCurrentStudy, handleSendToHmis]);

  const handleSubmitToHmisWithAutoClaim = useCallback(async (opts?: { deepVerify?: boolean }) => {
    if (!isTakenUpByMe && !isClaimedByOther && currentUser?.id) await handleClaimCurrentStudy();
    return handleSubmitToHmis(opts);
  }, [isTakenUpByMe, isClaimedByOther, currentUser?.id, handleClaimCurrentStudy, handleSubmitToHmis]);

  return {
    claimingCase,
    releasingCase,
    uploadingToDrive,
    handleClaimCurrentStudy,
    handleReleaseCurrentStudy,
    handleUploadStudyToGoogleDrive,
    handleSendToHmisWithAutoClaim,
    handleSubmitToHmisWithAutoClaim,
  };
}
