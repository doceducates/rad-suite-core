'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, CheckSquare, Square, UserCheck } from 'lucide-react';

interface CliniciansTableProps {
  usersList: any[];
  selectedUserIds: string[];
  toggleSelectUser: (id: string) => void;
  toggleSelectAll: () => void;
  onEdit: (user: any) => void;
  onDelete: (user: any) => void;
  onApprove?: (user: any) => void;
}

export function CliniciansTable({
  usersList,
  selectedUserIds,
  toggleSelectUser,
  toggleSelectAll,
  onEdit,
  onDelete,
  onApprove,
}: CliniciansTableProps) {
  const isAllSelected = usersList.length > 0 && selectedUserIds.length === usersList.length;

  return (
    <div className="flex flex-col rounded-xl border border-outline-variant/60 bg-surface-container overflow-hidden max-h-[calc(100vh-16rem)] min-h-[340px]">
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 border-b border-outline-variant/60 text-secondary bg-surface-container-high/95 backdrop-blur-xs font-semibold">
          <tr>
            <th className="py-3 px-3 w-8">
              <button type="button" onClick={toggleSelectAll} className="cursor-pointer text-secondary hover:text-on-surface">
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              </button>
            </th>
            <th className="py-3 px-3">Clinician</th>
            <th className="py-3 px-3">Role</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3">Hospital / Dept</th>
            <th className="py-3 px-3">Permitted Screens</th>
            <th className="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {usersList.map((u) => {
            const screens: string[] = Array.isArray(u.allowedScreens) ? u.allowedScreens : [];
            const isWildcard = screens.includes('*');
            const isSelected = selectedUserIds.includes(u.id);

            return (
              <tr key={u.id} className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-high/50'}`}>
                <td className="py-3 px-3">
                  <button type="button" onClick={() => toggleSelectUser(u.id)} className="cursor-pointer text-secondary hover:text-on-surface">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
                <td className="py-3 px-3">
                  <div className="font-bold text-on-surface">{u.name}</div>
                  <div className="text-[11px] text-secondary font-mono">{u.email}</div>
                </td>
                <td className="py-3 px-3">
                  <Badge variant={u.role === 'admin' ? 'info' : 'outline'} className="capitalize font-mono text-[10px]">
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3 px-3">
                  <Badge
                    variant={u.status === 'active' ? 'success' : u.status === 'waitlisted' ? 'warning' : 'outline'}
                    className="capitalize font-mono text-[10px]"
                  >
                    {u.status || 'active'}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-secondary">
                  <div>{u.hospital || 'Rad Suite Workstation'}</div>
                  <div className="text-[10px] text-muted-foreground">{u.department || 'Radiology'}</div>
                </td>
                <td className="py-3 px-3">
                  {isWildcard ? (
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                      Full Workstation (*)
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {screens.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-surface-container-highest text-[10px] font-mono text-secondary">
                          {s}
                        </span>
                      ))}
                      {screens.length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-mono">+{screens.length - 3} more</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {u.status !== 'active' && onApprove && (
                      <Button
                        size="sm"
                        onClick={() => onApprove(u)}
                        className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                        title="Approve clinician and grant full access"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(u)}
                      className="text-xs h-7 gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(u)}
                      className="text-xs h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {/* Sticky Bottom Summary Bar */}
    <div className="sticky bottom-0 z-20 shrink-0 flex items-center justify-between px-3.5 py-2 border-t border-outline-variant/60 bg-surface-container-high/95 backdrop-blur-md text-[11px] text-secondary font-mono select-none">
      <span>Total: <strong className="text-on-surface">{usersList.length}</strong> clinicians</span>
      <span>{selectedUserIds.length > 0 ? `${selectedUserIds.length} selected` : 'Click row checkbox to select'}</span>
    </div>
  </div>
  );
}
