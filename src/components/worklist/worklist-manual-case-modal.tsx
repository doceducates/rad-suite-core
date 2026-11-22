'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, User, FileText, ArrowRight, CheckCircle2, ShieldAlert, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { ManualCasePresets, PresetExam } from './manual-case-presets';
import { MandatoryCaseIdentifiers } from './mandatory-case-identifiers';
import { CaseStudyFields } from './case-study-fields';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistManualCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated?: (newCase: PacsStudyResult, openInModal?: boolean) => void;
}

export function WorklistManualCaseModal({ isOpen, onClose, onCaseCreated }: WorklistManualCaseModalProps) {
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [age, setAge] = useState<number>(45);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [modality, setModality] = useState('CT');
  const [studyDescription, setStudyDescription] = useState('CT Brain Plain');
  const [bodyPart, setBodyPart] = useState('Brain');
  const [department, setDepartment] = useState<'ER' | 'OPD' | 'Ward' | ''>('ER');
  const [room, setRoom] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [referringDoctor, setReferringDoctor] = useState('');
  const [technologist, setTechnologist] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ accession: string; message: string } | null>(null);

  if (!isOpen) return null;

  const handleGenerateMrn = () => {
    const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setPatientMrn(`MRN-${yymmdd}-${rand}`);
    setError(null);
    setDuplicateWarning(null);
  };

  const handleGenerateAccession = () => {
    const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setAccessionNumber(`MAN-${yymmdd}-${rand}`);
    setError(null);
  };

  const handleAgeChange = (val: number) => {
    setAge(val);
    if (val >= 0) {
      const year = new Date().getFullYear() - val;
      setDob(`${year}-01-01`);
    }
  };

  const handleSelectPreset = (p: PresetExam) => {
    setModality(p.modality);
    setStudyDescription(p.desc);
    setBodyPart(p.part);
    setDuplicateWarning(null);
  };

  const handleSubmit = async (openMode: 'workstation' | 'modal') => {
    if (!patientName.trim()) {
      setError('Patient Full Name is required.');
      return;
    }

    if (!patientMrn.trim() && !accessionNumber.trim()) {
      setError('At least one of MR Number or Accession Number is mandatory.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/worklist/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: phone.trim() || undefined,
          patientMrn: patientMrn.trim() || undefined,
          accessionNumber: accessionNumber.trim() || undefined,
          age,
          gender,
          dob: dob || undefined,
          modality,
          studyDescription: studyDescription.trim() || 'Radiological Examination',
          bodyPart: bodyPart.trim() || undefined,
          department: department || undefined,
          room: room.trim() || undefined,
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          clinicalHistory: clinicalHistory.trim() || undefined,
          referringDoctor: referringDoctor.trim() || undefined,
          technologist: technologist.trim() || undefined,
          allowDuplicate,
        }),
      });

      const data = await res.json();
      if (res.status === 409 || data.isDuplicate) {
        setDuplicateWarning({
          accession: data.existingStudy?.accessionNumber || '',
          message: data.error || 'Duplicate study already registered for this patient today.',
        });
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed creating manual study');
      }

      const createdStudy: PacsStudyResult = data.study;
      notify.success(`Manual case ${createdStudy.accessionNumber} created successfully`);
      onClose();

      if (onCaseCreated) {
        onCaseCreated(createdStudy, openMode === 'modal');
      } else {
        if (openMode === 'workstation') {
          router.push(`/workspace/${encodeURIComponent(createdStudy.accessionNumber)}`);
        } else {
          router.push(`/worklist?reportModal=${encodeURIComponent(createdStudy.accessionNumber)}`);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error creating manual case';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-outline-variant/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-outline-variant/60 bg-surface-container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-on-surface">New Patient Manual Entry</h2>
              <p className="text-[11px] text-secondary">Compliant with departmental worklist (PACS / HMIS / Walk-in)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-high cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Existing Case Detected</span>
              </div>
              <p>{duplicateWarning.message}</p>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {duplicateWarning.accession && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/workstation/${encodeURIComponent(duplicateWarning.accession)}`);
                    }}
                    className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    Open Existing Case ({duplicateWarning.accession}) ↗
                  </button>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[11px]">
                  <input
                    type="checkbox"
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                    className="rounded border-amber-500 text-amber-600 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Create duplicate study anyway</span>
                </label>
              </div>
            </div>
          )}

          <ManualCasePresets currentDesc={studyDescription} onSelect={handleSelectPreset} />

          {/* Demographics & Mandatory Identifiers */}
          <div className="space-y-3 pt-1 border-t border-outline-variant/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
                  <User className="w-3 h-3 text-primary" /> Patient Full Name *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Muhammad Tariq"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Mobile / Contact
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-secondary">Age (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={130}
                  value={age}
                  onChange={(e) => handleAgeChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-secondary">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <MandatoryCaseIdentifiers
              mrn={patientMrn}
              accessionNumber={accessionNumber}
              onMrnChange={setPatientMrn}
              onAccessionChange={setAccessionNumber}
              onGenerateMrn={handleGenerateMrn}
              onGenerateAccession={handleGenerateAccession}
            />

            <CaseStudyFields
              modality={modality}
              setModality={setModality}
              bodyPart={bodyPart}
              setBodyPart={setBodyPart}
              department={department}
              setDepartment={setDepartment}
              priority={priority}
              setPriority={setPriority}
              studyDescription={studyDescription}
              setStudyDescription={setStudyDescription}
              referringDoctor={referringDoctor}
              setReferringDoctor={setReferringDoctor}
              technologist={technologist}
              setTechnologist={setTechnologist}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              clinicalHistory={clinicalHistory}
              setClinicalHistory={setClinicalHistory}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/60 bg-surface-container flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting} className="text-secondary hover:text-on-surface">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmit('modal')}
              className="gap-1 border-outline-variant/80 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Write Report Here</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => handleSubmit('workstation')}
              className="gap-1 bg-primary text-on-primary font-bold shadow-xs hover:opacity-95 cursor-pointer"
            >
              <span>Open in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
