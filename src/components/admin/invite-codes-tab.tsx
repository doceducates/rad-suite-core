'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { notify } from '@/services/notification.service';
import { Key, Plus, Copy, Check, MessageCircle, Mail, Trash2 } from 'lucide-react';
import { ALL_SCREENS } from '@/services/rbac.service';
import { config } from '@/lib/config';

interface InviteCodesTabProps {
  initialInvites: any[];
}

export function InviteCodesTab({ initialInvites }: InviteCodesTabProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [role, setRole] = useState('consultant');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [selectedScreens, setSelectedScreens] = useState<string[]>(['my_cases', 'worklist', 'workstation', 'studio', 'hmis', 'settings']);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleScreen = (screenId: string) => {
    setSelectedScreens((prev) =>
      prev.includes(screenId) ? prev.filter((s) => s !== screenId) : [...prev, screenId]
    );
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          allowedScreens: selectedScreens,
          maxUses,
          expiresInDays,
          recipientName: recipientName.trim() || undefined,
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
          sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create invite code');
      }

      setInvites([data.data.invite, ...invites]);
      notify.success(`Invite code ${data.data.invite.code} generated!`);
      setIsModalOpen(false);
      setRecipientName('');
      setRecipientEmail('');
      setRecipientPhone('');

      if (data.data.whatsAppUrl) {
        window.open(data.data.whatsAppUrl, '_blank');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error generating invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : config.appUrl;
    const link = `${origin}/register?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    notify.info('Copied registration link to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke code');
      setInvites((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isActive: false } : i))
      );
      notify.success('Invite code revoked');
    } catch (err: any) {
      notify.error(err.message || 'Failed to revoke code');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-on-surface font-headline">Alpha Invite Codes</h3>
          <p className="text-xs text-secondary">Generate and monitor alpha access tokens</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 text-xs font-semibold shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>Generate Invite Code</span>
        </Button>
      </div>

      <div className="flex flex-col rounded-xl border border-outline-variant/60 bg-surface-container overflow-hidden max-h-[calc(100vh-16rem)] min-h-[340px]">
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 border-b border-outline-variant/60 text-secondary bg-surface-container-high/95 backdrop-blur-xs font-semibold">
            <tr>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Target Role</th>
              <th className="py-3 px-4">Redemptions</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {invites.map((inv) => {
              const isDepleted = inv.maxUses > 0 && inv.usesCount >= inv.maxUses;
              const isLive = inv.isActive && !isDepleted;

              return (
                <tr key={inv.id} className="hover:bg-surface-container-high/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-primary text-sm">{inv.code}</td>
                  <td className="py-3 px-4"><Badge variant="outline" className="capitalize font-mono text-[10px]">{inv.role}</Badge></td>
                  <td className="py-3 px-4 font-mono text-secondary">{inv.usesCount} / {inv.maxUses > 0 ? inv.maxUses : '∞'}</td>
                  <td className="py-3 px-4 text-secondary">
                    <div className="font-semibold text-on-surface">{inv.recipientName || 'Open Invite'}</div>
                    <div className="text-[11px] text-muted-foreground">{inv.recipientEmail || inv.recipientPhone || '—'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={isLive ? 'success' : 'outline'} className="text-[10px] font-mono">
                      {isLive ? 'Active' : isDepleted ? 'Depleted' : 'Revoked'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => handleCopyLink(inv.code)} className="h-7 text-xs gap-1">
                        {copiedCode === inv.code ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Link</span>
                      </Button>
                      {inv.isActive && (
                        <Button size="sm" variant="ghost" onClick={() => handleRevoke(inv.id)} className="h-7 text-xs text-rose-500 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Sticky Bottom Summary Bar */}
      <div className="sticky bottom-0 z-20 shrink-0 flex items-center justify-between px-4 py-2 border-t border-outline-variant/60 bg-surface-container-high/95 backdrop-blur-md text-[11px] text-secondary font-mono select-none">
        <span>Total Codes: <strong className="text-on-surface">{invites.length}</strong></span>
        <span>Active: <strong className="text-emerald-500">{invites.filter((i) => i.isActive && (i.maxUses === 0 || i.usesCount < i.maxUses)).length}</strong></span>
      </div>
    </div>

      {/* Create Invite Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
          <ModalHeader onClose={() => setIsModalOpen(false)}>
            <ModalTitle>Generate Alpha Invite Code</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleCreateInvite}>
            <ModalBody className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-on-surface">Target Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setRole(newRole);
                      if (newRole === 'student') {
                        setSelectedScreens(['dashboard', 'atlas', 'settings']);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
                  >
                    <option value="student">Medical Student / Anatomy Learner</option>
                    <option value="consultant">Consultant Radiologist</option>
                    <option value="pgr">Resident Radiologist (PGR)</option>
                    <option value="technologist">Technologist</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-on-surface">Max Uses</label>
                  <select
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
                  >
                    <option value={1}>1 Use (Single Account)</option>
                    <option value={5}>5 Uses (Batch)</option>
                    <option value={20}>20 Uses (Class / Trial)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-on-surface">Recipient Name (Optional)</label>
                  <Input
                    type="text"
                    placeholder="e.g. Dr. Asim"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-on-surface">Recipient Email (Optional)</label>
                  <Input
                    type="email"
                    placeholder="e.g. asim@hospital.org"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-on-surface">WhatsApp Phone (Optional)</label>
                  <Input
                    type="tel"
                    placeholder="+92 300 1234567"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-on-surface">Validity Period</label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/60 space-y-2">
                <span className="font-bold text-on-surface">Permitted Modules</span>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {ALL_SCREENS.filter((s) => s.id !== 'users' && s.id !== 'audit').map((screen) => {
                    const isChecked = selectedScreens.includes(screen.id);
                    return (
                      <label key={screen.id} className="flex items-center gap-2 p-1.5 rounded border border-outline-variant/60 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleScreen(screen.id)}
                          className="accent-primary"
                        />
                        <span>{screen.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={loading}>
                Generate Invite Code
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
