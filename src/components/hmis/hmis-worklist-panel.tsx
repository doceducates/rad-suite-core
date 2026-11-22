'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, FileText, Activity, Clock, ArrowRight, Search, X } from 'lucide-react';
import { matchesModality } from '@/lib/modality-inference';

export interface WorklistPatientRecord {
  patientName: string;
  mrn: string;
  cnic?: string;
  gender?: string;
  department?: string;
  room?: string;
  modality?: string;
  billingStatus?: string;
  orderDate?: string;
  cpt?: string;
  accession?: string;
  investigationId?: string;
}

interface HmisWorklistPanelProps {
  onStageStudy: (study: WorklistPatientRecord) => void;
  onTrackAccession: (accession: string) => void;
  disabled?: boolean;
}

export function HmisWorklistPanel({ onStageStudy, onTrackAccession, disabled = false }: HmisWorklistPanelProps) {
  const [records, setRecords] = useState<WorklistPatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalityFilter, setModalityFilter] = useState<'all' | 'MRI' | 'CT'>('all');
  const [datePreset, setDatePreset] = useState<'shift' | 'today' | 'week'>('shift');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncSummary, setSyncSummary] = useState<{
    totalFetched: number;
    newStudiesCreated: number;
    existingUpdated: number;
  } | null>(null);

  const fetchWorklist = async (overridePreset?: 'shift' | 'today' | 'week', overrideModality?: 'all' | 'MRI' | 'CT') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const activePreset = overridePreset || datePreset;
      const activeMod = overrideModality || modalityFilter;
      const params = new URLSearchParams({ perPage: '100' });
      if (activeMod !== 'all') {
        params.set('subCategory', activeMod);
      }

      const now = new Date();
      const toYmd = (daysAgo: number) =>
        new Date(now.getTime() - daysAgo * 86400000).toISOString().split('T')[0];

      if (activePreset === 'shift') {
        params.set('startDate', toYmd(1));
        params.set('endDate', toYmd(0));
      } else if (activePreset === 'today') {
        params.set('startDate', toYmd(0));
        params.set('endDate', toYmd(0));
      } else if (activePreset === 'week') {
        params.set('startDate', toYmd(7));
        params.set('endDate', toYmd(0));
      }

      const res = await fetch(`/api/hmis/worklist?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to fetch worklist from HMIS portal');
      } else {
        if (data.syncSummary) {
          setSyncSummary(data.syncSummary);
        }
        const flattened: WorklistPatientRecord[] = [];
        const seenKeys = new Set<string>();

        const rawList: any[] = Array.isArray(data.data)
          ? data.data
          : (Array.isArray(data.data?.records)
            ? data.data.records
            : (Array.isArray(data.records) ? data.records : []));

        rawList.forEach((pat: any) => {
          const pName = pat.patientName?.trim();
          const pMrn = pat.mrn?.trim();
          if (!pName || !pMrn || pName.toLowerCase() === 'patient') return;

          const dateStr = pat.rawDateTime || pat.studyDateTime || pat.studyDate || pat.orderDate;
          const invList = pat.investigations?.length ? pat.investigations : [{
            accession: pat.accession || '',
            studyTitle: pat.cpt || 'Radiology Examination',
            patientInvestigationId: pat.investigationId,
            canAddResult: true,
            studyDateTime: dateStr,
          }];

          invList.forEach((inv: any) => {
            const acc = inv.accession || pat.accession || '';
            const key = `${pMrn}-${acc}`;
            if (seenKeys.has(key)) return;
            seenKeys.add(key);

            flattened.push({
              patientName: pName,
              mrn: pMrn,
              cnic: pat.cnic,
              gender: pat.gender,
              department: pat.department,
              room: pat.room,
              modality: pat.modality || (inv.studyTitle?.toUpperCase().includes('MRI') ? 'MRI' : 'CT'),
              cpt: inv.studyTitle || pat.cpt || 'Radiology Examination',
              accession: acc,
              investigationId: inv.patientInvestigationId || pat.investigationId,
              billingStatus: inv.canAddResult ? 'Awaiting Report' : 'Processed',
              orderDate: inv.studyDateTime || inv.studyDate || dateStr,
            });
          });
        });
        setRecords(flattened);
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!disabled) {
      fetchWorklist();
    }
  }, [disabled]);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (!matchesModality(rec.modality || '', modalityFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const match =
          rec.patientName.toLowerCase().includes(q) ||
          rec.mrn.toLowerCase().includes(q) ||
          (rec.accession && rec.accession.toLowerCase().includes(q)) ||
          (rec.cpt && rec.cpt.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [records, modalityFilter, searchQuery]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-foreground">HMIS Proceeded Patients Worklist</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
            {records.length} Scraped Patients
          </Badge>
          {syncSummary && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              ✓ Synced to Worklist ({syncSummary.newStudiesCreated} new, {syncSummary.existingUpdated} updated)
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchWorklist()}
          disabled={loading || disabled}
          className="h-7 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Worklist
        </Button>
      </div>

      {/* Quick Filter & In-Memory Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container/60 p-2 rounded-lg border border-outline-variant/30 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter loaded patients, MRN..."
              className="w-full pl-7 pr-6 py-1 rounded border border-outline-variant bg-surface-container-lowest text-on-surface text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1.5 text-secondary hover:text-on-surface cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded border border-outline-variant/40">
            {(['all', 'MRI', 'CT'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModalityFilter(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  modalityFilter === m
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {m === 'all' ? 'All Modalities' : m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded border border-outline-variant/40">
            {([
              { id: 'shift', label: 'Last 48h (Shift)' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Past 7d' },
            ] as const).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDatePreset(p.id);
                  fetchWorklist(p.id);
                }}
                disabled={loading}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-secondary-container text-on-secondary-container font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-secondary">
          Showing {filteredRecords.length} of {records.length}
        </Badge>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-1">
          <div>{errorMsg}</div>
          {errorMsg.toLowerCase().includes('another device') && (
            <div className="text-[11px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
              💡 <strong>HMIS Single-Device Limit:</strong> HMIS allows only one active session per account. Please click <em>Log out</em> in your web browser tab if you are signed in there, or wait ~5 minutes for the portal session to reset.
            </div>
          )}
        </div>
      )}

      {filteredRecords.length > 0 ? (
        <div className="divide-y divide-outline-variant/30 max-h-96 overflow-y-auto pr-1">
          {filteredRecords.map((rec, idx) => {
            const isPaid = (rec.billingStatus || '').toLowerCase().includes('paid');
            return (
              <div key={idx} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{rec.patientName || 'Unknown Patient'}</span>
                    {rec.mrn && (
                      <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                        MRN: {rec.mrn}
                      </Badge>
                    )}
                    {rec.accession && (
                      <Badge variant="outline" className="font-mono text-[10px] py-0 px-1 text-primary">
                        Acc: {rec.accession}
                      </Badge>
                    )}
                    <Badge variant={isPaid ? 'success' : 'warning'} className="text-[10px] py-0 px-1">
                      {rec.billingStatus || 'Standard'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>{rec.cpt || 'Radiology Examination'}</span>
                    {rec.room && <span>• {rec.room}</span>}
                    {rec.department && <span>• {rec.department}</span>}
                    {rec.orderDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" /> {rec.orderDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rec.accession && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onTrackAccession(rec.accession!)}
                    >
                      <Activity className="w-3 h-3 text-primary" /> Track
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => onStageStudy(rec)}
                  >
                    <FileText className="w-3 h-3" /> Stage for Result <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
          {loading ? (
            <p>Scraping active worklist from HMIS portal...</p>
          ) : (
            <>
              <p>No active proceeded patients match your filters.</p>
              <p className="text-[11px]">Click &quot;Refresh Worklist&quot; or adjust the filters to view patients.</p>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
