'use client';

import { useEffect } from 'react';
import { DicomTool } from '@/components/dicom/dicom-toolbar';

interface UseWorkstationShortcutsOptions {
  isCommandOpen: boolean;
  isNotionModalOpen: boolean;
  setTool: (tool: DicomTool) => void;
  setInvert: React.Dispatch<React.SetStateAction<boolean>>;
  setResetKey: React.Dispatch<React.SetStateAction<number>>;
  setIsCinePlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useWorkstationShortcuts({
  isCommandOpen,
  isNotionModalOpen,
  setTool,
  setInvert,
  setResetKey,
  setIsCinePlaying,
}: UseWorkstationShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable ||
        isCommandOpen ||
        isNotionModalOpen
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'p') setTool('pan');
      else if (k === 'z') setTool('zoom');
      else if (k === 'l') setTool('length');
      else if (k === 'a') setTool('angle');
      else if (k === 'w') setTool('wl');
      else if (k === 'q') setTool('crosshair');
      else if (k === 'i') setInvert((prev) => !prev);
      else if (k === 'r') {
        setInvert(false);
        setResetKey((key) => key + 1);
      } else if (k === 'c') {
        setIsCinePlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen, isNotionModalOpen, setTool, setInvert, setResetKey, setIsCinePlaying]);
}
