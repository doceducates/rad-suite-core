'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getModalityColor, getPriorityColor, formatDate } from '@/lib/utils';
import { Copy, Check, Download, Printer, MessageCircle, ChevronDown, ChevronUp, AlertTriangle, ArrowUpRight, Eye, Filter, CheckSquare, Square } from 'lucide-react';
import type { PatientRecordRow } from '@/services/patient-records.service';
import {
  formatWhatsAppDailyList,
  formatLogbookCSV,
  formatLogbookHTML,
  generateWhatsAppLink,
} from '@/services/patient-records.service';
import {
  loadSavedPatientRecordsFilters,
  savePatientRecordsFilters,
  clearSavedPatientRecordsFilters,
} from '@/lib/table-filter-storage';
import { PatientRecordCard } from './patient-record-card';
import { PatientRecordsFilters, type DatePreset } from './patient-records-filters';
import { matchesModality } from '@/lib/modality-inference';

interface PatientRecordsTableProps {
  initialRows: PatientRecordRow[];
}

type SortField = 'date' | 'name' | 'modality' | 'status';
type SortDir = 'asc' | 'desc';

export function PatientRecordsTable({ initialRows }: PatientRecordsTableProps) {
  const [rows] = useState<PatientRecordRow[]>(initialRows);
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  const isHydratedRef = useRef(false);

  // 1. Hydrate saved filters on client mount (zero PHI/search prefill)
  useEffect(() => {
    if (isHydratedRef.current) return;
    isHydratedRef.current = true;
    const saved = loadSavedPatientRecordsFilters();
    if (!saved) return;
    if (saved.modalityFilter && saved.modalityFilter !== 'all') setModalityFilter(saved.modalityFilter);
    if (saved.statusFilter && saved.statusFilter !== 'all') setStatusFilter(saved.statusFilter);
    if (saved.datePreset && saved.datePreset !== 'all') setDatePreset(saved.datePreset as any);
    if (saved.customFrom) setCustomFrom(saved.customFrom);
    if (saved.customTo) setCustomTo(saved.customTo);
    if (saved.sortField) setSortField(saved.sortField);
    if (saved.sortDir) setSortDir(saved.sortDir);
  }, []);

  // 2. Persist after hydration whenever any filter changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    savePatientRecordsFilters({ modalityFilter, statusFilter, datePreset, customFrom, customTo, sortField, sortDir });
  }, [modalityFilter, statusFilter, datePreset, customFrom, customTo, sortField, sortDir]);

  // --- Filtering ---
  const filteredRows = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    return rows.filter(({ patient, study, report }) => {
      const q = search.toLowerCase();
      if (q && !(
        patient.fullName.toLowerCase().includes(q) ||
        patient.mrNumber.toLowerCase().includes(q) ||
        study.accessionNumber.toLowerCase().includes(q) ||
        study.scanType.toLowerCase().includes(q)
      )) return false;

      if (!matchesModality(study.modality, modalityFilter)) return false;
      const rStatus = report?.status || 'draft';
      if (statusFilter !== 'all' && rStatus !== statusFilter) return false;

      const schedDate = typeof study.scheduledAt === 'string' ? study.scheduledAt : new Date(study.scheduledAt).toISOString();
      if (datePreset === 'today' && schedDate < todayStart) return false;
      if (datePreset === 'week' && schedDate < weekAgo) return false;
      if (datePreset === 'month' && schedDate < monthStart) return false;
      if (datePreset === 'custom') {
        if (customFrom && schedDate < new Date(customFrom).toISOString()) return false;
        if (customTo && schedDate > new Date(customTo + 'T23:59:59').toISOString()) return false;
      }
      return true;
    });
  }, [rows, search, modalityFilter, statusFilter, datePreset, customFrom, customTo]);

  // --- Sorting ---
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = String(a.study.scheduledAt).localeCompare(String(b.study.scheduledAt)); break;
        case 'name': cmp = a.patient.fullName.localeCompare(b.patient.fullName); break;
        case 'modality': cmp = a.study.modality.localeCompare(b.study.modality); break;
        case 'status': cmp = (a.report?.status || 'draft').localeCompare(b.report?.status || 'draft'); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredRows, sortField, sortDir]);

  // --- Selection ---
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedRows.map((r) => r.study.id)));
    }
  }, [selectedIds.size, sortedRows]);

  const selectedRows = useMemo(
    () => sortedRows.filter((r) => selectedIds.has(r.study.id)),
    [sortedRows, selectedIds]
  );

  // --- Sort header click ---
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />) : null
  );

  // --- Export actions ---
  const copyWhatsApp = () => {
    const target = selectedRows.length > 0 ? selectedRows : sortedRows;
    navigator.clipboard.writeText(formatWhatsAppDailyList(target, new Date()));
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const target = selectedRows.length > 0 ? selectedRows : sortedRows;
    window.open(generateWhatsAppLink(formatWhatsAppDailyList(target, new Date())), '_blank');
  };

  const exportCSV = () => {
    const target = selectedRows.length > 0 ? selectedRows : sortedRows;
    const blob = new Blob([formatLogbookCSV(target)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radiology-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printLogbook = () => {
    const target = selectedRows.length > 0 ? selectedRows : sortedRows;
    const w = window.open('', '_blank');
    if (w) { w.document.write(formatLogbookHTML(target, new Date())); w.document.close(); w.print(); }
  };

  // --- Stats ---
  const stats = useMemo(() => {
    const total = sortedRows.length;
    const final_ = sortedRows.filter((r) => r.report?.status === 'final').length;
    const draft_ = sortedRows.filter((r) => !r.report || r.report.status === 'draft').length;
    const ct = sortedRows.filter((r) => r.study.modality.toUpperCase() === 'CT').length;
    const mri = sortedRows.filter((r) => r.study.modality.toUpperCase() === 'MRI').length;
    return { total, final: final_, draft: draft_, ct, mri };
  }, [sortedRows]);

  return (
    <div className="space-y-4 text-xs">
      {/* Filters & Stats Bar */}
      <PatientRecordsFilters
        search={search}
        onSearchChange={setSearch}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        modalityFilter={modalityFilter}
        onModalityFilterChange={setModalityFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        stats={stats}
      />

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/30">
          <span className="text-[11px] font-semibold text-primary">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={copyWhatsApp} className="gap-1 text-xs">
            {whatsappCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <MessageCircle className="w-3.5 h-3.5 text-green-500" />}
            {whatsappCopied ? 'Copied!' : 'Copy WhatsApp'}
          </Button>
          <Button size="sm" variant="outline" onClick={openWhatsApp} className="gap-1 text-xs">
            <MessageCircle className="w-3.5 h-3.5 text-green-500" /> Open WhatsApp
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={printLogbook} className="gap-1 text-xs">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400">
            Clear
          </Button>
        </div>
      )}

      {/* Desktop Table Container — hidden on mobile */}
      <div className="hidden md:flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden max-h-[calc(100vh-16rem)] min-h-[380px]">
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-3 w-10">
                <button onClick={toggleSelectAll} className="cursor-pointer">
                  {selectedIds.size === sortedRows.length && sortedRows.length > 0
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4 text-zinc-400" />}
                </button>
              </th>
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('name')}>Patient <SortIcon field="name" /></th>
              <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('modality')}>Modality / Study <SortIcon field="modality" /></th>
              <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('date')}>Date <SortIcon field="date" /></th>
              <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {sortedRows.map((row, idx) => {
              const { patient, study, report } = row;
              const rStatus = report?.status || 'draft';
              const isExpanded = expandedId === study.id;
              return (
                <tr key={study.id} className="hover:bg-primary/5 dark:hover:bg-zinc-800/40 transition-colors group">
                  <td className="py-2.5 px-3">
                    <input type="checkbox" checked={selectedIds.has(study.id)} onChange={() => toggleSelect(study.id)}
                      className="h-4 w-4 rounded border-zinc-300 accent-primary cursor-pointer" />
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{patient.fullName}</div>
                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 flex-wrap">
                      <span>MRN: {patient.mrNumber}</span>
                      <span>•</span>
                      <span className="text-primary font-bold">{study.accessionNumber}</span>
                      <span>•</span>
                      <span>{patient.age}y / {patient.gender}</span>
                    </div>
                    {patient.guardianName && <div className="text-[10px] text-zinc-400">S/O, D/O: {patient.guardianName}</div>}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getModalityColor(study.modality)}`}>{study.modality}</span>
                    <div className="text-zinc-600 dark:text-zinc-300 mt-0.5 max-w-[200px] truncate font-medium">{study.scanType}</div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500 text-[11px]">{formatDate(study.scheduledAt)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${rStatus === 'final' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : rStatus === 'preliminary' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>{rStatus}</span>
                    {report?.criticalFinding && (
                      <span title="🚨 Critical Finding (AI Flagged)" className="inline-flex items-center ml-1.5 align-middle">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      </span>
                    )}
                    {study.priority !== 'routine' && (
                      <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(study.priority)}`}>{study.priority}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setExpandedId(isExpanded ? null : study.id)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" title="Expand">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                      </button>
                      <Link href={`/workstation/${study.accessionNumber}`}>
                        <Button size="sm" variant="ghost" className="px-1.5 py-1 text-xs gap-1">
                          <Eye className="w-3.5 h-3.5 text-primary" /> <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedRows.length === 0 && <div className="p-8 text-center text-zinc-400">No records match the selected filters.</div>}
      </div>

      {/* Persistently Sticky Bottom Export Bar */}
      <div className="sticky bottom-0 z-20 shrink-0 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
        <span className="text-[11px] text-zinc-500">{sortedRows.length} records shown{selectedIds.size > 0 ? ` • ${selectedIds.size} selected` : ''}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyWhatsApp} className="gap-1 text-xs h-7 px-2.5">
            <MessageCircle className="w-3.5 h-3.5 text-green-500" /> {whatsappCopied ? 'Copied!' : 'WhatsApp'}
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs h-7 px-2.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={printLogbook} className="gap-1 text-xs h-7 px-2.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>
    </div>

    {/* Mobile Cards — shown only on mobile */}
    <div className="md:hidden space-y-2">
      {sortedRows.map((row, idx) => (
        <PatientRecordCard key={row.study.id} row={row} index={idx} selected={selectedIds.has(row.study.id)} onToggleSelect={() => toggleSelect(row.study.id)} />
      ))}
      {sortedRows.length === 0 && <div className="p-6 text-center text-zinc-400 text-sm">No records match filters.</div>}
    </div>
    </div>
  );
}
