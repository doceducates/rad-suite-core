'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { notify } from '@/services/notification.service';

interface WaitlistedUsersTableProps {
  users: any[];
  onApproveSuccess?: (userId: string) => void;
}

export function WaitlistedUsersTable({ users, onApproveSuccess }: WaitlistedUsersTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApprove = async (u: any) => {
    setLoadingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve clinician access');
      }

      notify.success(`${u.name} approved for Alpha access!`);
      if (onApproveSuccess) {
        onApproveSuccess(u.id);
      }
    } catch (err: any) {
      notify.error(err.message || 'Error approving clinician');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-on-surface font-headline flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Registered Clinicians Awaiting Review ({users.length})</span>
        </h3>
        {users.length > 0 && (
          <span className="text-[11px] text-amber-500 font-mono font-medium">
            Requires Activation
          </span>
        )}
      </div>

      <div className="flex flex-col rounded-xl border border-outline-variant/60 bg-surface-container overflow-hidden">
        <div className="overflow-x-auto min-h-0 relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-outline-variant/60 text-secondary bg-surface-container-high/95 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Clinician</th>
                <th className="py-2.5 px-3">Role & Title</th>
                <th className="py-2.5 px-3">Hospital / Dept</th>
                <th className="py-2.5 px-3">Registered On</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-secondary text-xs">
                    No clinician accounts currently waiting for approval. New Google and registration signups appear here instantly.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-high/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-on-surface">{u.name}</div>
                      <div className="text-[11px] text-secondary font-mono flex items-center gap-1.5">
                        <span>{u.email}</span>
                        {u.googleEmail && (
                          <span className="px-1 py-0.2 rounded bg-blue-500/10 text-blue-500 text-[9px] font-semibold">
                            Google
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="capitalize font-mono text-[10px]">
                        {u.role || 'consultant'}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{u.title || 'Radiologist'}</div>
                    </td>
                    <td className="py-3 px-3 text-secondary">
                      <div>{u.hospital || 'Workstation Pilot'}</div>
                      <div className="text-[10px] text-muted-foreground">{u.department || 'Radiology'}</div>
                    </td>
                    <td className="py-3 px-3 text-secondary font-mono text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="warning" className="capitalize font-mono text-[10px]">
                        {u.status || 'waitlisted'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(u)}
                        isLoading={loadingId === u.id}
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
