'use client';

// Layer 4 (Presentation): Reporting Doctors Sign-off Stationery Block
// Strict File Size Invariant: Target < 100 lines

import React from 'react';
import { cleanDoctorName, resolveDoctorDesignation } from '@/lib/consultants';

interface LghReportSignoffProps {
  pgrName?: string;
  pgrDesignation?: string;
  consultantName?: string;
  consultantDesignation?: string;
  editableAttribution?: boolean;
  onPgrNameChange?: (name: string) => void;
  onPgrDesignationChange?: (designation: string) => void;
  onConsultantNameChange?: (name: string) => void;
  onConsultantDesignationChange?: (designation: string) => void;
}

export function LghReportSignoff({
  pgrName,
  pgrDesignation,
  consultantName,
  consultantDesignation,
  editableAttribution = false,
  onPgrNameChange,
  onPgrDesignationChange,
  onConsultantNameChange,
  onConsultantDesignationChange,
}: LghReportSignoffProps) {
  const cleanConsultant = cleanDoctorName(consultantName);
  const cleanPgr = cleanDoctorName(pgrName);

  const displayPgrName = cleanPgr || 'Resident Radiologist';
  const displayPgrDesignation = pgrDesignation || resolveDoctorDesignation(cleanPgr, 'pgr');

  const displayConsultantName = cleanConsultant || (pgrName ? '' : 'Resident Radiologist');
  const displayConsultantDesignation =
    consultantDesignation ||
    (displayConsultantName ? resolveDoctorDesignation(cleanConsultant, 'consultant') : '');

  return (
    <div className="pt-3 flex justify-between items-end page-break-avoid gap-4">
      {pgrName && (
        <div className="text-left space-y-0.5 text-black leading-tight min-w-[200px]">
          {editableAttribution ? (
            <input
              type="text"
              value={displayPgrName}
              onChange={(e) => onPgrNameChange?.(e.target.value)}
              placeholder="Resident Radiologist"
              title="Click to edit reporting resident name"
              className="font-bold text-[13.5px] text-slate-950 text-left bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-primary focus:outline-none w-full print:border-none print:p-0 print:text-left"
            />
          ) : (
            <p className="font-bold text-[13.5px] text-slate-950">{displayPgrName}</p>
          )}

          {editableAttribution ? (
            <input
              type="text"
              value={displayPgrDesignation}
              onChange={(e) => onPgrDesignationChange?.(e.target.value)}
              placeholder="Resident Designation"
              title="Click to edit resident designation"
              className="font-semibold text-[11.5px] text-slate-800 text-left bg-transparent border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-primary focus:outline-none w-full print:border-none print:p-0 print:text-left"
            />
          ) : (
            <p className="font-semibold text-[11.5px] text-slate-800">{displayPgrDesignation}</p>
          )}
          <p className="text-[10.5px] text-slate-600">Department of Diagnostic &amp; Interventional Radiology</p>
          <p className="text-[10px] text-slate-500">{process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'Clinical Radiology Centre'}</p>
        </div>
      )}

      <div className="text-right space-y-0.5 text-black leading-tight ml-auto min-w-[200px]">
        {editableAttribution ? (
          <input
            type="text"
            value={displayConsultantName}
            onChange={(e) => onConsultantNameChange?.(e.target.value)}
            placeholder="Consultant Radiologist"
            title="Click to edit signing doctor name"
            className="font-bold text-[13.5px] text-slate-950 text-right bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-primary focus:outline-none w-full print:border-none print:p-0 print:text-right"
          />
        ) : (
          <p className="font-bold text-[13.5px] text-slate-950">{displayConsultantName}</p>
        )}

        {editableAttribution ? (
          <input
            type="text"
            value={displayConsultantDesignation}
            onChange={(e) => onConsultantDesignationChange?.(e.target.value)}
            placeholder="Official Designation"
            title="Click to edit doctor designation"
            className="font-semibold text-[11.5px] text-slate-800 text-right bg-transparent border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-primary focus:outline-none w-full print:border-none print:p-0 print:text-right"
          />
        ) : (
          <p className="font-semibold text-[11.5px] text-slate-800">{displayConsultantDesignation}</p>
        )}
        <p className="text-[10.5px] text-slate-600">Department of Diagnostic &amp; Interventional Radiology</p>
        <p className="text-[10px] text-slate-500">{process.env.NEXT_PUBLIC_INSTITUTION_NAME || 'Clinical Radiology Centre'}</p>
      </div>
    </div>
  );
}
