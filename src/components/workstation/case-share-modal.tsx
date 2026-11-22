'use client';

// Layer 4 (Presentation): Secure Case Share Modal for Supervising Consultants (<240 lines)
import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Key, Clock, Copy, Check, ShieldAlert, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import { config } from '@/lib/config';

interface CaseShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyId: string;
  accessionNumber: string;
  modality?: string;
  patientName?: string;
  consultantName?: string;
}

interface ShareRecord {
  id: string;
  token: string;
  password_hint?: string;
  expires_at: string;
  duration_hours: number;
  view_count: number;
  is_active: number | boolean;
  created_at: string;
}

export function CaseShareModal({
  isOpen,
  onClose,
  studyId,
  accessionNumber,
  modality = 'MRI',
  consultantName = 'Dr. Sadoon',
}: CaseShareModalProps) {
  const [durationHours, setDurationHours] = useState<number>(72);
  const [pin, setPin] = useState<string>('');
  const [passwordHint, setPasswordHint] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [createdShare, setCreatedShare] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeShares, setActiveShares] = useState<ShareRecord[]>([]);
  const [loadingShares, setLoadingShares] = useState<boolean>(false);

  const generateRandomPin = useCallback(() => {
    const num = Math.floor(100 + Math.random() * 900);
    return `RAD-${num}`;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPin(generateRandomPin());
      setCreatedShare(null);
      setCopied(false);
      loadExistingShares();
    }
  }, [isOpen, studyId, generateRandomPin]);

  const loadExistingShares = async () => {
    if (!studyId) return;
    setLoadingShares(true);
    try {
      const res = await fetch(`/api/shares/study/${encodeURIComponent(studyId)}`);
      const data = await res.json();
      if (res.ok && data.shares) {
        setActiveShares(data.shares);
      }
    } catch {
      // Non-fatal list fetch
    } finally {
      setLoadingShares(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!studyId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/shares/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyId,
          password: pin.trim(),
          passwordHint: passwordHint.trim() || undefined,
          durationHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error(data.error || 'Failed to generate share link');
        return;
      }
      setCreatedShare(data.share);
      notify.success('Secure consultant share link created');
      loadExistingShares();
    } catch (err: any) {
      notify.error(err?.message || 'Network error creating share link');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      const res = await fetch('/api/shares/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify.error(data.error || 'Failed to revoke link');
        return;
      }
      notify.info('Share link revoked');
      setActiveShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch {
      notify.error('Network error revoking share link');
    }
  };

  const formattedShareMessage = createdShare
    ? `${consultantName || 'Consultant'}, please review this ${modality} case on Rad Suite: ${createdShare.shareUrl} Password: ${createdShare.passwordPin} (Valid for ${durationHours >= 24 ? Math.round(durationHours / 24) + ' days' : durationHours + ' hours'})`
    : '';

  const handleCopyFormatted = async () => {
    if (!formattedShareMessage) return;
    try {
      await navigator.clipboard.writeText(formattedShareMessage);
      setCopied(true);
      notify.success('Formatted review invitation copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      notify.error('Clipboard copy failed');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>Share with Supervising Consultant</ModalTitle>
            <ModalDescription>
              Generate a time-limited, password-protected review link for {accessionNumber} ({modality})
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Creation Box */}
        <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Expiry Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-secondary mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Link Expiry Duration</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: '24 Hours', hours: 24 },
                  { label: '3 Days', hours: 72 },
                  { label: '7 Days', hours: 168 },
                ].map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setDurationHours(opt.hours)}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      durationHours === opt.hours
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-outline-variant/60 bg-card text-secondary hover:text-on-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Security PIN */}
            <div>
              <label className="block text-[11px] font-semibold text-secondary mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-primary" />
                  <span>Security PIN / Password</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPin(generateRandomPin())}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Regenerate</span>
                </button>
              </label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="e.g. RAD-482"
                className="font-mono font-bold tracking-wider text-center text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-secondary mb-1">
              Password Hint (Optional, displayed to consultant on challenge screen)
            </label>
            <Input
              value={passwordHint}
              onChange={(e) => setPasswordHint(e.target.value)}
              placeholder="e.g. Your consultant PIN or department code"
              className="text-xs"
            />
          </div>

          <Button
            onClick={handleGenerateLink}
            disabled={generating || !pin.trim()}
            variant="primary"
            className="w-full gap-2 font-bold cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating Protected Link...' : 'Generate Consultant Review Link'}</span>
          </Button>
        </div>

        {/* Generated Result Box */}
        {createdShare && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <Badge variant="success" className="font-mono">
                Active Link Created
              </Badge>
              <span className="text-[10px] text-secondary">
                Expires: {new Date(createdShare.expiresAt).toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-card border border-outline-variant/60 font-mono text-[11px] break-all select-all text-on-surface">
              {createdShare.shareUrl}
            </div>

            <div className="p-2.5 rounded-lg bg-surface-container text-xs text-secondary italic">
              &quot;{formattedShareMessage}&quot;
            </div>

            <Button
              onClick={handleCopyFormatted}
              variant="outline"
              className="w-full gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-bold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Invitation to Clipboard!' : '1-Click Copy Link & Password for WhatsApp'}</span>
            </Button>
          </div>
        )}

        {/* Existing Active Shares Table */}
        {activeShares.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-outline-variant/40">
            <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span>Active Share Links ({activeShares.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {activeShares.map((s) => {
                const isExpired = new Date(s.expires_at).getTime() <= Date.now();
                const isActive = s.is_active === 1 || s.is_active === true;
                return (
                  <div
                    key={s.id}
                    className="p-2 rounded-lg bg-surface-container flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-primary font-bold text-[11px] truncate max-w-[120px]">
                        ...{s.token.slice(-8)}
                      </span>
                      <Badge variant={!isActive || isExpired ? 'danger' : 'success'} className="text-[9px] py-0">
                        {!isActive ? 'Revoked' : isExpired ? 'Expired' : `${s.view_count || 0} views`}
                      </Badge>
                      <span className="text-[10px] text-secondary truncate">
                        Exp: {new Date(s.expires_at).toLocaleDateString()}
                      </span>
                    </div>

                    {isActive && !isExpired && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRevoke(s.id)}
                        className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        <span>Revoke</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} className="cursor-pointer">
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
}
