'use client';

import React from 'react';
import { HardDrive, Check, Clock, AlertCircle, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { TablePagination } from '@/components/ui/table-pagination';
import { PacsTableRow } from './pacs-table-row';
import type { EnrichedHospitalPacsStudy } from '@/services/pacs-study-enrichment.service';
import type { HospitalPacsStudy } from '@/db/schema';

interface PacsUnifiedTableProps {
  studies: (HospitalPacsStudy | EnrichedHospitalPacsStudy)[];
  selectedAccessions: Set<string>;
  onToggleSelect: (accession: string) => void;
  onToggleSelectAll: () => void;
  onSingleSync: (accession: string) => void;
  onSinglePull?: (accession: string) => void;
  onStreamAndView: (study: HospitalPacsStudy, mode?: 'review' | 'report') => void;
  onClaimCase?: (accession: string) => void;
  onShareCase?: (study: HospitalPacsStudy) => void;
  currentPage: number;
  pageSize: number;
  totalStudies: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  loading?: boolean;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  canPull?: boolean;
  canUpload?: boolean;
  canDownloadZip?: boolean;
}

export function PacsUnifiedTable({
  studies,
  selectedAccessions,
  onToggleSelect,
  onToggleSelectAll,
  onSingleSync,
  onSinglePull,
  onStreamAndView,
  onClaimCase,
  onShareCase,
  currentPage,
  pageSize,
  totalStudies,
  onPageChange,
  onPageSizeChange,
  loading = false,
  sortField,
  sortDirection,
  onSort,
  canPull = true,
  canUpload = true,
  canDownloadZip = true,
}: PacsUnifiedTableProps) {
  const allOnPageSelected = studies.length > 0 && studies.every((s) => selectedAccessions.has(s.accessionNumber));
  const someOnPageSelected = studies.some((s) => selectedAccessions.has(s.accessionNumber)) && !allOnPageSelected;

  const totalPages = Math.ceil(totalStudies / pageSize) || 1;

  const renderS3StatusBadge = (status?: string | null) => {
    switch (status) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Check className="w-3 h-3" />
            <span>S3 Synced</span>
          </span>
        );
      case 'in_sandbox':
      case 'local_only':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <HardDrive className="w-3 h-3 text-sky-500" />
            <span>In MedicalSandbox</span>
          </span>
        );
      case 'queued':
      case 'uploading':
      case 'retrieving':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border">
            <HardDrive className="w-3 h-3 text-muted-foreground/80" />
            <span>On Hospital PACS</span>
          </span>
        );
    }
  };

  const renderSortIndicator = (field: string) => {
    if (!onSort) return null;
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-40 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 inline ml-0.5 text-primary" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-0.5 text-primary" />
    );
  };

  return (
    <div className="flex flex-col border border-border/70 rounded-xl bg-card overflow-hidden shadow-xs space-y-0 text-xs max-h-[calc(100vh-15.5rem)] min-h-[380px]">
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-container/95 backdrop-blur-xs border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => { if (el) el.indeterminate = someOnPageSelected; }}
                  onChange={onToggleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary cursor-pointer w-3.5 h-3.5"
                  title="Select all on this page"
                />
              </th>
              <th
                className={`py-2.5 px-3 select-none ${onSort ? 'cursor-pointer hover:text-foreground group' : ''}`}
                onClick={() => onSort?.('patientName')}
              >
                <span className="inline-flex items-center">
                  Patient & Identifiers
                  {renderSortIndicator('patientName')}
                </span>
              </th>
              <th
                className={`py-2.5 px-3 select-none ${onSort ? 'cursor-pointer hover:text-foreground group' : ''}`}
                onClick={() => onSort?.('modality')}
              >
                <span className="inline-flex items-center">
                  Modality
                  {renderSortIndicator('modality')}
                </span>
              </th>
              <th
                className={`py-2.5 px-3 select-none ${onSort ? 'cursor-pointer hover:text-foreground group' : ''}`}
                onClick={() => onSort?.('studyDescription')}
              >
                <span className="inline-flex items-center">
                  Study Description
                  {renderSortIndicator('studyDescription')}
                </span>
              </th>
              <th
                className={`py-2.5 px-3 select-none ${onSort ? 'cursor-pointer hover:text-foreground group' : ''}`}
                onClick={() => onSort?.('numInstances')}
              >
                <span className="inline-flex items-center">
                  Series / Slices
                  {renderSortIndicator('numInstances')}
                </span>
              </th>
              <th className="py-2.5 px-3">Impression</th>
              <th
                className={`py-2.5 px-3 select-none ${onSort ? 'cursor-pointer hover:text-foreground group' : ''}`}
                onClick={() => onSort?.('studyDate')}
              >
                <span className="inline-flex items-center">
                  Study Date & Time
                  {renderSortIndicator('studyDate')}
                </span>
              </th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Querying Hospital PACS Database Index...</span>
                  </div>
                </td>
              </tr>
            ) : studies.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground text-sm">No hospital studies found</p>
                  <p className="text-xs">No matching studies in the selected date window or search filter.</p>
                </td>
              </tr>
            ) : (
              studies.map((st) => (
                <PacsTableRow
                  key={st.id || `${st.accessionNumber}-${st.modality}`}
                  study={st as EnrichedHospitalPacsStudy}
                  isSelected={selectedAccessions.has(st.accessionNumber)}
                  onToggleSelect={onToggleSelect}
                  onSingleSync={onSingleSync}
                  onSinglePull={onSinglePull}
                  onStreamAndView={onStreamAndView}
                  onClaimCase={onClaimCase}
                  onShareCase={onShareCase}
                  renderS3StatusBadge={renderS3StatusBadge}
                  canPull={canPull}
                  canUpload={canUpload}
                  canDownloadZip={canDownloadZip}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalStudies}
        itemName="hospital studies"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange || (() => {})}
      />
    </div>
  );
}
