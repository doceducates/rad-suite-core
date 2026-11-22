'use client';

// Layer 4 (Presentation Host): Persistent Global Clinic Edge Task Tracker Mount
// Strict File Size Invariant: Target < 250 lines

import { useEffect } from 'react';
import { clinicTaskTracker } from '@/services/clinic-task-tracker.service';

export function ClinicBackgroundHost() {
  useEffect(() => {
    // Initial silent check on mount
    clinicTaskTracker.ensurePolling();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        clinicTaskTracker.ensurePolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clinicTaskTracker.stopPolling();
    };
  }, []);

  return null; // Operates completely in the background via NotificationHost
}
