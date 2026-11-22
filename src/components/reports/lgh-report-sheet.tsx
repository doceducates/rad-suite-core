'use client';

// Layer 4 (Presentation): Official LGH / PGMI Radiology Reporting Stationery
// Institutional Standard: Post Graduate Medical Institute / Lahore General Hospital
// File Size Invariant: Target < 250 lines

import React from 'react';
import Image from 'next/image';
import { htmlToClinicalText, cleanClinicalHistory, splitTechniqueAndFindings } from '@/lib/clinical-format';
import { FACULTY_CONSULTANTS } from '@/lib/consultants';
import { renderStructuredClinicalFindings, renderStructuredImpression } from './lgh-report-renderers';
import { LghReportSignoff } from './lgh-report-signoff';

interface LghReportSheetProps {
  study: any;
  patient: any;
  report: any;
  pgrName?: string;
  pgrDesignation?: string;
  consultantName?: string;
  consultantDesignation?: string;
  editableAttribution?: boolean;
  onPgrNameChange?: (val: string) => void;
  onPgrDesignationChange?: (val: string) => void;
  onConsultantNameChange?: (val: string) => void;
  onConsultantDesignationChange?: (val: string) => void;
  className?: string;
}

export function LghReportSheet({
  study,
  patient,
  report,
  pgrName = 'Resident Radiologist',
  pgrDesignation,
  consultantName = '',
  consultantDesignation,
  editableAttribution = false,
  onPgrNameChange,
  onPgrDesignationChange,
  onConsultantNameChange,
  onConsultantDesignationChange,
  className = '',
}: LghReportSheetProps) {
  const scanDateFormatted = study?.studyDate
    ? new Date(study.studyDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const scanTimeFormatted = study?.studyTime || new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const fullDateTime = `${scanDateFormatted} ${scanTimeFormatted}`;
  const examTitle = (study?.procedureName || study?.studyDescription || `${study?.modality || 'CT'} SCAN`).toUpperCase();

  const rawFindings = report?.findings || '';
  const rawTechnique = report?.technique || '';
  const { technique: techniqueText, findings: cleanFindings } = splitTechniqueAndFindings(rawFindings, rawTechnique);
  const historyText = cleanClinicalHistory(report?.clinicalHistory || patient?.clinicalHistory || study?.clinicalHistory || '');
  const comparisonText = cleanClinicalHistory(report?.comparison || '');
  const impressionRaw = report?.impression || 'No acute pathology identified.';

  // 18 faculty members divided into 6 columns of 3
  const columns = [
    FACULTY_CONSULTANTS.slice(0, 3),
    FACULTY_CONSULTANTS.slice(3, 6),
    FACULTY_CONSULTANTS.slice(6, 9),
    FACULTY_CONSULTANTS.slice(9, 12),
    FACULTY_CONSULTANTS.slice(12, 15),
    FACULTY_CONSULTANTS.slice(15, 18),
  ];


  return (
    <article
      id="lgh-report-sheet"
      className={`a4-stationery bg-white text-slate-900 mx-auto p-6 sm:p-8 max-w-[850px] shadow-lg print:shadow-none print:p-0 print:max-w-none print:w-full font-sans text-[13px] leading-relaxed flex flex-col justify-between min-h-[1050px] print:min-h-0 print:h-auto ${className}`}
    >
      <div>
        {/* ================================================================= */}
        {/* 1. INSTITUTIONAL MASTER HEADER WITH OFFICIAL LOGOS                */}
        {/* ================================================================= */}
        <header className="flex items-center justify-between pb-2 border-b-2 border-slate-900 gap-3">
          {/* Left Emblem: PGMI Logo */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center relative">
            <Image
              src="/PGMI.jpg"
              alt="PGMI Logo"
              width={80}
              height={80}
              className="object-contain max-h-full"
              priority
              unoptimized
            />
          </div>

          {/* Central Titles */}
          <div className="text-center flex-1 px-1 leading-tight">
            <h1 className="text-[14.5px] sm:text-[16px] font-bold tracking-tight text-black uppercase">
              {process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'POST GRADUATE MEDICAL INSTITUTE'}
            </h1>
            <h2 className="text-[14.5px] sm:text-[16px] font-bold tracking-tight text-black uppercase mt-0.5">
              {process.env.NEXT_PUBLIC_HOSPITAL_NAME || 'HOSPITAL RADIOLOGY DEPARTMENT'}
            </h2>
            <p className="text-[12.5px] sm:text-[13.5px] font-semibold text-slate-800 mt-0.5 italic">
              {process.env.NEXT_PUBLIC_COLLEGE_NAME || 'Clinical Imaging Centre'}
            </p>
            <div className="mt-1 inline-block border-t border-b border-black py-0.5 px-4">
              <p className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-black">
                DEPARTMENT OF DIAGNOSTIC &amp; INTERVENTIONAL RADIOLOGY
              </p>
            </div>
          </div>

          {/* Right Emblem: LGH Logo */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center relative">
            <Image
              src="/LGH.jpg"
              alt="LGH Logo"
              width={80}
              height={80}
              className="object-contain max-h-full"
              priority
              unoptimized
            />
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. STANDARDIZED CLINICAL DEMOGRAPHICS TABLE                       */}
        {/* ================================================================= */}
        <section className="mt-2.5">
          <table className="w-full border-collapse border border-slate-900 text-[12px] leading-tight">
            <tbody>
              <tr>
                <td className="w-[16%] border border-slate-800 px-2 py-1 font-bold bg-slate-100 text-slate-900">
                  Patient Name
                </td>
                <td className="w-[34%] border border-slate-800 px-2 py-1 font-bold text-slate-950 uppercase">
                  {patient?.fullName || 'Anonymous Patient'}
                </td>
                <td className="w-[16%] border border-slate-800 px-2 py-1 font-bold bg-slate-100 text-slate-900">
                  Age / Sex
                </td>
                <td className="w-[34%] border border-slate-800 px-2 py-1 font-semibold text-slate-900">
                  {patient?.age || 'N/A'} Y / {patient?.gender || 'N/A'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-bold bg-slate-100 text-slate-900">
                  MRN / Reg No.
                </td>
                <td className="border border-slate-800 px-2 py-1 font-mono font-bold text-blue-950">
                  {patient?.mrNumber || study?.patientMrn || study?.patientId || 'N/A'}
                </td>
                <td className="border border-slate-800 px-2 py-1 font-bold bg-slate-100 text-slate-900">
                  Department
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900 uppercase">
                  {study?.department || 'EMERGENCY / MEDICINE OPD'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-bold bg-slate-100 text-slate-900">
                  Examination
                </td>
                <td className="border border-slate-800 px-2 py-1 font-bold text-slate-950">
                  {examTitle}
                </td>
                <td className="border border-slate-800 px-2 py-1 font-bold bg-slate-100 text-slate-900">
                  Scan Date / Time
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900">
                  {fullDateTime}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Examination Title Banner */}
        <section className="text-center my-2">
          <h3 className="text-[14px] sm:text-[14.5px] font-bold tracking-wide uppercase text-slate-950">
            {examTitle}
          </h3>
        </section>

        {/* ================================================================= */}
        {/* 3. REPORT BODY (STANDARD LEGIBLE CLINICAL TYPOGRAPHY)              */}
        {/* ================================================================= */}
        <div className="space-y-3 text-[13px] leading-relaxed text-slate-900">
          {/* History */}
          {historyText && (
            <div>
              <h4 className="font-bold text-[14px] text-slate-950 mb-0.5 uppercase tracking-wide">
                Clinical Indication / History:
              </h4>
              <p className="text-slate-800 pl-0.5 leading-relaxed">{historyText}</p>
            </div>
          )}

          {/* Technique */}
          {techniqueText && (
            <div>
              <h4 className="font-bold text-[14px] text-slate-950 mb-0.5 uppercase tracking-wide">
                Technique &amp; Protocol:
              </h4>
              <p className="text-slate-800 pl-0.5 italic leading-relaxed">{techniqueText}</p>
            </div>
          )}

          {/* Comparison */}
          {comparisonText && (
            <div>
              <h4 className="font-bold text-[14px] text-slate-950 mb-0.5 uppercase tracking-wide">
                Comparison:
              </h4>
              <p className="text-slate-800 pl-0.5 leading-relaxed">{comparisonText}</p>
            </div>
          )}

          {/* Findings */}
          <div>
            <h4 className="font-bold text-[14px] text-slate-950 mb-0.5 uppercase tracking-wide">
              Findings:
            </h4>
            <div className="pl-0.5">
              {renderStructuredClinicalFindings(cleanFindings)}
            </div>
          </div>

          {/* Impression */}
          <div className="pt-1">
            <h4 className="font-bold text-[14.5px] text-slate-950 uppercase mb-0.5 tracking-wide">
              IMPRESSION:
            </h4>
            <div className="pl-0.5">
              {renderStructuredImpression(impressionRaw)}
            </div>
          </div>

          {/* Reporting Doctors Sign-off Block */}
          <LghReportSignoff
            pgrName={pgrName}
            pgrDesignation={pgrDesignation}
            consultantName={consultantName}
            consultantDesignation={consultantDesignation}
            editableAttribution={editableAttribution}
            onPgrNameChange={onPgrNameChange}
            onPgrDesignationChange={onPgrDesignationChange}
            onConsultantNameChange={onConsultantNameChange}
            onConsultantDesignationChange={onConsultantDesignationChange}
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. OFFICIAL 18-FACULTY CONSULTANTS FOOTER                         */}
      {/* ================================================================= */}
      <footer className="pt-2 border-t-2 border-slate-900 mt-4 page-break-avoid">
        <div className="grid grid-cols-6 gap-x-1.5 gap-y-1 text-center">
          {columns.map((col, colIdx) => (
            <div
              key={colIdx}
              className={`space-y-0.5 ${colIdx < 5 ? 'border-r border-slate-200 pr-1' : ''}`}
            >
              {col.map((doc, docIdx) => (
                <div
                  key={doc.id}
                  className={`leading-tight ${docIdx > 0 ? 'pt-0.5 border-t border-slate-100' : ''}`}
                >
                  <p className="font-bold text-[9px] text-slate-950 truncate">{doc.name}</p>
                  <p className="text-[7.5px] text-slate-600 font-medium truncate">{doc.qualifications}</p>
                  <p className={`text-[7.5px] truncate font-semibold ${doc.rank === 'hod' ? 'text-blue-950 font-bold' : 'text-slate-700'}`}>
                    {doc.designation}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legal Disclaimer Line */}
        <div className="mt-1 text-center text-[8px] text-slate-600 border-t border-slate-200 pt-0.5 flex items-center justify-between px-1">
          <span>Lahore General Hospital • Department of Diagnostic &amp; Interventional Radiology</span>
          <span className="font-bold text-slate-800 tracking-wider uppercase">NOT VALID FOR COURT OF LAW</span>
        </div>
      </footer>
    </article>
  );
}
