'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Menu, RotateCcw, FolderOpen, Eye, FileText, Share2 } from 'lucide-react';
import { ZenPatientQueueDropdown } from './zen-patient-queue-dropdown';
import { DesktopHistoryControls } from '@/components/common/DesktopHistoryControls';
import { HeaderUserCluster } from '@/components/layout/header-user-cluster';
import type { ReportSectionsState } from './report-section-dots';

interface StitchHeaderProps {
  patientName: string;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  userStatus?: string;
  age?: number | string;
  gender?: string;
  modality: string;
  accessionNumber?: string;
  patientMrn?: string;
  studyDescription?: string;
  referringDoctor?: string;
  status: 'draft' | 'final' | 'pending';
  onSave?: () => void;
  onFinalize?: () => void;
  onOpenCommandPalette: () => void;
  onOpenPacsSearch?: () => void;
  onOpenMyCasesSearch?: () => void;
  onOpenFolderImport?: () => void;
  currentCaseId?: string;
  onOpenMobileNav?: () => void;
  onEditPatient?: () => void;
  onReleaseCase?: () => void;
  isReleasingCase?: boolean;
  reportSections?: ReportSectionsState;
  currentUserId?: string;
  isReviewMode?: boolean;
  onToggleReviewMode?: () => void;
  onShareCase?: () => void;
  companionStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
  }[];
  newerStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
    studyDate?: string;
  }[];
  priorStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
    studyDate?: string;
  }[];
}

