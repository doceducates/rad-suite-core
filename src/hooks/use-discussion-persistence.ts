'use client';

// Layer 4 (Presentation Hook): Persistent Discussion Auto-Save & Immediate Flush
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import { useState, useEffect, useRef, useCallback } from 'react';
import { DiscussionFinding } from '@/lib/discussion-compiler';

interface UseDiscussionPersistenceOptions {
  identifier?: string;
  findingsHtml: string;
  findings: DiscussionFinding[];
  notes: string;
  isLoaded: boolean;
}

export function useDiscussionPersistence({
  identifier,
  findingsHtml,
  findings,
  notes,
  isLoaded,
}: UseDiscussionPersistenceOptions) {
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const persistDiscussionToDb = useCallback(
    async (htmlToSave: string, findingsToSave: DiscussionFinding[], notesToSave: string) => {
      if (!identifier) return;
      setIsSavingDb(true);
      try {
        const res = await fetch(`/api/reports/${encodeURIComponent(identifier)}/discussion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positiveFindings: findingsToSave,
            positiveFindingsHtml: htmlToSave,
            consultantNotes: notesToSave,
          }),
        });
        if (res.ok) {
          setLastSavedTime(
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          );
        }
      } catch (err) {
        console.warn('Failed auto-saving discussion:', err);
      } finally {
        setIsSavingDb(false);
      }
    },
    [identifier]
  );

  // Keep ref to latest data for immediate flush
  const latestRef = useRef({ findingsHtml, findings, notes, isLoaded });
  useEffect(() => {
    latestRef.current = { findingsHtml, findings, notes, isLoaded };
  }, [findingsHtml, findings, notes, isLoaded]);

  const flushSaveImmediate = useCallback(() => {
    if (!latestRef.current.isLoaded || !identifier) return;
    persistDiscussionToDb(
      latestRef.current.findingsHtml,
      latestRef.current.findings,
      latestRef.current.notes
    );
  }, [identifier, persistDiscussionToDb]);

  // Immediate flush on unmount (e.g. user clicks Report tab or navigates away)
  useEffect(() => {
    return () => {
      if (latestRef.current.isLoaded && identifier) {
        fetch(`/api/reports/${encodeURIComponent(identifier)}/discussion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positiveFindings: latestRef.current.findings,
            positiveFindingsHtml: latestRef.current.findingsHtml,
            consultantNotes: latestRef.current.notes,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [identifier]);

  // High-speed 400ms debounced auto-save during typing
  useEffect(() => {
    if (isInitialLoadRef.current) {
      if (isLoaded) isInitialLoadRef.current = false;
      return;
    }
    if (!identifier || !isLoaded) return;

    const timer = setTimeout(() => {
      persistDiscussionToDb(findingsHtml, findings, notes);
    }, 400);

    return () => clearTimeout(timer);
  }, [findingsHtml, findings, notes, identifier, isLoaded, persistDiscussionToDb]);

  return {
    isSavingDb,
    lastSavedTime,
    persistDiscussionToDb,
    flushSaveImmediate,
  };
}
