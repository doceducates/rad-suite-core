'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Edit3, Check, ShieldAlert, Loader2, Phone, GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MandatoryCaseIdentifiers } from './mandatory-case-identifiers';
import { CaseStudyFields } from './case-study-fields';
import { ConflictMergeBanner, type ConflictInfo } from './conflict-merge-banner';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistEditPatientModalProps {
  isOpen: boolean;
  study: PacsStudyResult | null;
  onClose: () => void;
  onPatientUpdated: (updatedStudy: PacsStudyResult) => void;
}

export function WorklistEditPatientModal({
  isOpen,
  study,
  onClose,
  onPatientUpdated,
}: WorklistEditPatientModalProps) {
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [patientMrn, setPatientMrn] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [age, setAge] = useState<number>(40);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [modality, setModality] = useState('CT');
  const [studyDescription, setStudyDescription] = useState('');
  const [bodyPart, setBodyPart] = useState('Brain');
  const [department, setDepartment] = useState<'ER' | 'OPD' | 'Ward' | ''>('');
  const [room, setRoom] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [scheduledAt, setScheduledAt] = useState('');
  const [referringDoctor, setReferringDoctor] = useState('');
  const [technologist, setTechnologist] = useState('');
  const [clinicalHistory, setClinicalHistory] = useState('');

  const [saving, setSaving] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    if (!study) return;
    setPatientName(study.patientName || '');
    setPhone(study.patientPhone || (study as any).phone || '');
    const currentMrn = study.patientMrn || study.patientId || '';
    setPatientMrn(currentMrn);
    setAccessionNumber(study.accessionNumber || '');
    setAge(study.age ?? 40);
    setGender((study.gender as any) || 'Male');
    setDob(study.dateOfBirth || '');
    setModality(study.modality || 'CT');
    setStudyDescription(study.studyDescription || '');
    setBodyPart((study as any).bodyPart || 'Brain');
    setDepartment((study.department as any) || '');
    setRoom(study.room || '');
    setPriority((study.priority as any) || 'routine');
    setReferringDoctor(study.referringDoctor || '');
    setTechnologist(study.technologist || '');
    setClinicalHistory((study as any).clinicalHistory || '');
    const sDate = study.studyDate;
    setScheduledAt(sDate && !isNaN(new Date(sDate).getTime()) ? new Date(sDate).toISOString().slice(0, 16) : '');
    setError(null);
    setConflictInfo(null);

    // Discover other studies for this patient to allow instant 1-click report shift
    if (isOpen && currentMrn.trim()) {
      fetch(`/api/worklist/merge-manual?mrn=${encodeURIComponent(currentMrn.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.candidates)) {
            setCandidates(
              d.candidates.filter(
                (c: any) => c.accessionNumber.toUpperCase() !== (study.accessionNumber || '').toUpperCase()
              )
            );
          }
        })
        .catch(() => {});
    } else {
      setCandidates([]);
    }
  }, [study, isOpen]);

  if (!isOpen || !study) return null;

  const handleMergeIntoConflict = async (targetAccession: string) => {
    if (!study) return;
    setMerging(true);
    try {
      const res = await fetch('/api/worklist/merge-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAccession: study.accessionNumber,
          targetAccession,
          notes: 'Report shifted via Edit Patient conflict modal',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to shift report to target accession');
      }
      notify.success(`Report successfully shifted from ${study.accessionNumber} to ${targetAccession}!`);
      onClose();
      window.location.reload();
    } catch (err: any) {
      notify.error(err.message || 'Shift failed');
    } finally {
      setMerging(false);
    }
  };

  const handleAgeChange = (val: number) => {
    setAge(val);
    if (val >= 0) {
      const year = new Date().getFullYear() - val;
      setDob(`${year}-01-01`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('Patient Full Name is required.');
      return;
    }

    if (!patientMrn.trim() && !accessionNumber.trim()) {
      setError('At least one of MR Number or Accession Number is mandatory.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(study.accessionNumber)}/details`, {
        method: 'PATCH',
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
          studyDescription: studyDescription.trim() || undefined,
          bodyPart: bodyPart.trim() || undefined,
          department: department || undefined,
          room: room.trim() || undefined,
          priority,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          clinicalHistory: clinicalHistory.trim() || undefined,
          referringDoctor: referringDoctor.trim() || undefined,
          technologist: technologist.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 409 || data.isConflict) {
        setConflictInfo({
          accessionNumber: data.conflictStudy?.accessionNumber || accessionNumber.trim().toUpperCase(),
          patientName: data.conflictStudy?.patientName,
          patientMrn: data.conflictStudy?.patientMrn,
          scanType: data.conflictStudy?.scanType,
          message: data.error || 'A study already exists with these patient identifiers.',
        });
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed updating patient details');
      }

      onPatientUpdated(data.study);
      notify.success('Patient & study details updated successfully!');
      onClose();
    } catch (err: any) {
      const errMsg = err.message || 'Error updating patient details';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-outline-variant/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-outline-variant/60 bg-surface-container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-on-surface">Edit Patient & Study Details</h2>
              <p className="text-[11px] text-secondary">
                Case: <span className="font-mono text-primary font-semibold">{study.accessionNumber}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-high cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {conflictInfo && (
            <ConflictMergeBanner
              conflictInfo={conflictInfo}
              merging={merging}
              onMerge={handleMergeIntoConflict}
            />
          )}

          {/* Direct Case Identifiers: Single field for Accession & MRN even for multi-study orders */}
          <MandatoryCaseIdentifiers
            mrn={patientMrn}
            accessionNumber={accessionNumber}
            onMrnChange={setPatientMrn}
            onAccessionChange={setAccessionNumber}
            isMultiStudy={Boolean(study.isMultiStudy || candidates.length > 0 || (study.companionStudies && study.companionStudies.length > 0))}
            studiesCount={candidates.length + 1}
            candidateStudies={candidates}
          />

          {/* Demographics */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
                  <User className="w-3 h-3 text-primary" /> Patient Full Name *
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-secondary flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Mobile / Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="0300-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
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
            </div>

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

          {/* Footer inside form */}
          <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving} className="text-secondary hover:text-on-surface">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="gap-1.5 bg-primary text-on-primary font-bold shadow-xs hover:opacity-95 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
