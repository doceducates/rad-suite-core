'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, FlaskConical, FileText, Calendar } from 'lucide-react';
import type { HmisPriorReport } from '@/services/hmis/hmis-models';

interface PatientHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  investigationId: string;
  patientMrn: string;
  patientName?: string;
}

export function HmisPatientHistoryDrawer({
  isOpen,
  onClose,
  investigationId,
  patientMrn,
  patientName,
}: PatientHistoryDrawerProps) {
  const [reports, setReports] = useState<HmisPriorReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Pathology' | 'Radiology'>('all');

  const loadHistory = async () => {
    if (!investigationId && !patientMrn) return;
    setLoading(true);
    try {
      const url = `/api/hmis/history?investigationId=${encodeURIComponent(investigationId)}&patientMrn=${encodeURIComponent(patientMrn)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setReports(data.data);
      }
    } catch (e) {
      console.error('Failed to load patient history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, investigationId, patientMrn]);

  if (!isOpen) return null;

  const filtered = reports.filter((r) =>
    filter === 'all' ? true : r.department.toLowerCase() === filter.toLowerCase()
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card border-l border-outline-variant/60 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">HMIS Prior Reports & Labs</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {patientName || 'Patient'} (MRN: {patientMrn || 'N/A'})
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={loadHistory} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 border-b border-outline-variant/30 flex gap-2">
        {(['all', 'Pathology', 'Radiology'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              filter === tab
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab === 'all' ? 'All Records' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Fetching prior records from HMIS...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground">
            No prior lab or pathology reports recorded for this patient.
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-outline-variant/50 bg-background/50 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <Badge variant={item.department === 'Pathology' ? 'warning' : 'info'}>
                  {item.department}
                </Badge>
                {item.date && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {item.date}
                  </span>
                )}
              </div>
              <p className="font-semibold text-foreground">{item.testName}</p>
              {item.resultSummary && (
                <div className="p-2 rounded bg-muted/40 font-mono text-[11px] text-foreground/90 whitespace-pre-wrap">
                  {item.resultSummary}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
