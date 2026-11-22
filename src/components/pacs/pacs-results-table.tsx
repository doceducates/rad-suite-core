'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getModalityColor, formatDicomDateTime, formatDicomDob } from '@/lib/utils';
import { ExternalLink, Loader2, Check, Eye, HardDrive, Server } from 'lucide-react';
import { PacsPagination } from './pacs-pagination';
import type { PacsStudyResult } from '@/types/pacs';

interface PacsResultsTableProps {
  studies: PacsStudyResult[];
  openingAccession: string | null;
  importedMap: Record<string, boolean>;
  onOpenWorkstation: (study: PacsStudyResult) => void;
}

export function PacsResultsTable({
  studies,
  openingAccession,
  importedMap,
  onOpenWorkstation,
}: PacsResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [studies.length, pageSize]);

  if (studies.length === 0) return null;

  const totalPages = Math.ceil(studies.length / pageSize);
  const paginated = studies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="border border-outline-variant/60 rounded-xl overflow-hidden bg-surface-container-lowest shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container/60 border-b border-outline-variant/60 text-[11px] text-secondary font-medium">
            <tr>
              <th className="py-2.5 px-3">Study Date & Time</th>
              <th className="py-2.5 px-3">Patient Name</th>
              <th className="py-2.5 px-3">DOB</th>
              <th className="py-2.5 px-3">Patient ID</th>
              <th className="py-2.5 px-3">Modality</th>
              <th className="py-2.5 px-3">Study Description</th>
              <th className="py-2.5 px-3">Accession Number</th>
              <th className="py-2.5 px-3">Exam ID</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 font-mono text-[11px]">
            {paginated.map((s) => {
              const isOpening = openingAccession === s.accessionNumber;
              const isImported = importedMap[s.accessionNumber];
              const isLocal = s.source === 'local_archive' || s.source === 'local';

              return (
                <tr key={s.accessionNumber} className="hover:bg-surface-container/50 transition-colors">
                  <td className="py-2.5 px-3 text-on-surface whitespace-nowrap">
                    {formatDicomDateTime(s.studyDate)}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-on-surface whitespace-nowrap">
                    {s.patientName}
                  </td>
                  <td className="py-2.5 px-3 text-secondary whitespace-nowrap">
                    {formatDicomDob(s.dateOfBirth) || (s.age ? `${s.age}y` : '-')}
                  </td>
                  <td className="py-2.5 px-3 text-secondary font-mono whitespace-nowrap">
                    {s.patientMrn || s.patientId}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold ${getModalityColor(s.modality)}`}>
                      {s.modality}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-on-surface-variant font-medium truncate max-w-xs">
                    {s.studyDescription}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-primary whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{s.accessionNumber}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-sans px-1 py-0.2 rounded border ${
                        isLocal ? 'border-primary/40 bg-primary/10 text-primary' : 'border-secondary/40 bg-secondary/10 text-secondary'
                      }`}>
                        {isLocal ? <HardDrive className="w-2.5 h-2.5" /> : <Server className="w-2.5 h-2.5" />}
                        {isLocal ? 'Local' : 'PACS'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-secondary font-mono whitespace-nowrap">
                    {s.examId || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `radiant://?accession=${encodeURIComponent(s.accessionNumber)}`}
                        title="Open full-fidelity volume in RadiAnt"
                        className="h-6 text-[10px] px-2 text-secondary hover:text-primary border-outline-variant/60"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> RadiAnt
                      </Button>
                      <Button
                        size="sm"
                        disabled={isOpening}
                        onClick={() => onOpenWorkstation(s)}
                        className="h-6 text-[10px] px-2.5 gap-1 font-semibold bg-primary hover:bg-primary/90 text-on-primary"
                      >
                        {isOpening ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                        Open
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PacsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={studies.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
