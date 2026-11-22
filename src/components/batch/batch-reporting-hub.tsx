'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartDictationMic } from '@/components/editor/smart-dictation-mic';
import type { BatchReportItem } from '@/services/batch-reporting.service';
import {
  Layers,
  Copy,
  Check,
  Printer,
  Trash2,
  ArrowRight,
  Split,
} from 'lucide-react';
import Link from 'next/link';

export function BatchReportingHub() {
  const [continuousText, setContinuousText] = useState('');
  const [reports, setReports] = useState<BatchReportItem[]>([
    {
      id: 'demo-1',
      patientName: 'Zainab Bibi (Sample)',
      mrn: '192608002440',
      studyName: 'MRI Knee Joint Right',
      modality: 'MRI',
      findings: 'Cruciate and collateral ligaments are intact. Minimal joint effusion in suprapatellar bursa. Menisci show normal morphology.',
      impression: '1. Minimal right knee joint effusion without internal derangement or meniscal tear.',
      status: 'structured',
    },
  ]);
  const [splitting, setSplitting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const handleDictatedText = (text: string) => {
    setContinuousText((prev) => (prev ? prev + '\n' : '') + text);
  };

  const handleSplitBatch = async () => {
    if (!continuousText.trim()) return;
    setSplitting(true);
    try {
      const res = await fetch('/api/ai/batch-reporting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'split_multi_patient', text: continuousText }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports((prev) => [...data.reports, ...prev]);
        setContinuousText('');
      }
    } catch {
      // Fallback
    } finally {
      setSplitting(false);
    }
  };

  const copySingleReport = (report: BatchReportItem, idx: number) => {
    const text = `PATIENT: ${report.patientName} | MRN: ${report.mrn || 'N/A'}\nSTUDY: ${report.studyName} (${report.modality})\n\nFINDINGS:\n${report.findings}\n\nIMPRESSION:\n${report.impression}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllReports = () => {
    if (reports.length === 0) return;
    const combined = reports
      .map(
        (r, i) =>
          `[REPORT #${i + 1}]\nPATIENT: ${r.patientName} | MRN: ${r.mrn || 'N/A'}\nSTUDY: ${r.studyName} (${r.modality})\n\nFINDINGS:\n${r.findings}\n\nIMPRESSION:\n${r.impression}`
      )
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(combined);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const exportPrintHtml = async () => {
    if (reports.length === 0) return;
    try {
      const res = await fetch('/api/ai/batch-reporting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export_html', reports }),
      });
      const data = await res.json();
      if (data.success && data.html) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
        }
      }
    } catch {}
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto text-xs font-sans">
      {/* Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-headline flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>Rapid Scribe</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continuous multi-case voice dictation, auto-patient splitting, and consolidated export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={copyAllReports}
            disabled={reports.length === 0}
            className="gap-1.5 text-xs font-semibold"
          >
            {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{allCopied ? 'All Copied!' : `Copy All (${reports.length})`}</span>
          </Button>
          <Button
            size="sm"
            onClick={exportPrintHtml}
            disabled={reports.length === 0}
            className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Batch HTML</span>
          </Button>
        </div>
      </div>

      {/* Dictation Intake Stream Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-3.5 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <SmartDictationMic onTranscript={handleDictatedText} />
            <div>
              <CardTitle className="text-xs text-foreground">Continuous Multi-Patient Voice Stream</CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Dictate back-to-back: &ldquo;Patient 1: ... Next patient: ... Patient 3: ...&rdquo;
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSplitBatch}
            disabled={!continuousText.trim() || splitting}
            className="gap-1 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <Split className="w-3.5 h-3.5" />
            <span>{splitting ? 'Splitting...' : 'Split & Generate Reports'}</span>
          </Button>
        </CardHeader>
        <CardContent className="p-3">
          <textarea
            value={continuousText}
            onChange={(e) => setContinuousText(e.target.value)}
            placeholder="Dictate or paste multi-patient session text here... E.g. 'Patient 1: CT Brain plain. No hemorrhage. Impression: Normal brain. Next patient: CT Chest. Consolidation right base. Impression: Right lower lobe pneumonia.'"
            rows={3}
            className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </CardContent>
      </Card>

      {/* Reports Queue List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-foreground">
          <span>Active Rapid Scribe Reports ({reports.length})</span>
          {reports.length > 0 && (
            <button
              onClick={() => setReports([])}
              className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 font-normal cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Queue</span>
            </button>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-xs">
            No reports in queue. Speak or paste a continuous dictation above and click &ldquo;Split &amp; Generate Reports&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {reports.map((report, idx) => (
              <Card key={report.id} className="border-border bg-card shadow-sm">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={report.patientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReports((p) => p.map((r, i) => (i === idx ? { ...r, patientName: val } : r)));
                      }}
                      className="font-bold text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 text-foreground"
                    />
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {report.modality}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copySingleReport(report, idx)}
                      className="gap-1 text-xs px-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                    </Button>
                    <Link href={report.mrn ? `/workstation/${encodeURIComponent(report.mrn)}` : '/workstation'}>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs px-2 py-1 text-primary hover:text-primary">
                        <span>Workstation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <button
                      onClick={() => setReports((p) => p.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                      aria-label="Delete report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-muted-foreground block text-[10px] uppercase mb-1">Findings:</label>
                    <textarea
                      value={report.findings}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReports((p) => p.map((r, i) => (i === idx ? { ...r, findings: val } : r)));
                      }}
                      rows={3}
                      className="w-full p-2 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-muted-foreground block text-[10px] uppercase mb-1">Impression:</label>
                    <textarea
                      value={report.impression}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReports((p) => p.map((r, i) => (i === idx ? { ...r, impression: val } : r)));
                      }}
                      rows={3}
                      className="w-full p-2 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
