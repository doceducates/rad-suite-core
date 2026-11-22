'use client';

// Layer 4 (Presentation): Consultant Password / PIN Challenge Screen (<180 lines)
import React, { useState } from 'react';
import { ShieldCheck, Lock, Key, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ConsultantPasswordChallengeProps {
  token: string;
  passwordHint?: string;
  studyPreview?: {
    modality: string;
    scanType: string;
    bodyPart?: string;
  };
  expiresAt: string;
  onVerified: (proof: string) => void;
}

export function ConsultantPasswordChallenge({
  token,
  passwordHint,
  studyPreview,
  expiresAt,
  onVerified,
}: ConsultantPasswordChallengeProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoursRemaining = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / (3600 * 1000)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/shares/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Incorrect security PIN or password');
        return;
      }

      onVerified(data.sessionProof);
    } catch (err: any) {
      setError(err?.message || 'Verification request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl border border-outline-variant/60 shadow-2xl p-7 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1 border border-emerald-500/20 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface">
            Rad Suite — Consultant Case Access
          </h1>
          <p className="text-xs text-secondary max-w-xs mx-auto">
            A peer radiologist has shared a diagnostic examination for your supervisory clinical review.
          </p>
        </div>

        {/* Study Metadata Preview (No PHI) */}
        {studyPreview && (
          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider block">
                Study Modality
              </span>
              <span className="font-bold text-on-surface text-sm">
                {studyPreview.modality} • {studyPreview.scanType}
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider block flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                <span>Validity</span>
              </span>
              <Badge variant="success" className="font-mono text-[10px]">
                {hoursRemaining}h remaining
              </Badge>
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-secondary flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-primary" />
              <span>Enter Security PIN / Password</span>
            </label>
            <Input
              type="text"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="e.g. RAD-482"
              className="text-center font-mono font-bold text-lg tracking-widest py-3 uppercase rounded-xl"
            />
            {passwordHint && (
              <p className="text-[11px] text-secondary italic">
                Hint: {passwordHint}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !pin.trim()}
            variant="primary"
            className="w-full py-2.5 font-bold gap-2 text-sm shadow-md cursor-pointer rounded-xl"
          >
            <span>{loading ? 'Verifying Credentials...' : 'Unlock & Review Case'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Sandbox Notice */}
        <div className="pt-2 border-t border-outline-variant/40 text-center">
          <p className="text-[10px] text-secondary">
            🔒 End-to-end encrypted medical review link. Zero lateral database access. Protected under hospital IT audit policies.
          </p>
        </div>
      </div>
    </div>
  );
}
