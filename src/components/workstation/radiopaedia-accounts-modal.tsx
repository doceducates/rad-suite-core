'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, Key } from 'lucide-react';
import { RadiopaediaAccountSummary } from '@/services/radiopaedia-pool.service';
import { RadiopaediaAccountItem } from './radiopaedia-account-item';
import { Modal, ModalHeader, ModalTitle, ModalBody } from '@/components/ui/modal';
import { notify } from '@/services/notification.service';

interface RadiopaediaAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsUpdated?: () => void;
}

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_RADIOPAEDIA_CLIENT_ID || '';
const DEFAULT_CLIENT_SECRET = process.env.NEXT_PUBLIC_RADIOPAEDIA_CLIENT_SECRET || '';

export function RadiopaediaAccountsModal({
  isOpen,
  onClose,
  onAccountsUpdated,
}: RadiopaediaAccountsModalProps) {
  const [accounts, setAccounts] = useState<RadiopaediaAccountSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('Radiology Assistant (Account 1)');
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [clientSecret, setClientSecret] = useState(DEFAULT_CLIENT_SECRET);
  const [authCode, setAuthCode] = useState('');

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/radiopaedia/accounts');
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) setAccounts(data.accounts);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const authUrl = `https://radiopaedia.org/oauth/authorize?client_id=${encodeURIComponent(
    clientId.trim()
  )}&response_type=code&redirect_uri=urn:ietf:wg:oauth:2.0:oob`;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) {
      notify.warning('Please authorize and paste the code from Radiopaedia');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/radiopaedia/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || `Radiopaedia Account ${accounts.length + 1}`,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          authCode: authCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to exchange authorization code');

      notify.success('Radiopaedia account connected & encrypted!');
      setAuthCode('');
      setName(`Radiopaedia Account ${accounts.length + 2}`);
      await loadAccounts();
      onAccountsUpdated?.();
    } catch (err: any) {
      notify.error(err.message || 'Connection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    try {
      await fetch('/api/radiopaedia/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, action: 'delete' }),
      });
      notify.info('Radiopaedia account removed');
      await loadAccounts();
      onAccountsUpdated?.();
    } catch (err: any) {
      notify.error(err.message || 'Failed removing account');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <ModalTitle>Radiopaedia Account Pool ({accounts.length} Connected)</ModalTitle>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Active Accounts List */}
        <div>
          <span className="font-bold text-[11px] uppercase tracking-wider text-secondary block mb-2">
            Connected Accounts (Round-Robin Pool)
          </span>
          {accounts.length === 0 ? (
            <div className="p-3 rounded-xl bg-surface-container text-center text-secondary">
              No Radiopaedia accounts connected yet. Add an account below to unlock live case queries.
            </div>
          ) : (
            <div className="space-y-1.5">
              {accounts.map((acc) => (
                <RadiopaediaAccountItem key={acc.id} account={acc} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {/* Add Account Form */}
        <form onSubmit={handleConnect} className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/50 space-y-3">
          <div className="font-bold text-xs text-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Radiopaedia Account (OAuth2)</span>
          </div>

          <div>
            <label className="text-[10px] font-mono text-secondary block mb-1">Account Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Radiopaedia Account 1"
              className="w-full bg-surface text-xs px-2.5 py-1.5 rounded-lg border border-outline-variant/40 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Step 1: Authorize Button */}
          <div className="pt-1">
            <span className="text-[10px] font-mono text-secondary block mb-1">Step 1: Get Authorization Code</span>
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
            >
              <span>Authorize on Radiopaedia.org</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 2: Paste Code */}
          <div>
            <label className="text-[10px] font-mono text-secondary block mb-1">Step 2: Paste Code from Radiopaedia</label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="Paste code returned by Radiopaedia..."
              className="w-full bg-surface font-mono text-xs px-2.5 py-1.5 rounded-lg border border-outline-variant/40 focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !authCode.trim()}
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {submitting ? 'Connecting & Encrypting...' : 'Save & Activate Account'}
          </button>
        </form>
      </ModalBody>
    </Modal>
  );
}
