'use client';

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/ui/copy-button';
import { notify } from '@/services/notification.service';
import { Key, Shield, AlertCircle, Check } from 'lucide-react';

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyCreated: (newKey: any) => void;
}

const AVAILABLE_SCOPES = [
  { id: 'cases:read', label: 'cases:read', desc: 'View worklist and inspect study metadata' },
  { id: 'cases:write', label: 'cases:write', desc: 'Claim and assign cases' },
  { id: 'reports:read', label: 'reports:read', desc: 'Read draft and finalized reports' },
  { id: 'reports:draft_write', label: 'reports:draft_write', desc: 'Save structured draft findings (draft only)' },
  { id: 'pacs:query', label: 'pacs:query', desc: 'DICOM C-FIND and PACS connectivity ping' },
  { id: 'knowledge:read', label: 'knowledge:read', desc: 'Search eAnatomy atlas & Radiopaedia' },
  { id: 'system:read', label: 'system:read', desc: 'System health and volume telemetry' },
];

export function CreateKeyModal({ isOpen, onClose, onKeyCreated }: CreateKeyModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('radiologist');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('90');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'cases:read',
    'reports:read',
    'reports:draft_write',
    'knowledge:read',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      notify.error('Key name is required');
      return;
    }
    if (selectedScopes.length === 0) {
      notify.error('Select at least one scope');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/mcp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role,
          scopes: selectedScopes,
          isReadOnly,
          expiresInDays: expiresInDays === 'never' ? undefined : parseInt(expiresInDays, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to issue key');
      }

      setCreatedKeySecret(data.apiKey);
      onKeyCreated(data.keyRecord);
      notify.success('Agent API key issued successfully!');
    } catch (err: any) {
      notify.error(err.message || 'Error generating key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setCreatedKeySecret(null);
    setIsReadOnly(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <ModalTitle>Issue New Agent API Key</ModalTitle>
        </div>
      </ModalHeader>

      <ModalBody>
        {createdKeySecret ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2.5 text-warning-foreground">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Copy your API Key now</p>
                <p className="text-muted-foreground">
                  This key will never be shown again. If you lose it, you will need to revoke it and generate a new one.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Generated API Secret Key</label>
              <div className="flex items-center gap-2 p-2.5 bg-surface-container rounded-lg border border-border font-mono text-xs break-all">
                <span className="flex-1 select-all">{createdKeySecret}</span>
                <CopyButton text={createdKeySecret} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Key Identifier / Name</label>
              <Input
                placeholder="e.g., Claude Desktop Clinic PC, VPS Autonomous Scribe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Clinician Role Binding</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background p-2"
                >
                  <option value="radiologist">Consultant Radiologist</option>
                  <option value="resident">Resident / PGR</option>
                  <option value="technologist">Technologist</option>
                  <option value="service">Automated Microservice</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Key Validity / Expiration</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background p-2"
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Recommended)</option>
                  <option value="365">1 Year</option>
                  <option value="never">Never Expire</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-lg border border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Read-Only Mode</p>
                <p className="text-[11px] text-muted-foreground">Disables draft saving and case claiming for this agent.</p>
              </div>
              <input
                type="checkbox"
                checked={isReadOnly}
                onChange={(e) => setIsReadOnly(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Authorized Scopes</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((sc) => {
                  const checked = selectedScopes.includes(sc.id);
                  return (
                    <div
                      key={sc.id}
                      onClick={() => toggleScope(sc.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors text-xs flex items-start gap-2 ${
                        checked ? 'bg-primary/10 border-primary/50' : 'bg-surface-container-low border-border/60 hover:bg-surface-container'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center text-[10px] text-white shrink-0 ${checked ? 'bg-primary' : 'border border-muted'}`}>
                        {checked && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <div>
                        <div className="font-mono font-medium">{sc.label}</div>
                        <div className="text-[10px] text-muted-foreground">{sc.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {createdKeySecret ? (
          <Button size="sm" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Generating...' : 'Issue Key'}
            </Button>
          </div>
        )}
      </ModalFooter>
    </Modal>
  );
}
