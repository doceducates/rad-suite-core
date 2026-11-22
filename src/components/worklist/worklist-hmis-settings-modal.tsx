'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { KeyRound, Building, User, CheckCircle2, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';

interface WorklistHmisSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

export function WorklistHmisSettingsModal({
  isOpen,
  onClose,
  autoSyncEnabled,
  onToggleAutoSync,
}: WorklistHmisSettingsModalProps) {
  const [hospitalId, setHospitalId] = useState('19');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.data) {
          setHospitalId(d.data.hmisHospitalId || '19');
          setUsername(d.data.hmisUsername || '');
          setDoctorName(d.data.hmisReportingDoctorName || d.data.name || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        hmisHospitalId: hospitalId.trim(),
        hmisUsername: username.trim(),
        hmisReportingDoctorName: doctorName.trim(),
      };
      if (password) {
        payload.hmisPassword = password;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        notify.error(data.error || 'Failed to update HMIS credentials');
      } else {
        notify.success('HMIS credentials saved securely');
        setPassword('');
        onClose();
      }
    } catch (err: any) {
      notify.error(`Network error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <ModalTitle>HMIS Integration &amp; Account Settings</ModalTitle>
      </ModalHeader>
      <form onSubmit={handleSave}>
        <ModalBody className="space-y-4 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-high/40 border border-outline-variant/40 text-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Credentials are encrypted with AES-256-GCM. Never shared or leaked.</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-secondary">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading settings...
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-primary" /> Hospital
                </label>
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-background text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="19">Lahore General Hospital, Lahore (ID: 19)</option>
                  <option value="1">Mayo Hospital, Lahore (ID: 1)</option>
                  <option value="2">Jinnah Hospital, Lahore (ID: 2)</option>
                  <option value="3">Services Hospital, Lahore (ID: 3)</option>
                  <option value="4">Sir Ganga Ram Hospital, Lahore (ID: 4)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-on-surface flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> HMIS Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Dr.MMudassir"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-background text-on-surface font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-on-surface flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" /> Portal Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password to update"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-background text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-on-surface">Reporting Doctor Signature Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Muhammad Mudassir Radiology"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-background text-on-surface"
                />
              </div>

              <div className="p-3 rounded-lg border border-outline-variant/60 bg-surface-container flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-semibold text-on-surface flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-primary" /> Auto-Sync Worklist
                  </div>
                  <div className="text-[11px] text-secondary">
                    When off, cases only sync when you manually click &quot;Sync HMIS&quot;.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAutoSync(!autoSyncEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoSyncEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving || !username.trim()} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Save Settings
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
