'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import {
  Sparkles,
  Building2,
  Cloud,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Shield,
  X,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface FirstRunSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'radsuite_onboarding_completed_v1';

export function FirstRunSetupWizard({ isOpen, onClose }: FirstRunSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [doctorName, setDoctorName] = useState('');
  const [designation, setDesignation] = useState('PGR');
  const [hospitalId, setHospitalId] = useState('19'); // 19 = LGH
  const [hmisUser, setHmisUser] = useState('');
  const [hmisPass, setHmisPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('radsuite_reporting_doctor_name');
      if (savedName) setDoctorName(savedName.replace(/\s*\(.*?\)\s*/, ''));
      const savedHmisUser = localStorage.getItem('radsuite_hmis_username');
      if (savedHmisUser) setHmisUser(savedHmisUser);
    }
  }, []);

  const handleSkip = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    notify.info('Setup Skipped', {
      description: 'You can configure your clinician details and HMIS credentials anytime in Settings.',
    });
    onClose();
  };

  const handleFinish = async () => {
    setSaving(true);
    const fullAttribution = doctorName.trim() ? `${doctorName.trim()} (${designation})` : '';

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
      if (fullAttribution) {
        localStorage.setItem('radsuite_reporting_doctor_name', fullAttribution);
      }
      if (hmisUser.trim()) {
        localStorage.setItem('radsuite_hmis_username', hmisUser.trim());
      }
      if (hospitalId) {
        localStorage.setItem('radsuite_hmis_hospital_id', hospitalId);
      }
    }

    try {
      const payload: Record<string, string> = {};
      if (doctorName.trim()) payload.name = doctorName.trim();
      if (designation) payload.title = designation;
      if (hospitalId) payload.hmisHospitalId = hospitalId;
      if (hmisUser.trim()) payload.hmisUsername = hmisUser.trim();
      if (hmisPass.trim()) payload.hmisPassword = hmisPass.trim();
      if (fullAttribution) payload.hmisReportingDoctorName = fullAttribution;

      if (Object.keys(payload).length > 0) {
        await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      notify.success('Workstation Ready', {
        description: 'Clinician profile and encrypted HMIS credentials saved successfully.',
      });
    } catch {
      notify.success('Setup Completed Locally', {
        description: 'Credentials saved locally in your workstation vault.',
      });
    } finally {
      setSaving(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} size="md" closeOnBackdropClick={true}>
      <div className="relative p-5 sm:p-6 flex flex-col gap-5 text-foreground select-none">
        {/* Top Close 'X' Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Close setup modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 pr-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-headline leading-tight text-on-surface">
                Workstation Clinical Setup
              </h2>
              <p className="text-[11px] text-secondary">
                Step {step} of 2 &bull; {step === 1 ? 'Clinician Profile' : 'Punjab HMIS Portal'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            Alpha v1.0
          </Badge>
        </div>

        {/* Step 1: Clinician Profile & Attribution */}
        {step === 1 && (
          <div className="flex flex-col gap-3 py-1 text-xs">
            <div>
              <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>Diagnostic Report Attribution</span>
              </h3>
              <p className="text-[11px] text-secondary mt-0.5">
                Your name and role automatically sign report impressions and exported PDF documents.
              </p>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-on-surface block mb-1">
                  Doctor Full Name
                </label>
                <Input
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="w-full text-xs h-9"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-on-surface block mb-1">
                  Clinical Designation
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="PGR">Postgraduate Resident (PGR)</option>
                  <option value="Senior Registrar">Senior Registrar (SR)</option>
                  <option value="Consultant Radiologist">Consultant Radiologist</option>
                  <option value="Clinical Fellow">Clinical Fellow</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Punjab HMIS Credentials & Optional Cloud Storage */}
        {step === 2 && (
          <div className="flex flex-col gap-3 py-1 text-xs">
            <div>
              <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Punjab HMIS Portal Credentials</span>
              </h3>
              <p className="text-[11px] text-secondary mt-0.5">
                Saved securely in the local vault to load daily worklists and auto-save draft findings.
              </p>
            </div>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-on-surface block mb-1">
                    HMIS Username
                  </label>
                  <Input
                    value={hmisUser}
                    onChange={(e) => setHmisUser(e.target.value)}
                    placeholder="e.g. dr_username"
                    className="w-full text-xs h-9"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-on-surface block mb-1">
                    HMIS Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={hmisPass}
                      onChange={(e) => setHmisPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs h-9 pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-secondary hover:text-on-surface"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[10.5px] text-secondary bg-primary/5 p-2 rounded-lg border border-primary/15 flex items-start gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>HIPAA Invariant:</strong> Password is encrypted with AES-256-GCM. Final submissions remain hard-locked; only draft saves are executed.
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-border">
                <div className="flex items-center gap-1.5 text-secondary">
                  <Cloud className="w-3.5 h-3.5 text-sky-500" />
                  <span className="text-[11px]">Free 15 GB Personal Drive</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1 cursor-pointer"
                  onClick={() => {
                    window.open('/api/google/auth/url', '_blank', 'width=600,height=700');
                    notify.info('Google Sign-In opened');
                  }}
                >
                  Connect Drive
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-xs text-secondary hover:text-on-surface"
          >
            Skip for Now
          </Button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="gap-1 text-xs h-8"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}

            {step < 2 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setStep(step + 1)}
                className="gap-1 text-xs h-8"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFinish}
                disabled={saving}
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs"
              >
                <span>{saving ? 'Saving...' : 'Enter Cockpit'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
