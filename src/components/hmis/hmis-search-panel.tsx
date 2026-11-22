'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Loader2,
  Calendar,
  FileText,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileDown,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface HmisSearchPanelProps {
  onSelectPatient: (patientData: {
    mrn: string;
    patientName: string;
    accession: string;
    investigationId?: string;
    cpt?: string;
    modality?: string;
    existingHistory?: string;
  }) => void;
  onTrackAccession?: (accession: string, mrn?: string) => void;
  onSessionCollision?: (message: string) => void;
  disabled?: boolean;
}

export function HmisSearchPanel({
  onSelectPatient,
  onTrackAccession,
  onSessionCollision,
  disabled = false,
}: HmisSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [releasingLock, setReleasingLock] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    setLoading(true);
    setErrorMsg(null);
    setSearchResult(null);

    const isAccession = query.length === 12 && /^\d+$/.test(query);
    const paramKey = isAccession ? 'accession' : 'mrn';

    try {
      const res = await fetch(`/api/hmis/search?${paramKey}=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = data.error || 'No records found in HMIS.';
        setErrorMsg(err);
        if (/already logged in|another device|session_collision/i.test(err)) {
          onSessionCollision?.(err);
        }
      } else {
        setSearchResult(data.data);
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRelease = async () => {
    setReleasingLock(true);
    try {
      const res = await fetch('/api/hmis/force-release', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setErrorMsg(null);
        setTimeout(() => handleSearch(), 1000);
      } else {
        setErrorMsg(data.error || 'Failed to release remote session lock.');
      }
    } catch (err: any) {
      setErrorMsg(`Release error: ${err.message}`);
    } finally {
      setReleasingLock(false);
    }
  };

  const inferredRange = searchResult?.inferredRange || searchResult?.inferredDateRange;
  const isCollision = errorMsg && /already logged in|another device|session_collision/i.test(errorMsg);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-foreground">Intelligent HMIS Patient & Accession Search</span>
        </div>
        <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
          <Calendar className="w-3 h-3 text-primary" /> 3-Tier Cascade & Auto-Date Inference
        </Badge>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter Accession # (e.g. 192608000987) or MRN..."
          disabled={disabled || loading}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-outline-variant bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || loading || !searchTerm.trim()}
          className="h-9 px-4 text-xs gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Search HMIS
        </Button>
      </form>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-2">
          <div>{errorMsg}</div>
          {isCollision && (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>HMIS account is logged into another device. Clear lock to proceed.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceRelease}
                disabled={releasingLock}
                className="h-6 text-[10px] px-2 gap-1 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shrink-0"
              >
                {releasingLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Release Lock
              </Button>
            </div>
          )}
        </div>
      )}

      {searchResult && (
        <div className="space-y-3 pt-1">
          {inferredRange && (
            <div className="text-[11px] text-primary flex items-center gap-1.5 bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Auto-detected 30-day window: <strong>{inferredRange.startDate}</strong> to <strong>{inferredRange.endDate}</strong> ({searchResult.source || 'HMIS'})</span>
            </div>
          )}

          {(() => {
            const validRecords = (searchResult.records || []).filter(
              (rec: any) => (rec.patientName && rec.patientName.trim().length > 0 && rec.patientName.toLowerCase() !== 'patient') || rec.mrn || rec.accession
            );

            if (validRecords.length === 0) {
              return (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No matching investigations found in HMIS database.
                </div>
              );
            }

            return (
              <div className="divide-y divide-outline-variant/30 max-h-60 overflow-y-auto pr-1">
                {validRecords.map((rec: any, idx: number) => {
                  const primaryInv = rec.investigations?.[0];
                  const patName = rec.patientName || rec.name || 'Patient';
                  const patMrn = rec.mrn || rec.patientMrn || '';
                  const patAcc = rec.accession || primaryInv?.accession || searchTerm;
                  const cpt = rec.studyTitle || rec.cpt || primaryInv?.studyTitle || rec.testName || 'Radiology Examination';
                  const modality = rec.modality || (cpt.toUpperCase().includes('MRI') ? 'MRI' : 'CT');
                  const invId = rec.investigationId || primaryInv?.patientInvestigationId || rec.id;
                  const isPublished = rec.status === 'PUBLISHED' || searchResult.source === 'PUBLISHED_REPORTS';

                  return (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-foreground truncate flex items-center gap-1.5 flex-wrap">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{patName}</span>
                          {patMrn && <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">MRN: {patMrn}</Badge>}
                          <Badge variant="outline" className="text-[10px] py-0 px-1 text-primary border-primary/30 font-medium">{modality}</Badge>
                          {isPublished && <Badge variant="success" className="text-[10px] py-0 px-1">PUBLISHED</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          <span className="font-medium text-foreground/90">{cpt}</span> {patAcc && `• Acc: ${patAcc}`}
                          {rec.publishedDate && ` • ${rec.publishedDate}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onTrackAccession && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => onTrackAccession(patAcc, patMrn)}
                            title="Track Milestones"
                          >
                            <Activity className="w-3 h-3 text-primary" /> Track
                          </Button>
                        )}
                        {rec.pdfEncodedId && (
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => window.open(`/api/hmis/published/pdf/${encodeURIComponent(rec.pdfEncodedId)}`, '_blank')}
                          >
                            <FileDown className="w-3 h-3" /> PDF
                          </Button>
                        )}
                        {!isPublished && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() =>
                              onSelectPatient({
                                mrn: patMrn,
                                patientName: patName,
                                accession: patAcc,
                                investigationId: invId,
                                cpt,
                                modality,
                                existingHistory: rec.clinicalHistory,
                              })
                            }
                          >
                            Stage <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}
