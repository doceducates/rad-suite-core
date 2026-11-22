'use client';

import React, { useState } from 'react';
import { KeyRound, Plus, Trash2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface KnownWifiNetwork {
  ssid: string;
  password?: string;
}

interface ClinicWifiVaultProps {
  networks: KnownWifiNetwork[];
  onChange: (networks: KnownWifiNetwork[]) => void;
  disabled?: boolean;
}

const COMMON_PRESETS = [
  'Radiology Reporting Room',
  'Doctor Lounge',
  'Hospital-Staff',
  'HMIS-WiFi',
];

export function ClinicWifiVault({
  networks,
  onChange,
  disabled = false,
}: ClinicWifiVaultProps) {
  const [newSsid, setNewSsid] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Record<number, boolean>>({});

  const toggleReveal = (index: number) => {
    setRevealedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAdd = () => {
    const cleanSsid = newSsid.trim();
    if (!cleanSsid) return;

    // Check if network already exists
    const existingIdx = networks.findIndex(
      (n) => n.ssid.toLowerCase() === cleanSsid.toLowerCase()
    );

    let updated: KnownWifiNetwork[];
    if (existingIdx >= 0) {
      updated = [...networks];
      updated[existingIdx] = { ssid: cleanSsid, password: newPassword.trim() };
    } else {
      updated = [...networks, { ssid: cleanSsid, password: newPassword.trim() }];
    }

    onChange(updated);
    setNewSsid('');
    setNewPassword('');
    setShowNewPassword(false);
  };

  const handleRemove = (index: number) => {
    const updated = networks.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-sky-500" />
          <span className="font-semibold text-foreground text-[11px]">
            Known Wi-Fi Profiles &amp; Auto-Connect Vault
          </span>
          <Badge
            variant="outline"
            className={
              networks.length > 0
                ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 text-[10px] py-0 px-1.5'
                : 'text-muted-foreground text-[10px] py-0 px-1.5'
            }
          >
            {networks.length} {networks.length === 1 ? 'profile' : 'profiles'}
          </Badge>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Credentials saved here are synced to the node. If the hospital Wi-Fi drops or someone forgets the password, the edge watchdog silently re-connects to known networks in Session 0 without screen popups.
      </p>

      {/* Preset Suggestions */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            Quick presets:
          </span>
          {COMMON_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setNewSsid(preset)}
              className="text-[10px] px-2 py-0.5 rounded-md border border-border/70 bg-muted/20 hover:bg-muted/40 text-foreground transition-colors cursor-pointer"
            >
              + {preset}
            </button>
          ))}
        </div>
      )}

      {/* Networks List */}
      <div className="space-y-1.5">
        {networks.length === 0 ? (
          <div className="p-2.5 rounded-lg border border-dashed border-border/80 bg-background/50 text-[11px] text-muted-foreground text-center">
            No known Wi-Fi profiles configured yet. Add &quot;Radiology Reporting Room&quot; below.
          </div>
        ) : (
          networks.map((net, idx) => {
            const isRevealed = Boolean(revealedIndices[idx]);
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-background text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-foreground truncate">{net.ssid}</span>
                  <span className="text-muted-foreground text-[10px] font-mono">
                    {isRevealed ? (net.password || '(no password)') : '••••••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleReveal(idx)}
                    title={isRevealed ? 'Hide password' : 'Show password'}
                    className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      title="Remove network"
                      className="p-1 text-muted-foreground hover:text-red-500 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Network Input */}
      {!disabled && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
          <input
            type="text"
            placeholder="SSID / Network Name"
            value={newSsid}
            onChange={(e) => setNewSsid(e.target.value)}
            className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-sky-500"
          />
          <div className="sm:col-span-2 relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Wi-Fi Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 pr-8 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((p) => !p)}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!newSsid.trim()}
            className="sm:col-span-1 h-8 text-xs gap-1 bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </Button>
        </div>
      )}
    </div>
  );
}
