'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';

export function ClinicianLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.data?.status === 'waitlisted' || data.data?.status === 'pending_invite') {
        router.push('/pending-access');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Clinician Sign In"
      subtitle="Enter your institutional email or HMIS portal username to access your workstation."
    >
      <Card className="border-outline-variant/80 bg-surface-container shadow-md">
        <CardContent className="p-6 space-y-4">
          <GoogleSignInButton intent="login" text="Sign in with Google" />

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/60" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-surface-container px-2 text-secondary font-medium tracking-wider">
                Or continue with credentials
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">Email or Username</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
                <Mail className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-on-surface">Password</label>
                <span className="text-[10px] text-secondary">Case-sensitive</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  required
                />
                <Lock className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

            <Button type="submit" isLoading={loading} className="w-full font-semibold shadow-xs">
              <span>Sign In to Workstation</span>
            </Button>

            <div className="pt-2 text-center space-y-2">
              <div className="text-xs text-secondary">
                New clinician or trainee?{' '}
                <Link href="/register" className="text-primary font-semibold hover:underline">
                  Register Account
                </Link>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Don&apos;t have an invite code?{' '}
                <Link href="/#pre-register" className="text-secondary hover:text-on-surface underline">
                  Request Alpha Access
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthSplitLayout>
  );
}
