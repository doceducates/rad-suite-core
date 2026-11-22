'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AtlasAuthSplitLayout } from './atlas-auth-split-layout';
import { GoogleSignInButton } from './google-sign-in-button';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, GraduationCap, Compass, ShieldAlert } from 'lucide-react';

const STUDENT_TITLES = [
  'Medical Student (MBBS / MD / DO)',
  'Radiology Resident / Registrar',
  'Surgical Trainee / Resident',
  'Allied Health / Sonography Trainee',
  'Anatomy Educator / Faculty',
  'Healthcare Professional / Other',
];

export function AtlasRegisterView() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState(STUDENT_TITLES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setError('Full name must be at least 2 characters');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address');
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
          role: 'student',
          title,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AtlasAuthSplitLayout
      title="Create Student Account"
      subtitle="Join DocEducates Atlas to track anatomy study streaks, quiz scores, and bookmark high-yield slices."
    >
      <Card className="border-outline-variant/80 bg-surface-container shadow-md">
        <CardContent className="p-6 space-y-4">
          <GoogleSignInButton intent="register" text="Register with Google" redirectUrl="/dashboard" />

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/60" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-surface-container px-2 text-secondary font-medium tracking-wider">
                Or create account with email
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Full Name</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. Dr. Ayesha Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  required
                />
                <UserIcon className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Email Address</label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
                <Mail className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface">Academic / Clinical Level</label>
              <div className="relative">
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-input bg-background text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                >
                  {STUDENT_TITLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <GraduationCap className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-on-surface">Password</label>
                <span className="text-[10px] text-secondary">Min 6 characters</span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Choose a secure password"
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

            <div className="text-[11px] text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                Privacy Policy
              </Link>.
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full font-semibold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <span>Create Free Account</span>
            </Button>

            <div className="pt-2 text-center space-y-2">
              <div className="text-xs text-secondary">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                  Sign In
                </Link>
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <Link href="/atlas" className="inline-flex items-center gap-1.5 text-secondary hover:text-foreground">
                  <Compass className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Explore as Guest in Free Atlas &rarr;</span>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </AtlasAuthSplitLayout>
  );
}
