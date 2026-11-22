'use client';

import React from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ALL_SCREENS } from '@/services/rbac.service';
import { HardDrive, Cloud, Database, Server, Radio } from 'lucide-react';

interface EditClinicianModalProps {
  editingUser: any | null;
  onClose: () => void;
  editRole: string;
  setEditRole: (role: string) => void;
  editStatus: string;
  setEditStatus: (status: string) => void;
  selectedScreens: string[];
  toggleScreen: (screenId: string) => void;
  selectedStorageSources?: string[];
  toggleStorageSource?: (sourceId: string) => void;
  handleSaveRbac: () => void;
  saving: boolean;
}

export function EditClinicianModal({
  editingUser,
  onClose,
  editRole,
  setEditRole,
  editStatus,
  setEditStatus,
  selectedScreens,
  toggleScreen,
  selectedStorageSources = ['local', 'gdrive'],
  toggleStorageSource,
  handleSaveRbac,
  saving,
}: EditClinicianModalProps) {
  if (!editingUser) return null;

  const storageOptions = [
    {
      id: 'pacs',
      name: 'Hospital PACS Direct Query',
      desc: 'DIMSE C-FIND / C-GET access to core hospital PACS archive',
      icon: Server,
    },
    {
      id: 's3',
      name: 'Main Cloud Archive & S3',
      desc: 'Access to organization central S3 object store and VPS hot staging',
      icon: Database,
    },
    {
      id: 'remote_node',
      name: 'Clinic Edge Node',
      desc: 'Remote clinic PC edge harvester queue & telemetry',
      icon: Radio,
    },
  ];

  return (
    <Modal isOpen={!!editingUser} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Edit Permissions: {editingUser.name}</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-on-surface">Account Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
            >
              <option value="active">Active (Granted Access)</option>
              <option value="waitlisted">Waitlisted (Pending Invite)</option>
              <option value="suspended">Suspended (Locked)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-on-surface">Clinical / Academy Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
            >
              <option value="student">Medical Student / Anatomy Learner</option>
              <option value="consultant">Consultant Radiologist</option>
              <option value="pgr">Resident Radiologist (PGR)</option>
              <option value="technologist">Technologist</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>
        </div>

        {/* Granular Storage Source Access */}
        <div className="space-y-2 pt-2 border-t border-outline-variant/60">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">Storage &amp; Cloud Infrastructure Access</span>
            <span className="text-[11px] text-secondary">Control which remote DICOM archives this clinician can query</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {storageOptions.map((opt) => {
              const isChecked = selectedStorageSources.includes('*') || selectedStorageSources.includes(opt.id);
              const Icon = opt.icon;

              return (
                <label
                  key={opt.id}
                  className={`flex flex-col justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-primary/50 bg-primary/5 text-on-surface'
                      : 'border-outline-variant/60 bg-surface text-secondary hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-on-surface">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{opt.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStorageSource?.(opt.id)}
                      className="accent-primary mt-0.5"
                    />
                  </div>
                  <div className="text-[10px] text-secondary mt-1 leading-snug">{opt.desc}</div>
                </label>
              );
            })}
          </div>
          <div className="text-[10.5px] text-muted-foreground italic">
            * Local SSD/HDD cases and Clinician&apos;s Personal Google Drive (15 GB) are enabled by default for all clinicians.
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-outline-variant/60">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">Screen-Level Access Permissions</span>
            <span className="text-[11px] text-secondary">Toggle modules visible to this clinician</span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
            {ALL_SCREENS.map((screen) => {
              const isChecked = selectedScreens.includes('*') || selectedScreens.includes(screen.id);
              const isPacs = screen.id === 'pacs';

              return (
                <label
                  key={screen.id}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
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
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <span>{screen.name}</span>
                      {isPacs && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Restricted
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-secondary truncate">{screen.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSaveRbac} isLoading={saving}>
          Save Permissions
        </Button>
      </ModalFooter>
    </Modal>
  );
}
