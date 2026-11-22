'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Save, Loader2, CheckCircle2, Search, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { HMIS_HOSPITALS, getHmisHospitalById } from '@/services/hmis/hmis-hospitals.data';

interface HmisProfileSettingsProps {
  initialHospitalId?: string;
  initialUsername?: string;
  initialHasPassword?: boolean;
  initialReportingDoctorName?: string;
  initialSupervisingConsultantName?: string;
  onProfileUpdated?: (user: any) => void;
}

export function HmisProfileSettings({
  initialHospitalId = '19',
  initialUsername = '',
  initialHasPassword = false,
  initialReportingDoctorName = '',
  initialSupervisingConsultantName = '',
  onProfileUpdated,
}: HmisProfileSettingsProps) {
  const router = useRouter();
  const [hospitalId, setHospitalId] = useState(initialHospitalId || '19');
  const [username, setUsername] = useState(initialUsername || '');
  const [reportingDoctorName, setReportingDoctorName] = useState(initialReportingDoctorName || '');
  const [consultantName, setConsultantName] = useState(() => {
    if (initialSupervisingConsultantName) return initialSupervisingConsultantName;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('radsuite_consultant_name') || '';
      return stored.includes('Sumaira') ? '' : stored;
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasStoredPassword, setHasStoredPassword] = useState(initialHasPassword);
  const [searchFilter, setSearchFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialHospitalId !== undefined) setHospitalId(initialHospitalId || '19');
  }, [initialHospitalId]);

  useEffect(() => {
    if (initialUsername !== undefined) setUsername(initialUsername || '');
  }, [initialUsername]);

  useEffect(() => {
    if (initialReportingDoctorName !== undefined) setReportingDoctorName(initialReportingDoctorName || '');
  }, [initialReportingDoctorName]);

  useEffect(() => {
    if (initialSupervisingConsultantName !== undefined) {
      setConsultantName(initialSupervisingConsultantName || '');
    }
  }, [initialSupervisingConsultantName]);

  useEffect(() => {
    if (initialHasPassword !== undefined) setHasStoredPassword(initialHasPassword);
  }, [initialHasPassword]);

  const currentHospital = getHmisHospitalById(hospitalId);

  const filteredHospitals = searchFilter.trim()
    ? HMIS_HOSPITALS.filter(
        (h) =>
          h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          h.id === searchFilter.trim()
      )
    : HMIS_HOSPITALS;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      if (!reportingDoctorName.trim()) {
        setErrorMsg('HMIS Reporting Doctor Signature is required.');
        setSaving(false);
        return;
      }
      const payload: Record<string, any> = {
        hmisHospitalId: hospitalId,
        hmisUsername: username.trim(),
        hmisReportingDoctorName: reportingDoctorName.trim(),
        supervisingConsultantName: consultantName.trim(),
      };
      if (password.trim().length > 0) {
        payload.hmisPassword = password.trim();
      }

      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSuccess(true);
        if (password.trim().length > 0) {
          setHasStoredPassword(true);
          setPassword('');
        }
        if (typeof window !== 'undefined') {
          if (consultantName.trim()) {
            localStorage.setItem('radsuite_consultant_name', consultantName.trim());
          } else {
            localStorage.removeItem('radsuite_consultant_name');
          }
          if (reportingDoctorName.trim()) {
            localStorage.setItem('radsuite_pgr_name', reportingDoctorName.trim());
          }
          window.dispatchEvent(
            new CustomEvent('radsuite:attribution-updated', {
              detail: { consultantName: consultantName.trim(), pgrName: reportingDoctorName.trim() },
            })
          );
        }
        if (onProfileUpdated && data.data) {
          onProfileUpdated(data.data);
        }
        router.refresh();
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to save HMIS preferences.');
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
            <Building2 className="w-4 h-4 text-emerald-500" /> Punjab HMIS Hospital & Credentials
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              Target: hmis.punjab.gov.pk
            </Badge>
            <Badge
              variant="outline"
              className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 gap-1 border-emerald-500/30"
            >
              <Lock className="w-3 h-3 text-emerald-500" />
              {hasStoredPassword ? 'AES-256 Stored' : 'No Password'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
            Configure your assigned Punjab tertiary hospital and HMIS portal credentials. These are used strictly by
            Rad Suite’s automated gateway for single-device reporting sessions and are stored completely isolated from your workstation login.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hospital Selection with Search */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px]">
                Assigned Healthcare Facility ({HMIS_HOSPITALS.length} Punjab Facilities Available)
              </label>

              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter by facility name or city (e.g. Lahore, Faisalabad, Rawalpindi)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>

              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs"
              >
                {filteredHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    [{h.id}] {h.name}
                  </option>
                ))}
              </select>

              {currentHospital && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  Active Facility: #{currentHospital.id} • {currentHospital.name}
                </div>
              )}
            </div>

            {/* HMIS Reporting Doctor Signature */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center justify-between">
                <span>HMIS Reporting Doctor Signature (Mandatory)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Auto-appends to draft impression</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Resident Name (PGR)"
                value={reportingDoctorName}
                onChange={(e) => setReportingDoctorName(e.target.value)}
                required
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-medium"
              />
              <span className="text-[10px] text-zinc-400 block">
                Official reporting resident/fellow attribution appended to HMIS drafts.
              </span>
            </div>

            {/* Supervising Consultant Signature */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center justify-between">
                <span>Supervising Consultant Name (Rotation Supervisor)</span>
                <span className="text-[10px] text-primary font-normal">Rotation default</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Consultant Name (FCPS)"
                value={consultantName}
                onChange={(e) => {
                  const val = e.target.value;
                  setConsultantName(val);
                  if (typeof window !== 'undefined') {
                    if (val.trim()) {
                      localStorage.setItem('radsuite_consultant_name', val.trim());
                    } else {
                      localStorage.removeItem('radsuite_consultant_name');
                    }
                    window.dispatchEvent(
                      new CustomEvent('radsuite:attribution-updated', { detail: { consultantName: val } })
                    );
                  }
                }}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-medium"
              />
              <span className="text-[10px] text-zinc-400 block">
                Supervising faculty member for your current clinical rotation/class. Appears on verified reports and exports.
              </span>
            </div>

            {/* Portal Username */}
            <div className="space-y-1.5">
              <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px]">
                HMIS Radiologist Username
              </label>
              <input
                type="text"
                placeholder="e.g. dr_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
              />
              <span className="text-[10px] text-zinc-400 block">
                Official Punjab HMIS portal account name used for single-device locks.
              </span>
            </div>

            {/* Portal Password (Isolated & AES-256 Encrypted) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-zinc-800 dark:text-zinc-200 block text-[11px] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                  HMIS Portal Password
                </label>
                {hasStoredPassword && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    ✓ Password Configured
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={
                    hasStoredPassword
                      ? '•••••••••••• (Encrypted — enter new to change)'
                      : 'Enter HMIS portal password...'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-2.5 pr-8 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-zinc-400 block">
                Kept strictly separate from your Rad Suite password. Encrypted via AES-256-GCM.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <Badge variant="success" className="gap-1 text-[11px] py-1 px-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> HMIS Credentials Saved
                </Badge>
              )}
              {errorMsg && (
                <span className="text-rose-500 text-xs">{errorMsg}</span>
              )}
            </div>

            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save HMIS Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
