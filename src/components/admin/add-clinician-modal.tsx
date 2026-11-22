'use client';

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notify } from '@/services/notification.service';
import { UserPlus, Shield, Eye, EyeOff } from 'lucide-react';
import { ALL_SCREENS } from '@/services/rbac.service';

interface AddClinicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: any) => void;
}

export function AddClinicianModal({ isOpen, onClose, onUserCreated }: AddClinicianModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('consultant');
  const [status, setStatus] = useState('active');
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('Radiology');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [selectedScreens, setSelectedScreens] = useState<string[]>([
    'my_cases',
    'worklist',
    'workstation',
    'studio',
    'hmis',
    'settings',
  ]);
  const [loading, setLoading] = useState(false);

  const toggleScreen = (screenId: string) => {
    setSelectedScreens((prev) =>
      prev.includes(screenId) ? prev.filter((s) => s !== screenId) : [...prev, screenId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      notify.error('Name, email, and password are required');
      return;
    }
    if (password.length < 6) {
      notify.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          status,
          hospital: hospital.trim() || undefined,
          department: department.trim() || undefined,
          phone: phone.trim() || undefined,
          licenseNo: licenseNo.trim() || undefined,
          allowedScreens: selectedScreens,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create clinician account');
      }

      notify.success(`Account for ${name} created successfully!`);
      onUserCreated(data.data);
      onClose();
    } catch (err: any) {
      notify.error(err.message || 'Error creating clinician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <ModalTitle>Add Clinician Account</ModalTitle>
        </div>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Full Name *</label>
              <Input
                required
                placeholder="Dr. Tariq Mahmood"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Institutional Email *</label>
              <Input
                required
                type="email"
                placeholder="tariq@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Initial Password *</label>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-on-surface">PMDC / License No.</label>
              <Input
                placeholder="e.g. 12345-P"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Clinical / Academy Role</label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setRole(newRole);
                  if (newRole === 'student') {
                    setSelectedScreens(['dashboard', 'atlas', 'settings']);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="student">Medical Student / Anatomy Learner</option>
                <option value="consultant">Consultant Radiologist</option>
                <option value="pgr">Resident Radiologist (PGR)</option>
                <option value="technologist">Imaging Technologist</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active (Granted Access)</option>
                <option value="waitlisted">Waitlisted (Pending)</option>
                <option value="suspended">Suspended (Locked)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Phone / WhatsApp</label>
              <Input
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Hospital / Center</label>
              <Input
                placeholder="Mayo Hospital / DHQ"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-on-surface">Department</label>
              <Input
                placeholder="Radiology & Imaging"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-outline-variant/60">
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface">Permitted Workstation Screens</span>
              <span className="text-[11px] text-secondary">Control visible workstation screens</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {ALL_SCREENS.map((screen) => {
                const isChecked = selectedScreens.includes('*') || selectedScreens.includes(screen.id);
                return (
                  <label
                    key={screen.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-primary/40 bg-primary/5 text-on-surface'
                        : 'border-outline-variant/60 bg-surface text-secondary hover:text-on-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleScreen(screen.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs">{screen.name}</div>
                      <div className="text-[10px] text-secondary truncate">{screen.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" isLoading={loading} className="gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
