'use client';

import { useState, useEffect, useCallback } from 'react';

export const STORAGE_KEY_CONSULTANT = 'radsuite_consultant_name';
export const STORAGE_KEY_PGR = 'radsuite_pgr_name';
const SYNC_EVENT_NAME = 'radsuite:attribution-updated';

interface UserContext {
  id?: string;
  name?: string;
  title?: string;
  hmisReportingDoctorName?: string;
  supervisingConsultantName?: string;
}

export function useClinicianAttribution(currentUser?: UserContext) {
  const [consultantName, setConsultantNameState] = useState<string>('');
  const [pgrName, setPgrNameState] = useState<string>('');

  const pgrStorageKey = currentUser?.id ? `${STORAGE_KEY_PGR}_${currentUser.id}` : STORAGE_KEY_PGR;
  const consultantStorageKey = currentUser?.id ? `${STORAGE_KEY_CONSULTANT}_${currentUser.id}` : STORAGE_KEY_CONSULTANT;

  // Hydrate on mount from user context or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Consultant Attribution
    const rawStoredConsultant = localStorage.getItem(consultantStorageKey) || localStorage.getItem(STORAGE_KEY_CONSULTANT) || '';
    if (rawStoredConsultant.toLowerCase().includes('sumaira') && !currentUser?.supervisingConsultantName?.toLowerCase().includes('sumaira')) {
      localStorage.removeItem(consultantStorageKey);
      localStorage.removeItem(STORAGE_KEY_CONSULTANT);
    }
    const cleanStoredConsultant = (localStorage.getItem(consultantStorageKey) || localStorage.getItem(STORAGE_KEY_CONSULTANT) || '').trim();
    const resolvedConsultant = currentUser?.supervisingConsultantName || cleanStoredConsultant || '';
    setConsultantNameState(resolvedConsultant);

    // 2. Reporting Resident / PGR Attribution
    const rawStoredPgr = (localStorage.getItem(pgrStorageKey) || localStorage.getItem(STORAGE_KEY_PGR) || '').trim();
    if (
      (rawStoredPgr.includes('(Consultant)') &&
      currentUser?.hmisReportingDoctorName &&
      !currentUser.hmisReportingDoctorName.includes('(Consultant)')) ||
      rawStoredPgr === 'Resident Radiologist' ||
      rawStoredPgr.includes('Resident Radiologist')
    ) {
      localStorage.removeItem(pgrStorageKey);
      localStorage.removeItem(STORAGE_KEY_PGR);
    }

    const defaultFromUser = currentUser?.hmisReportingDoctorName || (currentUser?.name ? `${currentUser.name} (PGR)` : '');

    // HMIS Profile settings signature is the definitive source of truth
    const resolvedPgr = currentUser?.hmisReportingDoctorName || rawStoredPgr || defaultFromUser || '';
    setPgrNameState(resolvedPgr);
  }, [currentUser?.id, currentUser?.name, currentUser?.title, currentUser?.hmisReportingDoctorName, currentUser?.supervisingConsultantName, pgrStorageKey, consultantStorageKey]);

  // Synchronize across components and tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ consultantName?: string; pgrName?: string }>;
      if (customEvent.detail) {
        if (customEvent.detail.consultantName !== undefined) {
          setConsultantNameState(customEvent.detail.consultantName);
        }
        if (customEvent.detail.pgrName !== undefined) {
          setPgrNameState(customEvent.detail.pgrName);
        }
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    return () => window.removeEventListener(SYNC_EVENT_NAME, handleSync);
  }, []);

  const setConsultantName = useCallback((name: string) => {
    setConsultantNameState(name);
    if (typeof window !== 'undefined') {
      const trimmed = name.trim();
      if (trimmed) {
        localStorage.setItem(consultantStorageKey, trimmed);
      } else {
        localStorage.removeItem(consultantStorageKey);
      }
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT_NAME, { detail: { consultantName: name } })
      );
      // Persist in background to user profile
      fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisingConsultantName: trimmed }),
      }).catch(() => {});
    }
  }, [consultantStorageKey]);

  const setPgrName = useCallback((name: string) => {
    setPgrNameState(name);
    if (typeof window !== 'undefined') {
      const trimmed = name.trim();
      if (trimmed) {
        localStorage.setItem(pgrStorageKey, trimmed);
      } else {
        localStorage.removeItem(pgrStorageKey);
      }
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT_NAME, { detail: { pgrName: name } })
      );
      // Persist in background to user profile so it stays synced across machines
      fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hmisReportingDoctorName: trimmed }),
      }).catch(() => {});
    }
  }, [pgrStorageKey]);

  return {
    consultantName,
    setConsultantName,
    pgrName,
    setPgrName,
  };
}
