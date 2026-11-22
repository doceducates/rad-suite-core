'use client';

// Layer 4 (Presentation): On-Demand HMIS Demographics Sync Button
// Strict File Size Invariant: Target < 120 lines

import React, { useState } from 'react';
import { UserCheck, RefreshCw } from 'lucide-react';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistSyncDemographicsButtonProps {
  study: PacsStudyResult;
  onRefresh?: () => void;
  className?: string;
}

export function WorklistSyncDemographicsButton({
  study,
  onRefresh,
  className = '',
}: WorklistSyncDemographicsButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    notify.info(`Fetching verified HMIS demographics for ${study.accessionNumber}...`);

    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(study.accessionNumber)}/sync-demographics`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync demographics');
      }

      const d = data.demographics;
      const details = [
        d.age !== undefined && d.age !== null ? `Age: ${d.age}y` : '',
        d.phone ? `Phone: ${d.phone}` : '',
        d.cnic ? `CNIC: ${d.cnic}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      notify.success(`HMIS Demographics Synced: ${details || 'Verified'}`);
      onRefresh?.();
    } catch (err: any) {
      notify.error(`Demographics sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={loading}
      title="Fetch verified HMIS demographics (Age, CNIC, Phone) on-demand"
      className={`p-1.5 rounded-lg border border-outline-variant/60 text-secondary hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50 ${className}`}
      aria-label="Sync HMIS Demographics"
    >
      {loading ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
      ) : (
        <UserCheck className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
