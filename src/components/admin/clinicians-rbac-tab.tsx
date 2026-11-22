'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { notify } from '@/services/notification.service';
import { UserPlus } from 'lucide-react';
import { AddClinicianModal } from './add-clinician-modal';
import { EditClinicianModal } from './edit-clinician-modal';
import { CliniciansTable } from './clinicians-table';
import { PendingApprovalsBanner } from './pending-approvals-banner';

interface CliniciansRbacTabProps {
  initialUsers: any[];
}

export function CliniciansRbacTab({ initialUsers }: CliniciansRbacTabProps) {
  const [usersList, setUsersList] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'waitlisted'>('all');
  const [editRole, setEditRole] = useState<string>('consultant');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [selectedStorageSources, setSelectedStorageSources] = useState<string[]>(['local', 'gdrive']);
  const [saving, setSaving] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setEditRole(u.role || 'consultant');
    setEditStatus(u.status || 'active');
    setSelectedScreens(Array.isArray(u.allowedScreens) ? u.allowedScreens : ['my_cases', 'worklist', 'workstation', 'studio']);
    let parsedStorage = ['local', 'gdrive'];
    try {
      if (Array.isArray(u.allowedStorageSources)) parsedStorage = u.allowedStorageSources;
      else if (typeof u.allowedStorageSources === 'string') parsedStorage = JSON.parse(u.allowedStorageSources);
      else if (u.role === 'admin') parsedStorage = ['*'];
    } catch {}
    setSelectedStorageSources(parsedStorage);
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    setSelectedUserIds(selectedUserIds.length === usersList.length ? [] : usersList.map((u) => u.id));
  };

  const toggleScreen = (screenId: string) => {
    setSelectedScreens((prev) => (prev.includes(screenId) ? prev.filter((s) => s !== screenId) : [...prev, screenId]));
  };

  const toggleStorageSource = (sourceId: string) => {
    setSelectedStorageSources((prev) => (prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId]));
  };

  const handleSaveRbac = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
          allowedScreens: selectedScreens,
          allowedStorageSources: selectedStorageSources,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user');
      }

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, role: editRole, status: editStatus, allowedScreens: selectedScreens, allowedStorageSources: selectedStorageSources }
            : u
        )
      );
      notify.success('Clinician permissions updated successfully');
      setEditingUser(null);
    } catch (err: any) {
      notify.error(err.message || 'Error updating user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete user');
      setUsersList((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setSelectedUserIds((prev) => prev.filter((id) => id !== deletingUser.id));
      notify.success(`User ${deletingUser.name} deleted successfully`);
      setDeletingUser(null);
    } catch (err: any) {
      notify.error(err.message || 'Error deleting user');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveUser = async (u: any) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve user');
      setUsersList((prev) => prev.map((user) => (user.id === u.id ? { ...user, status: 'active' } : user)));
      notify.success(`${u.name} approved for access!`);
    } catch (err: any) {
      notify.error(err.message || 'Error approving user');
    }
  };

  const handleBatchAction = async (action: 'activate' | 'suspend' | 'delete') => {
    if (selectedUserIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/admin/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Batch operation failed');
      if (action === 'delete') {
        setUsersList((prev) => prev.filter((u) => !selectedUserIds.includes(u.id)));
      } else {
        setUsersList((prev) => prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, status: action } : u)));
      }
      setSelectedUserIds([]);
      notify.success(data.message || `Batch ${action} completed successfully`);
    } catch (err: any) {
      notify.error(err.message || `Error executing batch ${action}`);
    } finally {
      setBatchLoading(false);
    }
  };

  const waitlistCount = usersList.filter((u) => u.status === 'waitlisted' || u.status === 'pending_invite').length;
  const filteredUsers = usersList.filter((u) => {
    if (filterStatus === 'active') return u.status === 'active';
    if (filterStatus === 'waitlisted') return u.status === 'waitlisted' || u.status === 'pending_invite';
    return true;
  });

  return (
    <div className="space-y-4">
      <PendingApprovalsBanner count={waitlistCount} onReview={() => setFilterStatus('waitlisted')} />

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/60">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 text-xs font-semibold">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Clinician</span>
          </Button>

          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-surface-container-high/60 p-0.5 rounded-lg border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              All ({usersList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterStatus === 'active' ? 'bg-primary text-on-primary' : 'text-secondary hover:text-on-surface'
              }`}
            >
              Active ({usersList.filter((u) => u.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('waitlisted')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterStatus === 'waitlisted' ? 'bg-amber-600 text-white' : 'text-secondary hover:text-on-surface'
              }`}
            >
              Waitlist {waitlistCount > 0 ? `(${waitlistCount})` : '(0)'}
            </button>
          </div>

          {selectedUserIds.length > 0 && (
            <span className="text-xs font-mono text-secondary ml-1">
              {selectedUserIds.length} selected
            </span>
          )}
        </div>

        {selectedUserIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={batchLoading} onClick={() => handleBatchAction('activate')} className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
              Activate
            </Button>
            <Button size="sm" variant="outline" disabled={batchLoading} onClick={() => handleBatchAction('suspend')} className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
              Suspend
            </Button>
            <Button size="sm" variant="outline" disabled={batchLoading} onClick={() => handleBatchAction('delete')} className="text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10">
              Delete
            </Button>
          </div>
        )}
      </div>

      <CliniciansTable
        usersList={filteredUsers}
        selectedUserIds={selectedUserIds}
        toggleSelectUser={toggleSelectUser}
        toggleSelectAll={toggleSelectAll}
        onEdit={handleOpenEdit}
        onDelete={(u) => setDeletingUser(u)}
        onApprove={handleApproveUser}
      />

      <AddClinicianModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onUserCreated={(newUser) => setUsersList((prev) => [newUser, ...prev])}
      />

      <EditClinicianModal
        editingUser={editingUser}
        onClose={() => setEditingUser(null)}
        editRole={editRole}
        setEditRole={setEditRole}
        editStatus={editStatus}
        setEditStatus={setEditStatus}
        selectedScreens={selectedScreens}
        toggleScreen={toggleScreen}
        selectedStorageSources={selectedStorageSources}
        toggleStorageSource={toggleStorageSource}
        handleSaveRbac={handleSaveRbac}
        saving={saving}
      />

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <Modal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} size="sm">
          <ModalHeader onClose={() => setDeletingUser(null)}>
            <ModalTitle>Delete Clinician Account</ModalTitle>
          </ModalHeader>
          <ModalBody className="text-xs space-y-2">
            <p className="text-on-surface">
              Are you sure you want to delete <span className="font-bold">{deletingUser.name}</span> ({deletingUser.email})?
            </p>
            <p className="text-secondary text-[11px]">
              This action cannot be undone. All active sessions for this clinician will be terminated.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteUser} isLoading={saving}>
              Confirm Delete
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
