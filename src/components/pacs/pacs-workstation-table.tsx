'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, RefreshCw, ExternalLink, Download, MonitorPlay, Eye, HardDrive, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { TablePagination } from '@/components/ui/table-pagination';
import { PacsSourceFilterPills } from './pacs-source-filter-pills';
import { WorklistReportModal } from '@/components/worklist/worklist-report-modal';
import { getModalityColor, formatDicomDateTime } from '@/lib/utils';
import type { PacsStudyResult, StorageSourceType } from '@/types/pacs';

interface PacsWorkstationTableProps {
  initialStudies: PacsStudyResult[];
}

export function PacsWorkstationTable({ initialStudies = [] }: PacsWorkstationTableProps) {
  const [studies, setStudies] = useState<PacsStudyResult[]>(initialStudies);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modality, setModality] = useState('all');
  const [activeSource, setActiveSource] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedReportStudy, setSelectedReportStudy] = useState<PacsStudyResult | null>(null);

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (searchQuery.trim()) p.set('query', searchQuery.trim());
      if (modality !== 'all') p.set('modality', modality);
      if (activeSource !== 'all') p.set('source', activeSource);
      p.set('limit', '100');

      const res = await fetch(`/api/pacs/query?${p.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.studies)) {
        setStudies(data.studies);
      }
    } catch (err) {
      console.error('Failed fetching PACS studies:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, modality, activeSource]);

  // Client-side filtering & source counting
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: studies.length };
    for (const s of studies) {
      const srcList = s.availableSources || (s.source ? [s.source as StorageSourceType] : []);
      for (const src of srcList) {
        counts[src] = (counts[src] || 0) + 1;
      }
    }
    return counts;
  }, [studies]);

  const filteredStudies = useMemo(() => {
    return studies.filter((s) => {
      if (activeSource !== 'all') {
        const srcList = s.availableSources || (s.source ? [s.source as StorageSourceType] : []);
        if (!srcList.includes(activeSource as StorageSourceType)) return false;
      }
      if (modality !== 'all' && s.modality.toUpperCase() !== modality.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.accessionNumber.toLowerCase().includes(q) ||
          s.patientName.toLowerCase().includes(q) ||
          (s.patientMrn && s.patientMrn.toLowerCase().includes(q)) ||
          s.studyDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [studies, activeSource, modality, searchQuery]);

  const totalPages = Math.ceil(filteredStudies.length / pageSize) || 1;
  const paginatedStudies = useMemo(() => {
    const offset = (currentPage - 1) * pageSize;
    return filteredStudies.slice(offset, offset + pageSize);
  }, [filteredStudies, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Search & Modality Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search PACS by patient name, MRN, accession or description..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            {['all', 'CT', 'MR', 'CR', 'US'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModality(m); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  modality === m
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'all' ? 'All Modalities' : m}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchStudies}
            disabled={loading}
            title="Refresh PACS index"
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Storage Source Filter Pills */}
      <PacsSourceFilterPills
        activeSource={activeSource}
        onSourceChange={(src) => { setActiveSource(src); setCurrentPage(1); }}
        counts={sourceCounts}
      />

      {/* Studies Table */}
      <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-xs max-h-[calc(100vh-15.5rem)] min-h-[380px]">
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Accession & Modality</th>
                <th className="py-2.5 px-4">Patient Information</th>
                <th className="py-2.5 px-4">Study Description</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Storage Locations</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && paginatedStudies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Querying storage sources...</span>
                  </td>
                </tr>
              ) : paginatedStudies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-foreground">No studies found in storage locations</p>
                    <p className="text-xs mt-1">Try selecting &ldquo;All Sources&rdquo; or clearing your search term.</p>
                  </td>
                </tr>
              ) : (
                paginatedStudies.map((st) => {
                  const sources = st.availableSources || (st.source ? [st.source as StorageSourceType] : ['local_archive']);
                  const isLocal = sources.includes('local_archive') || st.source === 'local_archive';
                  const hasS3 = sources.includes('s3');

                  return (
                    <tr
                      key={st.accessionNumber}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/workstation/${encodeURIComponent(st.accessionNumber)}`}
                    >
                      {/* Accession & Modality */}
                      <td className="py-3 px-4 font-mono" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/workstation/${encodeURIComponent(st.accessionNumber)}`}
                            className="font-bold text-primary hover:underline text-xs"
                          >
                            {st.accessionNumber}
                          </Link>
                          <CopyButton text={st.accessionNumber} size="xs" />
                        </div>
                        <div className="mt-1">
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getModalityColor(st.modality)}`}>
                            {st.modality}
                          </span>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{st.patientName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          MRN: {st.patientMrn || st.patientId || 'N/A'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {st.age > 0 ? `${st.age}y` : ''} {st.gender}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-foreground truncate" title={st.studyDescription}>
                          {st.studyDescription}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {st.numSeries && st.numSeries > 1 ? `${st.numSeries} series • ` : ''}{st.numInstances || 1} slices
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {formatDicomDateTime(st.studyDate, st.studyTime)}
                      </td>

                      {/* Storage Locations */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          {sources.map((src) => {
                            if (src === 'local_archive') {
                              return <span key={src} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">Local E:</span>;
                            }
                            if (src === 's3') {
                              return <span key={src} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">S3 Cloud</span>;
                            }
                            if (src === 'gdrive') {
                              return <span key={src} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono">GDrive</span>;
                            }
                            if (src === 'hospital_pacs') {
                              return <span key={src} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono">Hospital PACS</span>;
                            }
                            return <span key={src} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">Clinic Node</span>;
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isLocal && (
                            <button
                              onClick={() => { window.location.href = `radiant://?accession=${encodeURIComponent(st.accessionNumber)}`; }}
                              title="Launch directly in RadiAnt"
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-primary" />
                            </button>
                          )}

                          <button
                            onClick={() => { window.location.href = `/api/pacs/download?accession=${encodeURIComponent(st.accessionNumber)}`; }}
                            title="Download DICOM ZIP Archive"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-500" />
                          </button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedReportStudy(st)}
                            title="Quick Read"
                            className="gap-1 text-xs px-2.5 py-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Read</span>
                          </Button>

                          <Link href={`/workstation/${encodeURIComponent(st.accessionNumber)}`}>
                            <Button size="sm" variant="outline" className="gap-1 text-xs px-2.5 py-1">
                              <MonitorPlay className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                              <span>Open</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredStudies.length}
          itemName="studies"
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>

      {selectedReportStudy && (
        <WorklistReportModal
          study={selectedReportStudy}
          isOpen={Boolean(selectedReportStudy)}
          onClose={() => setSelectedReportStudy(null)}
          onReportSaved={() => fetchStudies()}
        />
      )}
    </div>
  );
}
