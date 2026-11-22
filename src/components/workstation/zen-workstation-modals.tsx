'use client';

// Layer 4 (Presentation): Modals cluster for ZenWorkstation (<80 lines)
import React from 'react';
import { PacsSearchModal } from './pacs-search-modal';
import { LocalFolderImportModal } from '@/components/pacs/local-folder-import-modal';
import { MobileNavDrawer } from '@/components/layout/mobile-nav-drawer';
import { CaseShareModal } from './case-share-modal';
import { WorklistEditPatientModal } from '@/components/worklist/worklist-edit-patient-modal';

interface ZenWorkstationModalsProps {
  isPacsSearchOpen: boolean;
  onPacsSearchChange: (open: boolean) => void;
  pacsSearchInitialFilter: 'all' | 'me';
  isFolderImportOpen: boolean;
  onFolderImportClose: () => void;
  mobileNavOpen: boolean;
  onMobileNavClose: () => void;
  currentUser?: any;
  hasStudy: boolean;
  isShareModalOpen: boolean;
  onShareModalClose: () => void;
  currentStudy: any;
  activeStudy: any;
  currentPatient: any;
  consultantName?: string;
  isEditingPatient: boolean;
  onEditingPatientClose: () => void;
  onPatientUpdated: (u: any) => void;
}

export function ZenWorkstationModals({
  isPacsSearchOpen,
  onPacsSearchChange,
  pacsSearchInitialFilter,
  isFolderImportOpen,
  onFolderImportClose,
  mobileNavOpen,
  onMobileNavClose,
  currentUser,
  hasStudy,
  isShareModalOpen,
  onShareModalClose,
  currentStudy,
  activeStudy,
  currentPatient,
  consultantName,
  isEditingPatient,
  onEditingPatientClose,
  onPatientUpdated,
}: ZenWorkstationModalsProps) {
  return (
    <>
      <PacsSearchModal
        isOpen={isPacsSearchOpen}
        onOpenChange={onPacsSearchChange}
        initialAssignedFilter={pacsSearchInitialFilter}
      />
      <LocalFolderImportModal isOpen={isFolderImportOpen} onClose={onFolderImportClose} />
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={onMobileNavClose}
        userRole={currentUser?.role}
        userName={currentUser?.name}
        userTitle={currentUser?.title}
        allowedScreens={currentUser?.allowedScreens}
      />

      {hasStudy && (
        <CaseShareModal
          isOpen={isShareModalOpen}
          onClose={onShareModalClose}
          studyId={currentStudy?.id || activeStudy?.id}
          accessionNumber={currentStudy?.accessionNumber || activeStudy?.accessionNumber}
          modality={currentStudy?.modality || activeStudy?.modality}
          patientName={currentPatient?.fullName}
          consultantName={consultantName}
        />
      )}

      {hasStudy && (
        <WorklistEditPatientModal
          isOpen={isEditingPatient}
          study={currentStudy}
          onClose={onEditingPatientClose}
          onPatientUpdated={onPatientUpdated}
        />
      )}
    </>
  );
}
