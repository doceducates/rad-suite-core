'use client';

import { useState, useEffect } from 'react';
import { X, Printer, Copy, Check, FileText, UserCheck, Stethoscope, Send, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsultantPicker } from '@/components/ui/consultant-picker';
import { LghReportSheet } from './lgh-report-sheet';
import { htmlToClinicalText } from '@/lib/clinical-format';
import { cleanDoctorName, resolveDoctorDesignation } from '@/lib/consultants';
import { downloadReportFile } from '@/services/report-download.service';
import { printReportSheet } from '@/services/report-print.service';

interface LghReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  study: any;
  patient: any;
  report: any;
  pgrName: string;
  onPgrNameChange: (name: string) => void;
  consultantName: string;
  onConsultantNameChange: (name: string) => void;
  onSendToHmis?: () => void;
  sendingHmis?: boolean;
}

export function LghReportModal({
  isOpen,
  onClose,
  study,
  patient,
  report,
  pgrName,
  onPgrNameChange,
  consultantName,
  onConsultantNameChange,
  onSendToHmis,
  sendingHmis = false,
}: LghReportModalProps) {
  const [activeReport, setActiveReport] = useState(report);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Editable Attribution State for manual reports and verified stationery
  const [localPgrName, setLocalPgrName] = useState(cleanDoctorName(pgrName));
  const [localPgrDesignation, setLocalPgrDesignation] = useState(
    resolveDoctorDesignation(pgrName, 'pgr')
  );
  const [localConsultantName, setLocalConsultantName] = useState(cleanDoctorName(consultantName));
  const [localConsultantDesignation, setLocalConsultantDesignation] = useState(
    consultantName ? resolveDoctorDesignation(consultantName, 'consultant') : ''
  );

  useEffect(() => {
    setLocalPgrName(cleanDoctorName(pgrName));
    setLocalPgrDesignation(resolveDoctorDesignation(pgrName, 'pgr'));
  }, [pgrName]);

  useEffect(() => {
    const cleaned = cleanDoctorName(consultantName);
    setLocalConsultantName(cleaned);
    if (cleaned) {
      setLocalConsultantDesignation(resolveDoctorDesignation(consultantName, 'consultant'));
    }
  }, [consultantName]);

  useEffect(() => {
    setActiveReport(report);
    const identifier = study?.studyId || study?.accessionNumber || report?.studyId || report?.id;
    if (isOpen && !report?.findings && identifier) {
      fetch(`/api/reports?studyId=${encodeURIComponent(identifier)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.report) setActiveReport(data.report);
        })
        .catch(() => {});
    }
  }, [report, study, isOpen]);

  const handlePrint = () => {
    printReportSheet('lgh-report-sheet');
  };

  // Keyboard shortcut Ctrl+P while modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleConsultantChange = (name: string, designation?: string) => {
    const cleaned = cleanDoctorName(name);
    setLocalConsultantName(cleaned);
    onConsultantNameChange(cleaned);
    const desig = designation || (cleaned ? resolveDoctorDesignation(name, 'consultant') : '');
    setLocalConsultantDesignation(desig);
  };

  if (!isOpen) return null;

  const handleExport = async (format: 'pdf' | 'docx') => {
    setIsExporting(true);
    try {
      await downloadReportFile({
        format,
        reportId: activeReport?.id,
        studyId: study?.id,
        accessionNumber: study?.accessionNumber,
        patientName: patient?.fullName || 'Patient',
        patientMrn: patient?.mrNumber,
        patientAge: patient?.age,
        patientGender: patient?.gender,
        modality: study?.modality || 'CT',
        studyDescription: study?.procedureName || study?.studyDescription,
        clinicalHistory: activeReport?.clinicalHistory || patient?.clinicalHistory,
        technique: activeReport?.technique,
        comparison: activeReport?.comparison,
        findings: activeReport?.findings,
        impression: activeReport?.impression,
        pgrName: localPgrName,
        pgrDesignation: localPgrDesignation,
        consultantName: localConsultantName,
        consultantDesignation: localConsultantDesignation,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyHmis = () => {
    const findingsText = htmlToClinicalText(activeReport?.findings);
    const impressionText = htmlToClinicalText(activeReport?.impression);
    const hospitalHeader = process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'DEPARTMENT OF RADIOLOGY';
    const fullText = `${hospitalHeader}\n` +
      `MRN: ${patient.mrNumber || ''} | Patient: ${patient.fullName}\n` +
      `Study: ${study.procedureName || study.studyDescription || ''}\n\n` +
      `TECHNIQUE:\n${activeReport?.technique || ''}\n\n` +
      `FINDINGS:\n${findingsText}\n\n` +
      `IMPRESSION:\n${impressionText}\n\n` +
      `${localPgrName || 'Resident Radiologist'}${localPgrDesignation ? ` (${localPgrDesignation})` : ''}\n` +
      `Verified By: ${localConsultantName ? `${localConsultantName} (${localConsultantDesignation || 'Consultant Radiologist'})` : '[Pending Consultant Verification]'}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:block print:w-full print:max-w-none">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Official Hospital Report View
              </h3>
              <p className="text-[11px] text-zinc-500">Official Clinical Report Stationery</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* PGR Name Input */}
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700" title="Attribution: Reporting Resident Name">
              <UserCheck className="w-3 h-3 text-primary" />
              <input
                type="text"
                value={localPgrName}
                onChange={(e) => {
                  setLocalPgrName(e.target.value);
                  onPgrNameChange(e.target.value);
                }}
                placeholder="Reporting Resident / PGR"
                className="bg-transparent text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none w-28 sm:w-36"
              />
            </div>

            {/* Supervising Consultant Picker */}
            <div className="w-44 sm:w-56" title="Attribution: Supervising Consultant Radiologist">
              <ConsultantPicker
                value={localConsultantName}
                onChange={handleConsultantChange}
                placeholder="Supervising Consultant..."
                compact
              />
            </div>

            <Button size="sm" variant="secondary" onClick={handleCopyHmis} className="gap-1 text-xs">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy HMIS Text'}</span>
            </Button>
            {onSendToHmis && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onSendToHmis}
                isLoading={sendingHmis}
                className="gap-1 text-xs text-primary hover:bg-primary/10 border border-primary/30"
                title="Dispatch verified report to HMIS Punjab Chrome extension"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to HMIS</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold"
              title="Download publication-grade vector PDF report"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleExport('docx')}
              disabled={isExporting}
              className="gap-1 text-xs text-sky-600 dark:text-sky-400 font-semibold"
              title="Download Microsoft Word (.docx) document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>DOCX</span>
            </Button>
            <Button size="sm" variant="primary" onClick={handlePrint} className="gap-1 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-950/70 print:p-0 print:bg-white print:overflow-visible print:block">
          <LghReportSheet
            study={study}
            patient={patient}
            report={activeReport}
            pgrName={localPgrName}
            pgrDesignation={localPgrDesignation}
            consultantName={localConsultantName}
            consultantDesignation={localConsultantDesignation}
            editableAttribution={true}
            onPgrNameChange={(val) => {
              setLocalPgrName(val);
              onPgrNameChange(val);
            }}
            onPgrDesignationChange={setLocalPgrDesignation}
            onConsultantNameChange={(val) => {
              setLocalConsultantName(val);
              onConsultantNameChange(val);
            }}
            onConsultantDesignationChange={setLocalConsultantDesignation}
          />
        </div>
      </div>
    </div>
  );
}
