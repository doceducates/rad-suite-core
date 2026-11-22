'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, CheckCircle2, AlertTriangle, Eye, X, FileText, Sparkles } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { formatPatientSummary } from '@/lib/clipboard';
import { formatFullClinicalReport, buildFindingsWithTechnique } from '@/lib/clinical-format';
import { HMIS_CT_MODULE_OPTIONS, HMIS_MRI_MODULE_OPTIONS, matchHmisModule } from '@/services/hmis/hmis-models';
import { HMIS_REPORT_TEMPLATES, getDefaultTemplateForModule } from './hmis-templates';

export interface ComposerStudyData {
  patientName: string;
  mrn: string;
  accession: string;
  investigationId?: string;
  cpt?: string;
  modality?: string;
  clinicalHistory?: string;
}

interface HmisResultComposerProps {
  stagedStudy?: ComposerStudyData | null;
  onClearStudy?: () => void;
  disabled?: boolean;
}

export function HmisResultComposer({ stagedStudy, onClearStudy, disabled = false }: HmisResultComposerProps) {
  const [mrn, setMrn] = useState(''); const [accession, setAccession] = useState('');
  const [patientName, setPatientName] = useState(''); const [investigationId, setInvestigationId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('803');
  const [technique, setTechnique] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('Referred for diagnostic evaluation.');
  const [findings, setFindings] = useState(''); const [impression, setImpression] = useState('');
  const [pgrName, setPgrName] = useState('Resident Radiologist (PGR)'); const [consultantName, setConsultantName] = useState('Consultant Radiologist');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [auditScreenshot, setAuditScreenshot] = useState<string | null>(null); const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  const applyTemplate = (modId: string) => {
    setSelectedModuleId(modId);
    const tmpl = getDefaultTemplateForModule(modId);
    setTechnique(tmpl.technique); setFindings(tmpl.findings); setImpression(tmpl.impression);
  };

  useEffect(() => {
    if (stagedStudy) {
      setMrn(stagedStudy.mrn || ''); setAccession(stagedStudy.accession || '');
      setPatientName(stagedStudy.patientName || ''); setInvestigationId(stagedStudy.investigationId || '');
      if (stagedStudy.clinicalHistory) setClinicalHistory(stagedStudy.clinicalHistory);
      const autoMod = matchHmisModule(stagedStudy.cpt || stagedStudy.clinicalHistory, stagedStudy.modality);
      const modId = autoMod ? autoMod.value : (stagedStudy.modality === 'MRI' ? '792' : '803');
      applyTemplate(modId);
    } else {
      applyTemplate('803');
    }
  }, [stagedStudy]);

  const findingsWithTechnique = React.useMemo(() => {
    return buildFindingsWithTechnique(findings, technique);
  }, [findings, technique]);

  const handleSaveDraft = async () => {
    if (!mrn) {
      setStatusMsg({ type: 'err', text: 'Patient MRN is required to save draft.' });
      return;
    }
    setSubmitting(true); setStatusMsg(null); setAuditScreenshot(null);
    try {
      const payload = {
        investigationId, patientMrn: mrn.trim(), patientName: patientName.trim(),
        accessionNumber: accession.trim(), moduleId: selectedModuleId,
        technique, findings, impression, clinicalHistory, pgrName, consultantName,
        action: 'save' as const,
      };
      const res = await fetch('/api/hmis/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMsg({ type: 'err', text: data.error || 'Failed to save draft in HMIS' });
      } else {
        const text = data.verified ? '✓ Saved & Verified in HMIS Portal' : (data.message || 'Draft saved in HMIS');
        setStatusMsg({ type: 'ok', text });
        if (data.auditScreenshot) setAuditScreenshot(data.auditScreenshot);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: `Connection error: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevert = async () => {
    if (!mrn && !accession) return;
    setSubmitting(true); setStatusMsg(null);
    try {
      const res = await fetch('/api/hmis/revert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mrn, accession }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMsg({ type: 'err', text: data.error || 'Failed to revert study' });
      } else {
        setStatusMsg({ type: 'ok', text: '✓ Reverted to blank state in HMIS' });
        setTechnique(''); setFindings(''); setImpression('');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: `Revert failed: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-bold text-xs text-foreground">Diagnostic Report Result Composer</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[10px] py-0.5">🔒 Safe Mode (Draft Only)</Badge>
          {stagedStudy && onClearStudy && (
            <Button size="sm" variant="ghost" onClick={onClearStudy} className="h-6 text-[10px] px-2 text-muted-foreground">Clear Staged</Button>
          )}
        </div>
      </div>

      {stagedStudy?.cpt && (
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-primary flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Advised Study:</span>
              <span className="font-bold text-foreground">{stagedStudy.cpt}</span>
              {stagedStudy.modality && <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary font-medium">{stagedStudy.modality}</Badge>}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Auto-Selected Procedure: <strong className="text-foreground">{[...HMIS_MRI_MODULE_OPTIONS, ...HMIS_CT_MODULE_OPTIONS].find(m => m.value === selectedModuleId)?.text || selectedModuleId}</strong>
              {accession && ` • Acc: ${accession}`}
            </div>
          </div>
          <Badge variant="success" className="text-[10px] py-0.5">Auto-Configured</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">Patient Name</label>
            {patientName && (
              <CopyButton
                text={() => formatPatientSummary({ patientName, mrn, accession, clinicalHistory })}
                size="xs"
                title="Copy full patient details"
              />
            )}
          </div>
          <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient Name" className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">MRN *</label>
            {mrn && <CopyButton text={mrn} size="xs" title="Copy MRN" />}
          </div>
          <input type="text" value={mrn} onChange={(e) => setMrn(e.target.value)} placeholder="e.g. 19202653175835" className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono font-medium" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">Accession #</label>
            {accession && <CopyButton text={accession} size="xs" title="Copy Accession" />}
          </div>
          <input type="text" value={accession} onChange={(e) => setAccession(e.target.value)} placeholder="e.g. 192610000839" className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium block mb-1">HMIS Procedure Module</label>
          <select value={selectedModuleId} onChange={(e) => applyTemplate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-medium">
            <optgroup label="MRI Procedures (38 Verified)">
              {HMIS_MRI_MODULE_OPTIONS.map((m) => (<option key={m.value} value={m.value}>[{m.value}] {m.text}</option>))}
            </optgroup>
            <optgroup label="CT Procedures (22 Verified)">
              {HMIS_CT_MODULE_OPTIONS.map((m) => (<option key={m.value} value={m.value}>[{m.value}] {m.text}</option>))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <label className="text-[11px] text-muted-foreground font-medium">Quick Normal Templates:</label>
          <div className="flex flex-wrap gap-1">
            {Object.entries(HMIS_REPORT_TEMPLATES).map(([modId, tmpl]) => (
              <Button key={modId} size="sm" type="button" variant={selectedModuleId === modId ? 'primary' : 'outline'} onClick={() => applyTemplate(modId)} className="h-6 text-[10px] px-2 py-0">{tmpl.name}</Button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">Clinical History</label>
            {clinicalHistory && <CopyButton text={clinicalHistory} size="xs" title="Copy Clinical History" />}
          </div>
          <textarea rows={2} value={clinicalHistory} onChange={(e) => setClinicalHistory(e.target.value)} placeholder="e.g. Low back pain with radiculopathy" className="w-full p-2.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">Technique</label>
            {technique && <CopyButton text={technique} size="xs" title="Copy Technique" />}
          </div>
          <textarea rows={2} value={technique} onChange={(e) => setTechnique(e.target.value)} className="w-full p-2.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">Diagnostic Findings</label>
            {findings && (
              <CopyButton
                text={findingsWithTechnique}
                richHtml
                size="xs"
                title="Copy Findings (with Technique) to Clipboard"
              />
            )}
          </div>
          <textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} className="w-full p-2.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-muted-foreground font-medium">Diagnostic Impression</label>
            {impression && <CopyButton text={impression} richHtml size="xs" title="Copy Impression" />}
          </div>
          <textarea rows={2} value={impression} onChange={(e) => setImpression(e.target.value)} className="w-full p-2.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[11px] text-muted-foreground font-medium block mb-1">Reported By (Resident / PGR)</label>
          <input type="text" value={pgrName} onChange={(e) => setPgrName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground font-medium block mb-1">Verified By (Consultant)</label>
          <input type="text" value={consultantName} onChange={(e) => setConsultantName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-background text-foreground text-xs" />
        </div>
      </div>

      <div className="pt-2 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className={`text-xs flex items-center gap-1.5 ${statusMsg.type === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {statusMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {statusMsg.text}
            </span>
          )}
          {auditScreenshot && (
            <Button size="sm" variant="outline" onClick={() => setShowScreenshotModal(true)} className="h-7 text-xs gap-1 border-primary/40 text-primary">
              <Eye className="w-3.5 h-3.5" /> View Portal Screenshot
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(findings || impression) && (
            <CopyButton
              text={() =>
                formatFullClinicalReport({
                  patientName: patientName || 'N/A',
                  patientMrn: mrn,
                  accessionNumber: accession,
                  modality: stagedStudy?.modality || 'CT',
                  studyDescription: stagedStudy?.cpt || 'Radiology Investigation',
                  clinicalHistory,
                  technique,
                  findings,
                  impression,
                  authorName: pgrName,
                  consultantName,
                })
              }
              variant="outline"
              size="sm"
              label="Copy Report"
              copiedLabel="Copied"
              title="Copy full report to clipboard"
              className="h-9 px-3 text-xs"
            />
          )}
          {mrn && (
            <Button size="sm" type="button" variant="outline" onClick={handleRevert} disabled={submitting || disabled} className="h-9 px-3 text-xs border-outline-variant hover:bg-destructive/10 hover:text-destructive">
              Revert to Blank
            </Button>
          )}
          <Button onClick={handleSaveDraft} disabled={submitting || disabled || !mrn} className="h-9 px-5 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save HMIS Draft (Safe)
          </Button>
        </div>
      </div>

      {showScreenshotModal && auditScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card border border-outline-variant rounded-xl max-w-4xl w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
              <span className="font-bold text-xs text-foreground">HMIS Portal Verification Screenshot</span>
              <Button size="sm" variant="ghost" onClick={() => setShowScreenshotModal(false)} className="h-7 w-7 p-0"><X className="w-4 h-4" /></Button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-lg border border-outline-variant/30 bg-black/40 p-1 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/hmis/screenshot/${encodeURIComponent(auditScreenshot)}`} alt="HMIS Draft Modal Capture" className="rounded shadow-md max-w-full h-auto" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
