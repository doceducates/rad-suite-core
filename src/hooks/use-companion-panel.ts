'use client';

import { useState, useCallback } from 'react';
import {
  CompanionTab,
  resolveCompanionTabForSection,
} from '@/services/companion-tab.service';

export type { CompanionTab };
export { resolveCompanionTabForSection };

export function useCompanionPanel(defaultTab: CompanionTab = 'images') {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<CompanionTab>(defaultTab);

  const openCompanion = useCallback((tab?: CompanionTab) => {
    setIsOpen(true);
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const closeCompanion = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCompanion = useCallback(
    (tab?: CompanionTab) => {
      setIsOpen((prev) => {
        if (!prev) {
          if (tab) setActiveTab(tab);
          return true;
        }
        if (tab && tab !== activeTab) {
          setActiveTab(tab);
          return true;
        }
        return false;
      });
    },
    [activeTab]
  );

  return {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    openCompanion,
    closeCompanion,
    toggleCompanion,
  };
}
