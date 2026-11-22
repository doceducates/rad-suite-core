'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileCheck,
  Search,
  Loader2,
  FileDown,
  Activity,
  Calendar,
  Building,
  User,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import type { HmisPublishedReport } from '@/services/hmis/hmis-models';

interface HmisPublishedPanelProps {
  onTrackAccession?: (accession: string, mrn?: string) => void;
  onSessionCollision?: (message: string) => void;
  disabled?: boolean;
  defaultQuery?: string;
  defaultType?: 'accession' | 'mrn' | 'cnic' | 'contact';
}

export function HmisPublishedPanel({
  onTrackAccession,
  onSessionCollision,
  disabled = false,
  defaultQuery = '',
  defaultType = 'accession',
}: HmisPublishedPanelProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [filterType, setFilterType] = useState<'accession' | 'mrn' | 'cnic' | 'contact'>(
    defaultQuery.length >= 13 ? 'mrn' : defaultType
  );
  const [loading, setLoading] = useState(false);
  const [releasingLock, setReleasingLock] = useState(false);
  const [reports, setReports] = useState<HmisPublishedReport[]>([]);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    setReports([]);
    setSearched(true);

    const q = new URLSearchParams();
    q.set(filterType, trimmed);

    try {
      const res = await fetch(`/api/hmis/published?${q.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = data.error || 'Failed to retrieve published reports from HMIS.';
        setErrorMsg(err);
        if (/already logged in|another device|session_collision/i.test(err)) {
          onSessionCollision?.(err);
        }
      } else {
        setReports(data.data?.records || []);
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

  const handleOpenPdf = (encodedId?: string | null) => {
    if (!encodedId) return;
    window.open(`/api/hmis/published/pdf/${encodeURIComponent(encodedId)}`, '_blank');
  };

  const isCollision = errorMsg && /already logged in|another device|session_collision/i.test(errorMsg);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs text-foreground">HMIS Published Reports Archive</span>
        </div>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
          All-Time Historical Search
        </Badge>
      </div>

      <form onSubmit={handleSearch} className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-[11px] font-medium mr-1">Search by:</span>
          {(['accession', 'mrn', 'cnic', 'contact'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                filterType === type
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-surface-container-high/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {type === 'cnic' ? 'CNIC' : type === 'mrn' ? 'MRN' : type}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Enter ${filterType.toUpperCase()} (e.g. 192608000987)...`}
            disabled={disabled || loading}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-outline-variant bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
          />
          <Button
            type="submit"
            size="sm"
            disabled={disabled || loading || !query.trim()}
            className="h-9 px-4 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Find Reports
          </Button>
        </div>
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

      {searched && !loading && reports.length === 0 && !errorMsg && (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No published reports found matching {filterType.toUpperCase()} &quot;{query}&quot;.
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>Found {reports.length} published study</span>
          </div>

          <div className="divide-y divide-outline-variant/30 max-h-72 overflow-y-auto pr-1">
            {reports.map((report, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    <span>{report.patientName}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                      MRN: {report.mrn}
                    </Badge>
                    <Badge variant="success" className="text-[10px] py-0 px-1.5">
                      PUBLISHED
                    </Badge>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-foreground/90">{report.studyTitle || report.testType}</span>
                    <span className="font-mono">Acc: {report.accession}</span>
                    {report.publishedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {report.publishedDate}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
                    {report.doctor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-primary" /> Dr: {report.doctor}
                      </span>
                    )}
                    {report.clinic && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3" /> {report.clinic}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onTrackAccession && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => onTrackAccession(report.accession, report.mrn)}
                      title="Track full 9-stage lifecycle"
                    >
                      <Activity className="w-3 h-3 text-primary" /> Track
                    </Button>
                  )}

                  {report.pdfEncodedId && (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleOpenPdf(report.pdfEncodedId)}
                      title="View / Download official signed PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" /> PDF Report
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