export function StitchHeader({
  patientName,
  userName,
  userRole,
  userEmail,
  userStatus,
  age,
  gender,
  modality = 'CT',
  accessionNumber,
  patientMrn,
  studyDescription = 'Medical Imaging Examination',
  onSave,
  onFinalize,
  onOpenCommandPalette,
  onOpenPacsSearch,
  onOpenMyCasesSearch,
  onOpenFolderImport,
  currentCaseId,
  onOpenMobileNav,
  onEditPatient,
  onReleaseCase,
  isReleasingCase = false,
  reportSections,
  currentUserId,
  isReviewMode = false,
  onToggleReviewMode,
  onShareCase,
  companionStudies,
  newerStudies = [],
  priorStudies = [],
}: StitchHeaderProps) {
  const handleTriggerSearch = onOpenPacsSearch || onOpenCommandPalette;

  return (
    <div className="relative z-40 h-14 px-4 bg-surface/95 backdrop-blur-md border-b border-outline-variant/60 flex items-center justify-between gap-3 shrink-0 select-none">
      {/* Left: Mobile Nav Toggle + History Controls + Patient Queue Dropdown */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="md:hidden p-1.5 -ml-1 text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <DesktopHistoryControls showHome={true} className="hidden md:inline-flex" />

        {/* Patient Queue Dropdown with 3-Dot Status (History, Findings, Impression) */}
        <div className="flex items-center gap-1.5">
          <ZenPatientQueueDropdown
            currentAccession={accessionNumber}
            currentCaseId={currentCaseId}
            currentPatientName={patientName}
            currentSections={reportSections}
            currentUserId={currentUserId}
            onOpenPacsSearch={onOpenPacsSearch}
          />

          {onOpenMyCasesSearch && (
            <button
              type="button"
              onClick={onOpenMyCasesSearch}
              className="hidden 2xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-outline-variant/40"
              title="Quick Search My Assigned Patients in Modal"
            >
              <span>Search Mine</span>
            </button>
          )}

          {onOpenFolderImport && (
            <button
              type="button"
              onClick={onOpenFolderImport}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant/40 hover:border-primary/40"
              title="Import local DICOM folder / studies"
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Import Folder</span>
            </button>
          )}
        </div>

        {newerStudies && newerStudies.length > 0 && newerStudies.map((newer) => (
          <a
            key={newer.accessionNumber}
            href={`/workspace/${encodeURIComponent(newer.accessionNumber)}`}
            title={`⚡ Subsequent/Newer examination available: ${newer.studyDescription} (${newer.accessionNumber})`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition-colors font-semibold shrink-0"
          >
            <span>⚡ Newer:</span>
            <span className="font-mono font-bold">{newer.accessionNumber.slice(-5)}</span>
            <span className="truncate max-w-[120px]">
              {newer.modality ? `[${newer.modality}] ` : ''}{newer.studyDescription}
            </span>
            <span>↗</span>
          </a>
        ))}

        {companionStudies && companionStudies.length > 0 && companionStudies.map((companion) => (
          <a
            key={companion.accessionNumber}
            href={`/workspace/${encodeURIComponent(companion.accessionNumber)}`}
            title={`Switch to companion study: ${companion.studyDescription} (${companion.accessionNumber})`}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 transition-colors font-medium shrink-0"
          >
            <span>📚 Companion:</span>
            <span className="font-mono font-bold">{companion.accessionNumber}</span>
            <span className="truncate max-w-[120px]">
              {companion.modality ? `[${companion.modality}] ` : ''}{companion.studyDescription}
            </span>
            <span>↗</span>
          </a>
        ))}

        {priorStudies && priorStudies.length > 0 && priorStudies.map((prior) => (
          <a
            key={prior.accessionNumber}
            href={`/workspace/${encodeURIComponent(prior.accessionNumber)}`}
            title={`View prior examination: ${prior.studyDescription} (${prior.accessionNumber})`}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors font-medium shrink-0"
          >
            <span>📜 Prior:</span>
            <span className="font-mono font-bold">{prior.accessionNumber.slice(-5)}</span>
            <span className="truncate max-w-[120px]">
              {prior.modality ? `[${prior.modality}] ` : ''}{prior.studyDescription}
            </span>
            <span>↗</span>
          </a>
        ))}
      </div>

      {/* Center: Single Unified PACS & Diagnostic Case Search Bar */}
      <div className="flex-1 max-w-md mx-2 flex items-center justify-center">
        <button
          type="button"
          onClick={handleTriggerSearch}
          className="w-full flex items-center bg-surface-container rounded-lg border border-outline-variant/50 px-3 py-1.5 text-on-surface-variant hover:border-primary hover:bg-surface-container-lowest transition-all cursor-pointer shadow-2xs group"
          title="Search Diagnostic Cases & PACS Archive (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-primary mr-2 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="w-full font-body text-[12px] text-secondary/80 text-left truncate">
            Search cases by patient, MRN, accession...
          </span>
          <kbd className="font-mono text-[9px] bg-surface-container-high px-1.5 py-0.5 rounded text-secondary border border-outline-variant/50 font-semibold ml-1.5 shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Workspace Clinical Actions & Persistent Header User Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {onToggleReviewMode && (
          <div className="flex items-center bg-surface-container-high/60 rounded-lg p-0.5 border border-outline-variant/60 shrink-0">
            <button
              type="button"
              onClick={isReviewMode ? undefined : onToggleReviewMode}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                isReviewMode
                  ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
              title="Review Mode: 100% full-width image viewer, reporting panel collapsed"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Review</span>
            </button>
            <button
              type="button"
              onClick={!isReviewMode ? undefined : onToggleReviewMode}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                !isReviewMode
                  ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
              title="Reporting Mode: Split view with structured TipTap editor, voice dictation, and MedGemma AI"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Report</span>
            </button>
          </div>
        )}

        {onShareCase && (
          <button
            type="button"
            onClick={onShareCase}
            className="h-8 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Share case with supervising consultant (Password-protected, time-limited review link)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Case</span>
          </button>
        )}

        {onReleaseCase && (
          <button
            type="button"
            onClick={onReleaseCase}
            disabled={isReleasingCase}
            className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-outline-variant/50 text-secondary font-label text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Unassign & Release case back to HMIS worklist pool"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReleasingCase ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Unassign</span>
          </button>
        )}

        {/* Unified Persistent User Cluster (Profile Avatar Dropdown) */}
        <HeaderUserCluster
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          userStatus={userStatus}
          showPlugins={true}
        />
      </div>
    </div>
  );
}
