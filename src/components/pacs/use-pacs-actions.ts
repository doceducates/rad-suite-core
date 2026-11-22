'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notify } from '@/services/notification.service';
import type { HospitalPacsStudy } from '@/db/schema';

interface UsePacsActionsProps {
  fetchStudies: (page?: number, isBg?: boolean) => Promise<void>;
  selectedAccessions: Set<string>;
  setSelectedAccessions: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function usePacsActions({
  fetchStudies,
  selectedAccessions,
  setSelectedAccessions,
}: UsePacsActionsProps) {
  const router = useRouter();
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isBulkPulling, setIsBulkPulling] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isBulkClaiming, setIsBulkClaiming] = useState(false);

  const handleClaimCase = async (accession: string) => {
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(accession)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed claiming case');
      }
      notify.success(`Case ${accession} added to My Cases!`);
      await fetchStudies();
    } catch (err: any) {
      notify.error(err.message || 'Error claiming case');
    }
  };

  const handleBulkClaimCases = async () => {
    const accessions = Array.from(selectedAccessions);
    if (accessions.length === 0) return;
    setIsBulkClaiming(true);
    notify.info(`Adding ${accessions.length} ${accessions.length === 1 ? 'case' : 'cases'} to My Cases...`);
    try {
      const res = await fetch('/api/cases/batch-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Added ${data.claimed?.length || accessions.length} case(s) to My Cases.`);
        setSelectedAccessions(new Set());
        await fetchStudies();
      } else {
        throw new Error(data.error || 'Batch claim failed');
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed adding selected cases to My Cases');
    } finally {
      setIsBulkClaiming(false);
    }
  };

  const handleSinglePull = async (accession: string) => {
    notify.info(`Requesting Hospital PACS C-GET for ${accession}...`);
    try {
      const res = await fetch('/api/pacs/hospital-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accession, modality: 'MR' }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`C-GET pull triggered on Clinic PC for ${accession}.`);
        await fetchStudies();
      } else {
        throw new Error(data.error || 'Failed pulling study');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error pulling study from PACS');
    }
  };

  const handleSingleSync = async (accession: string) => {
    notify.info(`Queueing S3 upload for ${accession}...`);
    try {
      const res = await fetch('/api/pacs/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: [accession] }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Study ${accession} queued for S3 upload.`);
        await fetchStudies();
      } else {
        throw new Error(data.error || 'Failed queueing sync');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error queueing S3 upload');
    }
  };

  const handleBulkPacsPull = async () => {
    const accessions = Array.from(selectedAccessions);
    if (accessions.length === 0) return;
    setIsBulkPulling(true);
    notify.info(`Requesting batch C-GET for ${accessions.length} studies...`);
    try {
      for (const acc of accessions) {
        await fetch('/api/pacs/hospital-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accession: acc }),
        });
      }
      notify.success(`Queued C-GET on Clinic PC for ${accessions.length} studies.`);
      setSelectedAccessions(new Set());
      await fetchStudies();
    } catch (err: any) {
      notify.error(err.message || 'Error dispatching batch pull');
    } finally {
      setIsBulkPulling(false);
    }
  };

  const handleBulkS3Upload = async () => {
    const accessions = Array.from(selectedAccessions);
    if (accessions.length === 0) return;
    setIsBulkUploading(true);
    notify.info(`Dispatching bulk S3 upload for ${accessions.length} studies...`);
    try {
      const res = await fetch('/api/pacs/bulk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Queued ${data.count} studies for S3 Cloud ingestion.`);
        setSelectedAccessions(new Set());
        await fetchStudies();
      } else {
        throw new Error(data.error || 'Bulk sync failed');
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed dispatching bulk upload');
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleStreamAndView = (study: HospitalPacsStudy, mode: 'review' | 'report' = 'review') => {
    const acc = study.accessionNumber;
    if (study.s3Status !== 'synced') {
      notify.info(`Initiating on-demand stream for ${acc}...`);
      fetch('/api/pacs/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessionNumber: acc, source: 'hospital_pacs', priority: 'high' }),
        keepalive: true,
      }).catch(() => {});
    }
    router.push(`/workspace/${encodeURIComponent(acc)}?mode=${mode}`);
  };

  const handleBulkRadiAntDownload = () => {
    const accessions = Array.from(selectedAccessions);
    if (accessions.length === 0) return;
    setIsBulkDownloading(true);
    notify.info(`Packaging RadiAnt DICOM archive for ${accessions.length} ${accessions.length === 1 ? 'study' : 'studies'}...`);
    try {
      const url =
        accessions.length === 1
          ? `/api/pacs/download?accession=${encodeURIComponent(accessions[0])}`
          : `/api/pacs/download?accessions=${encodeURIComponent(accessions.join(','))}`;

      const link = document.createElement('a');
      link.href = url;
      link.download =
        accessions.length === 1
          ? `${accessions[0]}_RadiAnt.zip`
          : `RadiAnt_Batch_${accessions.length}_Studies.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify.success(`Download started for ${accessions.length} ${accessions.length === 1 ? 'study' : 'studies'}.`);
    } catch (err: any) {
      notify.error(err.message || 'Failed initiating RadiAnt download');
    } finally {
      setIsBulkDownloading(false);
    }
  };

  return {
    isBulkUploading,
    isBulkPulling,
    isBulkDownloading,
    isBulkClaiming,
    handleSinglePull,
    handleSingleSync,
    handleBulkPacsPull,
    handleBulkS3Upload,
    handleStreamAndView,
    handleBulkRadiAntDownload,
    handleClaimCase,
    handleBulkClaimCases,
  };
}
