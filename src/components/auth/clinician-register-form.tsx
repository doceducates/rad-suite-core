'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Eye, EyeOff, Key, ShieldAlert } from 'lucide-react';

function ClinicianRegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get('invite') || searchParams.get('code') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'consultant' | 'pgr' | 'technologist'>('consultant');
  const [hospital, setHospital] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteParam.toUpperCase());
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase());
    }
  }, [inviteParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = inviteCode.trim().toUpperCase();

    if (!cleanName || cleanName.length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid institutional email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          role,
          hospital: hospital.trim() || undefined,
          phone: phone.trim() || undefined,
          licenseNo: licenseNo.trim() || undefined,
          inviteCode: cleanCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.data?.status === 'waitlisted') {
        router.push('/pending-access');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-outline-variant/80 bg-surface-container shadow-md">
      <CardContent className="p-6 space-y-4">
        <GoogleSignInButton
          intent="register"
          inviteCode={inviteCode}
          text="Continue with Google"
        />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/60" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-surface-container px-2 text-secondary font-medium tracking-wider">
              Or register with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Full Name</label>
              <Input
                type="text"
                placeholder="Dr. Muhammad Ali"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Work Email</label>
              <Input
                type="email"
                placeholder="ali@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Clinical Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="consultant">Consultant Radiologist</option>
                <option value="pgr">Resident Radiologist (PGR)</option>
                <option value="technologist">Medical Imaging Technologist</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">PMDC / License No.</label>
              <Input
                type="text"
                placeholder="e.g. 12345-P"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Hospital / Clinic</label>
              <Input
                type="text"
                placeholder="e.g. Mayo Hospital Lahore"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">WhatsApp / Mobile</label>
              <Input
                type="tel"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-on-surface">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" />
                <span>Alpha Invite Code</span>
              </label>
              <span className="text-[10px] text-secondary font-mono">Optional</span>
            </div>
            <Input
              type="text"
              placeholder="e.g. RAD-ALPHA-2026 or RAD-ABC-123"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="font-mono uppercase tracking-wider text-xs bg-surface"
            />
            <p className="text-[11px] text-secondary leading-tight">
              Have an alpha code? Enter it to activate immediately. If omitted, your application will be placed on our Early Access Review Queue.
            </p>
          </div>

          <Button type="submit" isLoading={loading} className="w-full font-semibold shadow-xs">
            <span>{inviteCode ? 'Activate & Launch Workstation' : 'Request Early Access / Sign Up'}</span>
          </Button>

          <div className="text-center pt-2">
            <span className="text-xs text-secondary">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ClinicianRegisterForm() {
  return (
    <AuthSplitLayout
      title="Request Early Access"
      subtitle="Join the Radiology Workstation Alpha."
    >
      <Suspense fallback={<div className="text-xs text-secondary text-center p-8">Loading form...</div>}>
        <ClinicianRegisterInner />
      </Suspense>
    </AuthSplitLayout>
  );
}
