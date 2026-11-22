'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Lock, Sparkles, Key, CheckCircle2, ShieldAlert, Mail, LogOut, ArrowRight } from 'lucide-react';

export default function PendingAccessPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUserName(data.user.name || '');
          if (data.user.status === 'active') {
            const isAtlas = typeof window !== 'undefined' && window.location.hostname.includes('atlas');
            router.replace(isAtlas || data.user.role === 'student' ? '/dashboard' : '/worklist');
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/redeem-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to redeem invite code');
      }

      const isAtlas = typeof window !== 'undefined' && window.location.hostname.includes('atlas');
      setSuccessMsg(isAtlas ? 'Student account activated! Launching Atlas...' : 'Account activated successfully! Launching workstation...');
      setTimeout(() => {
        router.push(isAtlas ? '/dashboard' : '/worklist');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error unlocking workstation');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 bg-background text-on-surface transition-colors relative">
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs gap-1.5 text-secondary hover:text-on-surface">
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface font-headline">
            Early Access Request Under Review
          </h1>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            {userName ? `Welcome, Dr. ${userName}. ` : ''}Your workstation account is currently queued for the Clinical Alpha Pilot.
          </p>
        </div>

        <Card className="border-outline-variant/80 bg-surface-container shadow-xl">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Enter Invite Code Section */}
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-primary" />
                  <span>Have an Alpha Code? Activate Immediately</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. RAD-ALPHA-2026"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-wider text-sm bg-surface"
                    required
                  />
                  <Button type="submit" isLoading={loading} className="shrink-0 font-semibold shadow-xs">
                    <span>Unlock Workstation</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
                <p className="text-[11px] text-secondary">
                  If you have a hospital invitation code, enter it above to unlock your workstation immediately without waiting for admin review.
                </p>
              </div>
            </form>

            {/* Support & Contact Card */}
            <div className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/60 space-y-2.5 text-xs text-secondary">
              <div className="font-semibold text-on-surface text-xs">Awaiting Your Invite Code?</div>
              <p className="text-[11px] leading-relaxed">
                Our clinical operations team reviews submissions in batches to preserve server bandwidth and guarantee HIPAA data isolation during the alpha preview.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="mailto:official@sehatai.org?subject=Rad Suite Alpha Access Expedite Request"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs font-medium"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact: official@sehatai.org</span>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
