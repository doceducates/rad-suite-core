'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Clock, CheckCircle2, AlertCircle, Building, User, Activity } from 'lucide-react';

interface HmisTatPanelProps {
  defaultAccession?: string;
  disabled?: boolean;
}

export function HmisTatPanel({ defaultAccession = '', disabled = false }: HmisTatPanelProps) {
  const [query, setQuery] = useState(defaultAccession);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tatData, setTatData] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    setLoading(true);
    setErrorMsg(null);
    setTatData(null);
    setSearched(true);

    const q = new URLSearchParams();
    if (clean.length >= 13) q.set('mrn', clean);
    else q.set('accession', clean);

    try {
      const res = await fetch(`/api/hmis/tat?${q.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || 'Failed to retrieve TAT data from HMIS.');
      } else {
        setTatData(json.data || null);
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const STAGE_KEYS = [
    { key: 'order', label: '1. Order Placed' },
    { key: 'receptions', label: '2. Reception' },
    { key: 'scheduled', label: '3. Scheduled' },
    { key: 'acknowledgment', label: '4. Tech Queue' },
    { key: 'radiographerAck', label: '5. Radiographer Ack' },
    { key: 'addResult', label: '6. Add Result' },
    { key: 'resultVerification', label: '7. Verification' },
    { key: 'publishedReports', label: '8. Published' },
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-on-surface">Radiology Turnaround Time (TAT) Analytics</span>
        </div>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
          /radiology/accession/tat
        </Badge>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Accession# (e.g. 192610008123) or MRN..."
          disabled={disabled || loading}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-outline-variant bg-background text-on-surface placeholder:text-secondary focus:ring-1 focus:ring-primary focus:outline-none font-mono"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || loading || !query.trim()}
          className="h-9 px-4 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Analyze TAT
        </Button>
      </form>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {searched && !loading && !tatData && !errorMsg && (
        <div className="text-center py-6 text-xs text-secondary">
          No turnaround timeline records found for &quot;{query}&quot;.
        </div>
      )}

      {tatData && (
        <div className="space-y-4 pt-1">
          {/* Header Metric Cards */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-surface-container border border-outline-variant/60 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-on-surface text-sm flex items-center gap-2">
                <span>{tatData.patientName}</span>
                <Badge variant="outline" className="text-[10px] font-mono py-0">
                  MRN: {tatData.mrn}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono py-0">
                  Acc: {tatData.accession}
                </Badge>
              </div>
              <div className="text-[11px] text-secondary flex items-center gap-3">
                <span className="font-medium text-on-surface">{tatData.cptName}</span>
                <span>• {tatData.room}</span>
                <span>• {tatData.location}</span>
              </div>
            </div>

            {tatData.totalTat && (
              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-right">
                <div className="text-[10px] uppercase font-bold text-primary tracking-wider">Total Turnaround</div>
                <div className="text-base font-bold text-on-surface font-mono">{tatData.totalTat}</div>
              </div>
            )}
          </div>

          {/* 8-Stage Chronological Audit Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {STAGE_KEYS.map(({ key, label }) => {
              const stage = tatData.stages?.[key];
              const hasData = stage && stage.time;

              return (
                <div
                  key={key}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                    hasData
                      ? 'bg-surface-container border-outline-variant/60'
                      : 'bg-surface-container-low/40 border-outline-variant/20 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-on-surface">{label}</span>
                    {hasData ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-secondary/60" />
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-on-surface font-medium">
                    {stage?.time || '—'}
                  </div>

                  {stage?.user && (
                    <div className="text-[10px] text-secondary flex items-center gap-1 line-clamp-1" title={stage.user}>
                      <User className="w-3 h-3 text-primary shrink-0" />
                      <span>{stage.user}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
