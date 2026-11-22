'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import { Send, MessageCircle, Mail, Users } from 'lucide-react';
import { WaitlistedUsersTable } from './waitlisted-users-table';

interface AlphaWaitlistTabProps {
  initialPreRegistrations: any[];
  waitlistedUsers?: any[];
  onApproveSuccess?: (userId: string) => void;
}

export function AlphaWaitlistTab({
  initialPreRegistrations,
  waitlistedUsers = [],
  onApproveSuccess,
}: AlphaWaitlistTabProps) {
  const [leads, setLeads] = useState(initialPreRegistrations);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleApproveAndInvite = async (lead: any) => {
    setLoadingId(lead.id);
    try {
      const res = await fetch(`/api/admin/pre-registrations/${lead.id}/invite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate invite');
      }

      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? { ...l, status: 'invited', inviteCodeSent: data.data.inviteCode, whatsAppUrl: data.data.whatsAppUrl }
            : l
        )
      );

      notify.success(`Invite code ${data.data.inviteCode} dispatched for ${lead.fullName}`);

      if (data.data?.whatsAppUrl) {
        window.open(data.data.whatsAppUrl, '_blank');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error approving applicant');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Clinicians who registered via Google or web awaiting approval */}
      <WaitlistedUsersTable users={waitlistedUsers} onApproveSuccess={onApproveSuccess} />

      {/* 2. Public landing page applicants */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-on-surface font-headline flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Public Landing Page Applications ({leads.length})</span>
        </h3>

        <div className="flex flex-col rounded-xl border border-outline-variant/60 bg-surface-container overflow-hidden max-h-[calc(100vh-20rem)] min-h-[260px]">
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 border-b border-outline-variant/60 text-secondary bg-surface-container-high/95 backdrop-blur-xs font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Applicant</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Hospital & Role</th>
                  <th className="py-2.5 px-3">Modalities</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-secondary text-xs">
                      No public landing page pre-registrations received yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const isInvited = lead.status === 'invited';
                    const mods: string[] = Array.isArray(lead.modalitiesOfInterest)
                      ? lead.modalitiesOfInterest
                      : [];

                    return (
                      <tr key={lead.id} className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-on-surface">{lead.fullName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'Recent'}
                          </div>
                        </td>

                        <td className="py-3 px-3 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-secondary">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-secondary font-mono text-[11px]">
                            <MessageCircle className="w-3 h-3 text-emerald-500" />
                            <span>{lead.phone}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-secondary">
                          <div className="font-semibold text-on-surface">{lead.hospital}</div>
                          <div className="text-[11px] text-muted-foreground">{lead.roleDesignation}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {mods.map((m) => (
                              <span
                                key={m}
                                className="px-1.5 py-0.5 rounded bg-surface-container-highest text-[10px] font-mono text-secondary"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={isInvited ? 'success' : 'warning'}
                            className="capitalize font-mono text-[10px]"
                          >
                            {lead.status}
                          </Badge>
                          {lead.inviteCodeSent && (
                            <div className="text-[10px] font-mono text-primary font-bold mt-0.5">
                              {lead.inviteCodeSent}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isInvited ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {lead.whatsAppUrl && (
                                <a
                                  href={lead.whatsAppUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                              <span className="text-[11px] text-secondary font-mono">Invited</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleApproveAndInvite(lead)}
                              isLoading={loadingId === lead.id}
                              className="h-7 text-xs gap-1 font-semibold shadow-xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Approve & Invite</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 flex items-center justify-between px-3.5 py-2 border-t border-outline-variant/60 bg-surface-container-high/95 text-[11px] text-secondary font-mono select-none">
            <span>Total Leads: <strong className="text-on-surface">{leads.length}</strong></span>
            <span>Pending: <strong className="text-amber-500">{leads.filter((l) => l.status !== 'invited').length}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
