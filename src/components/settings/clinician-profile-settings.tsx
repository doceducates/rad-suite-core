'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Save, Loader2, CheckCircle2, User, Award, Building, Stethoscope, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClinicianProfileSettingsProps {
  initialName?: string;
  initialLicenseNo?: string;
  initialTitle?: string;
  initialDepartment?: string;
  role?: string;
  avatarColor?: string;
  onProfileUpdated?: (user: any) => void;
}

const DESIGNATION_PRESETS = [
  'PGR',
  'Resident Radiologist (PGR)',
  'Consultant Radiologist',
  'Fellow in Cross-Sectional Imaging',
  'Senior Registrar (SR)',
];

export function ClinicianProfileSettings({
  initialName = '',
  initialLicenseNo = '',
  initialTitle = 'PGR',
  initialDepartment = 'Radiology',
  role = 'radiologist',
  avatarColor = '#4a7c59',
  onProfileUpdated,
}: ClinicianProfileSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [licenseNo, setLicenseNo] = useState(initialLicenseNo);
  const [title, setTitle] = useState(initialTitle);
  const [department, setDepartment] = useState(initialDepartment);
  const [userRole, setUserRole] = useState(role);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep form in sync when parent user data updates
  useEffect(() => {
    if (initialName !== undefined) setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (initialLicenseNo !== undefined) setLicenseNo(initialLicenseNo);
  }, [initialLicenseNo]);

  useEffect(() => {
    if (initialTitle !== undefined) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (initialDepartment !== undefined) setDepartment(initialDepartment);
  }, [initialDepartment]);

  useEffect(() => {
    if (role !== undefined) setUserRole(role);
  }, [role]);

  const isStudent = userRole === 'student';
  const designationPresets = isStudent
    ? [
        'Medical Student',
        'Anatomy Learner',
        'Surgical Resident',
        'Radiology Resident',
        'Postgraduate Researcher',
      ]
    : DESIGNATION_PRESETS;

  const initials = name
    ? name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          licenseNo: licenseNo.trim(),
          title: title.trim(),
          department: department.trim(),
          role: userRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSuccess(true);
        if (onProfileUpdated && data.data) {
          onProfileUpdated(data.data);
        }
        router.refresh();
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setErrorMsg(data.error || 'Failed updating profile.');
      }
    } catch (err: any) {
      setErrorMsg(`Network error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="text-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />{' '}
            {isStudent ? 'Student Profile & Academic Credentials' : 'Clinician Profile & Verified Credentials'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </span>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {isStudent ? 'Role: Student Learner' : `Role: ${userRole}`}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
            {isStudent
              ? 'Your student profile details are used for self-quiz progress tracking, study records, and academy certification.'
              : 'Your clinician name and PMDC license appear on all finalized diagnostic radiology reports, PACS audits, and collaborative peer reviews.'}
          </p>

          {userRole === 'admin' && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px]">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span>
                <strong>Administrator Clinical Mode:</strong> You maintain full system privileges. Setting your clinical designation (e.g. <em>Resident Radiologist</em>) ensures your reports, workstation rails, and HMIS notes are branded with your clinical identity.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" /> {isStudent ? 'Full Name' : 'Full Clinician Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isStudent ? 'e.g. Mudassir Ahmad' : 'e.g. Dr. Jane Doe'}
                required
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
              />
            </div>

            {/* Medical License */}
            <div className="space-y-1.5">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-zinc-400" /> {isStudent ? 'Student ID / Registration No' : 'PMDC / Medical Registration No'}
              </label>
              <input
                type="text"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder={isStudent ? 'e.g. STD-2026-01' : 'e.g. 12345-P'}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
              />
            </div>

            {/* Designation / Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-zinc-400" /> {isStudent ? 'Academic Level & Specialty' : 'Clinical Designation & Role'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isStudent ? 'e.g. Medical Student / Anatomy Learner' : 'e.g. Resident Radiologist (PGR)'}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
              />
              {/* Designation quick presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-zinc-400">Presets:</span>
                {designationPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTitle(preset)}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer',
                      title === preset
                        ? 'bg-primary/15 border-primary/40 text-primary font-semibold'
                        : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-zinc-400" /> Hospital Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Radiology & Imaging Sciences"
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <Badge variant="success" className="gap-1 text-[11px] py-1 px-2 text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clinician Profile Updated
                </Badge>
              )}
              {errorMsg && <span className="text-rose-500 text-xs">{errorMsg}</span>}
            </div>

            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
