'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
  Loader2,
  HardDrive,
  Copy,
} from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { TablePagination } from '@/components/ui/table-pagination';
import { PacsSourceBadge } from '@/components/pacs/pacs-source-badge';
import { openStandbyStudy } from './standby-case-card';
import type { PacsStudyResult } from '@/types/pacs';

interface StandbyCasesTableProps {
  studies: PacsStudyResult[];
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
  scope?: 'mine' | 'all' | 'unassigned';
  onSwitchToUnassigned?: () => void;
}

type SortField = 'studyDate' | 'patientName' | 'modality' | 'accessionNumber';

function getModalityStyle(modality: string): string {
  const m = modality?.toUpperCase() || 'CT';
  if (m === 'CT') return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
  if (m === 'MR' || m === 'MRI') return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
  if (m === 'CR' || m === 'DX' || m === 'XR') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (m === 'US') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  return 'bg-secondary/15 text-secondary border-outline-variant/40';
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

export function StandbyCasesTable({
  studies,
  loading = false,
  className = '',
  scope = 'mine',
  onSwitchToUnassigned,
}: StandbyCasesTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('studyDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [openingAcc, setOpeningAcc] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const sortedStudies = useMemo(() => {
    const list = [...studies];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'studyDate') {
        const da = a.studyDate ? new Date(a.studyDate).getTime() : 0;
        const db = b.studyDate ? new Date(b.studyDate).getTime() : 0;
        cmp = da - db;
      } else if (sortField === 'patientName') {
        cmp = (a.patientName || '').localeCompare(b.patientName || '');
      } else if (sortField === 'modality') {
        cmp = (a.modality || '').localeCompare(b.modality || '');
      } else if (sortField === 'accessionNumber') {
        cmp = (a.accessionNumber || '').localeCompare(b.accessionNumber || '');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [studies, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedStudies.length / pageSize) || 1;
  const paginatedStudies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudies.slice(start, start + pageSize);
  }, [sortedStudies, currentPage, pageSize]);

  const handleRowClick = (study: PacsStudyResult) => {
    setOpeningAcc(study.accessionNumber);
    openStandbyStudy(study, router);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40 inline ml-1" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-primary inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary inline ml-1" />
    );
  };

  return (
    <div className={`w-full flex flex-col rounded-2xl border border-outline-variant/60 bg-surface shadow-xs overflow-hidden ${className}`}>
      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="bg-surface-container-low/70 border-b border-outline-variant/60 text-secondary text-[11px] font-semibold uppercase tracking-wider select-none">
              <th
                onClick={() => handleSort('patientName')}
                className="py-3 px-3.5 cursor-pointer hover:text-on-surface transition-colors"
              >
                <span>Patient / MRN</span>
                {renderSortIcon('patientName')}
              </th>
              <th
                onClick={() => handleSort('accessionNumber')}
                className="py-3 px-3 cursor-pointer hover:text-on-surface transition-colors"
              >
                <span>Accession</span>
                {renderSortIcon('accessionNumber')}
              </th>
              <th
                onClick={() => handleSort('modality')}
                className="py-3 px-3 cursor-pointer hover:text-on-surface transition-colors text-center"
              >
                <span>Modality</span>
                {renderSortIcon('modality')}
              </th>
              <th className="py-3 px-3">Study Description</th>
              <th
                onClick={() => handleSort('studyDate')}
                className="py-3 px-3 cursor-pointer hover:text-on-surface transition-colors"
              >
                <span>Date</span>
                {renderSortIcon('studyDate')}
              </th>
              <th className="py-3 px-3 text-center">Series / Slices</th>
              <th className="py-3 px-3 text-center">Source</th>
              <th className="py-3 px-3.5 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-outline-variant/30 text-on-surface">
            {loading && studies.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading diagnostic studies...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedStudies.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-secondary">
                  <div className="space-y-2 max-w-sm mx-auto">
                    <p className="font-semibold text-on-surface text-sm">
                      {scope === 'mine'
                        ? 'No cases currently assigned to you'
                        : scope === 'unassigned'
                        ? 'No unassigned cases waiting in queue'
                        : 'No diagnostic studies found'}
                    </p>
                    <p className="text-xs text-secondary leading-relaxed">
                      {scope === 'mine'
                        ? 'Your reporting workspace is clear. Pick up an unassigned study or claim a patient from the HMIS Worklist.'
                        : 'Try adjusting your search query, modality, or date filter.'}
                    </p>
                    {scope === 'mine' && onSwitchToUnassigned && (
                      <div className="pt-1.5 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={onSwitchToUnassigned}
                          className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Browse Unassigned
                        </button>
                        <Link href="/worklist">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            HMIS Worklist
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedStudies.map((study) => {
                const isOpening = openingAcc === study.accessionNumber;
                return (
                  <tr
                    key={study.accessionNumber}
                    onClick={() => handleRowClick(study)}
                    className="hover:bg-surface-container-low/60 cursor-pointer transition-colors group"
                  >
                    {/* Patient & MRN */}
                    <td className="py-2.5 px-3.5 min-w-[180px]">
                      <div className="font-bold text-[13px] text-on-surface group-hover:text-primary transition-colors font-headline">
                        {study.patientName || 'Unknown Patient'}
                      </div>
                      <div className="text-[11px] font-mono text-secondary flex items-center gap-1.5 mt-0.5">
                        <span>MRN: {study.patientMrn || study.patientId || '—'}</span>
                        {study.age ? <span>• {study.age}Y</span> : null}
                        {study.gender ? <span>• {study.gender[0]}</span> : null}
                      </div>
                    </td>

                    {/* Accession Number */}
                    <td className="py-2.5 px-3 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{study.accessionNumber}</span>
                        <CopyButton text={study.accessionNumber} label="Accession" size="xs" />
                      </div>
                    </td>

                    {/* Modality Pill */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono ${getModalityStyle(study.modality)}`}>
                        {study.modality || 'CT'}
                      </span>
                    </td>

                    {/* Study Description */}
                    <td className="py-2.5 px-3 max-w-xs truncate" title={study.studyDescription}>
                      <span className="text-xs text-on-surface font-medium truncate block">
                        {study.studyDescription || 'Diagnostic Scan'}
                      </span>
                    </td>

                    {/* Study Date */}
                    <td className="py-2.5 px-3 text-secondary text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0 opacity-60" />
                        <span>{formatDateDisplay(study.studyDate)}</span>
                      </div>
                    </td>

                    {/* Series & Slices count */}
                    <td className="py-2.5 px-3 text-center text-[11px] font-mono whitespace-nowrap text-secondary">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40">
                        <Layers className="w-3 h-3 text-primary shrink-0" />
                        <span>{study.numSeries || 1} ser • {study.numInstances || 1} slc</span>
                      </div>
                    </td>

                    {/* Source Badge */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <PacsSourceBadge
                        source={study.source}
                        availableSources={study.availableSources}
                        isDownloaded={study.isDownloaded}
                      />
                    </td>

                    {/* Quick Open Action Button */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRowClick(study)}
                        disabled={isOpening}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-2xs transition-all cursor-pointer group-hover:scale-105"
                        title="Load study in diagnostic workspace"
                      >
                        {isOpening ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>Open</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {studies.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={sortedStudies.length}
          itemName="studies"
          sticky={false}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
