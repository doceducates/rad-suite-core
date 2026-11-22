'use client';

import React from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  FileEdit,
  Sparkles,
  Layers,
  UploadCloud,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StandbyCasesTable } from './standby/standby-cases-table';
import { StandbyFilterBar } from './standby/standby-filter-bar';
import { useStandbyCases } from './standby/use-standby-cases';
import type { PacsStudyResult } from '@/types/pacs';

export interface StandbyCaseItem {
  id: string;
  patientName: string;
  patientId: string;
  accessionNumber: string;
  modality: string;
  studyDescription: string;
  numSeries?: number;
  numInstances?: number;
  source?: 'local' | 'pacs';
}

interface ZenWorkstationStandbyProps {
  onOpenPacsSearch: () => void;
  recentCases?: StandbyCaseItem[];
  onStartBlankReport?: () => void;
  onOpenFolderImport?: () => void;
  currentUser?: any;
}

export function ZenWorkstationStandby({
  onOpenPacsSearch,
  recentCases = [],
  onStartBlankReport,
  onOpenFolderImport,
  currentUser,
}: ZenWorkstationStandbyProps) {
  // Convert recentCases into PacsStudyResult format for initial fallback
  const initialCases: PacsStudyResult[] = recentCases.map((c) => ({
    accessionNumber: c.accessionNumber || c.id,
    patientName: c.patientName,
    patientMrn: c.patientId,
    patientId: c.patientId,
    age: 0,
    gender: 'Other',
    modality: c.modality,
    studyDescription: c.studyDescription,
    studyDate: new Date().toISOString().split('T')[0],
    numSeries: c.numSeries || 1,
    numInstances: c.numInstances || 1,
    pacsServerAe: 'LOCAL_ARCHIVE',
    studyInstanceUid: `1.2.840.${c.accessionNumber || c.id}`,
    source: c.source === 'pacs' ? 'hospital_pacs' : 'local_archive',
    localCaseId: c.id,
    isDownloaded: c.source === 'local',
  }));

  const {
    scope,
    setScope,
    source,
    setSource,
    query,
    setQuery,
    modality,
    setModality,
    region,
    setRegion,
    dateRange,
    setDateRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    status,
    setStatus,
    studies,
    counts,
    loading,
    refresh,
    resetFilters,
    activeFilterCount,
  } = useStandbyCases(initialCases, currentUser?.id);

  return (
    <div className="w-full h-full flex flex-col items-center p-4 sm:p-6 bg-surface-container-lowest/80 text-on-surface overflow-y-auto select-none">
      <div className="max-w-5xl w-full flex flex-col items-center text-center space-y-6 my-auto py-6">
        {/* Header: Icon & Workstation Ready */}
        <div className="relative group">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-xs transition-transform group-hover:scale-105">
            <Layers className="w-7 h-7 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-surface-container-lowest animate-pulse" />
        </div>

        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-surface-container border border-outline-variant/60 text-secondary">
            <Sparkles className="w-3 h-3 text-primary" />
            Rad Suite • Clinical Workspace Standby
          </div>
          <h2 className="text-2xl font-bold font-headline tracking-tight text-on-surface">
            Diagnostic Workspace Ready
          </h2>
          <p className="text-xs text-secondary leading-relaxed">
            Select a diagnostic study from local storage, Google Drive, cloud archive, or hospital PACS.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button
            onClick={onOpenPacsSearch}
            className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Case Archive</span>
            <kbd className="font-mono text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white font-semibold">⌘K</kbd>
          </Button>

          <Link href="/worklist">
            <Button
              variant="outline"
              className="gap-2 border-outline-variant/60 hover:bg-surface-container text-on-surface font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Clinical Worklist</span>
              <kbd className="font-mono text-[9px] bg-surface-container-high px-1.5 py-0.5 rounded text-secondary border border-outline-variant/40">⌥1</kbd>
            </Button>
          </Link>

          {onOpenFolderImport && (
            <Button
              variant="outline"
              onClick={onOpenFolderImport}
              className="gap-2 border-primary/40 hover:bg-primary/10 text-primary font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Import Local Folder</span>
            </Button>
          )}

          {onStartBlankReport && (
            <Button
              variant="ghost"
              onClick={onStartBlankReport}
              className="gap-1.5 hover:bg-surface-container text-secondary hover:text-on-surface text-xs px-3.5 py-2 rounded-xl cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Ad-hoc / Blank Report</span>
            </Button>
          )}
        </div>

        {/* Interactive Case Source Selector Section & Smart Table */}
        <div className="w-full space-y-3 pt-2">
          {/* Single-Bar Cockpit Filter Bar with Source Selection Dropdown */}
          <StandbyFilterBar
            scope={scope}
            setScope={setScope}
            source={source}
            setSource={setSource}
            allowedSources={currentUser?.allowedStorageSources}
            isAdmin={currentUser?.role === 'admin'}
            counts={counts}
            query={query}
            setQuery={setQuery}
            modality={modality}
            setModality={setModality}
            region={region}
            setRegion={setRegion}
            dateRange={dateRange}
            setDateRange={setDateRange}
            customFrom={customFrom}
            setCustomFrom={setCustomFrom}
            customTo={customTo}
            setCustomTo={setCustomTo}
            status={status}
            setStatus={setStatus}
            loading={loading}
            onRefresh={refresh}
            onReset={resetFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* Smart Responsive Diagnostic Cases Table */}
          <StandbyCasesTable
            studies={studies}
            loading={loading}
            onRefresh={refresh}
            scope={scope}
            onSwitchToUnassigned={() => setScope('unassigned')}
          />
        </div>

        {/* Drag & Drop Visual Target */}
        <div
          onClick={onOpenFolderImport}
          className={`w-full border border-dashed border-outline-variant/50 hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-container/60 rounded-xl p-3.5 flex items-center justify-center gap-2.5 text-secondary text-xs transition-colors ${
            onOpenFolderImport ? 'cursor-pointer' : ''
          }`}
          title={onOpenFolderImport ? 'Click to select or scan local folder' : undefined}
        >
          <UploadCloud className="w-4 h-4 text-primary shrink-0" />
          <span>Click to import folder or drag and drop DICOM instances directly into viewport</span>
        </div>

        {/* Clinical Quick Keys */}
        <div className="text-[10px] font-mono text-secondary/60 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>⌘K Case Search</span>
          <span>⌥1 Worklist</span>
          <span>[ Sidebar</span>
          <span>⌥3 Studio</span>
        </div>
      </div>
    </div>
  );
}
