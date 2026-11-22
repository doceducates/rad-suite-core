'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { notify } from '@/services/notification.service';
import { cn } from '@/lib/utils';

export function LandingAlphaCta() {
  const router = useRouter();
  const [ref, isVisible] = useScrollReveal();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hospital, setHospital] = useState('');
  const [roleDesignation, setRoleDesignation] = useState('Consultant Radiologist');
  const [modality, setModality] = useState('CT / MRI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanHospital = hospital.trim();

    if (!cleanName || cleanName.length < 2) {
      notify.error('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      notify.error('Please provide a valid clinical email address.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      notify.error('Please provide a valid phone or WhatsApp number (at least 8 digits).');
      return;
    }
    if (!cleanHospital || cleanHospital.length < 2) {
      notify.error('Please enter your hospital or institution name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          hospital: cleanHospital,
          roleDesignation,
          modalitiesOfInterest: [modality],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit alpha request');

      setSubmitted(true);
      notify.success('Alpha request received! Check your inbox for confirmation.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      notify.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviteCode.trim().toUpperCase();
    if (!clean) {
      notify.error('Please enter your alpha invite code.');
      return;
    }
    router.push(`/register?invite=${encodeURIComponent(clean)}`);
  };

  return (
    <section id="alpha-access" className="py-20 md:py-32 bg-surface-container-low/40 border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
            Restricted Clinical Onboarding
          </span>
          <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-foreground mt-4">
            Join the Rad Suite Alpha Cohort.
          </h2>
          <p className="text-muted-foreground text-base mt-2">
            Limited onboarding cohorts for diagnostic radiologists and imaging departments to ensure dedicated technical and clinical support.
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-all duration-1000 ease-out',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {/* Left Form: Request Access (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Request Early Access</h3>
                <p className="text-xs text-muted-foreground">Receive your activation code via email and WhatsApp.</p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                Cohort 1 Open
              </span>
            </div>

            {submitted ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Application Submitted</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    We sent a confirmation to <span className="font-semibold text-foreground">{email}</span> from official@sehatai.org. Once approved, your invite code will arrive via email & WhatsApp.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)} className="text-xs">
                  Submit Another Application
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePreRegister} className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Full Name *</label>
                    <Input
                      required
                      placeholder="Dr. Tariq Mahmood"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-surface-container-lowest text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Clinical Email *</label>
                    <Input
                      required
                      type="email"
                      placeholder="tariq@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-surface-container-lowest text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">WhatsApp / Mobile *</label>
                    <Input
                      required
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-surface-container-lowest text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Hospital / Center *</label>
                    <Input
                      required
                      placeholder="DHQ Hospital / Diagnostic Clinic"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      className="bg-surface-container-lowest text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Clinical Role</label>
                  <select
                    value={roleDesignation}
                    onChange={(e) => setRoleDesignation(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-xs rounded-xl border border-border bg-surface-container-lowest text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Consultant Radiologist">Consultant Radiologist</option>
                    <option value="Resident Radiologist (PGR)">Resident Radiologist (PGR)</option>
                    <option value="Department Head / HOD">Department Head / HOD</option>
                    <option value="Imaging Technologist">Imaging Technologist</option>
                    <option value="Medical Officer / Fellow">Medical Officer / Fellow</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Primary Imaging Modality</label>
                  <div className="flex flex-wrap gap-2">
                    {['CT / MRI', 'Trauma Plain Films', 'Ultrasound', 'Full Multimodality'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModality(m)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer',
                          modality === m
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-surface-container-lowest text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-md gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting Application...' : 'Request Alpha Access'}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Right Card: Have an Invite Code? (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 shadow-xl space-y-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Have an Invite Code?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your invitation code to bypass the waitlist and set up your diagnostic credentials immediately.
              </p>
            </div>

            <form onSubmit={handleRedeemDirect} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono">INVITE CODE</label>
                <Input
                  placeholder="RAD-XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="bg-surface-container-lowest font-mono tracking-wider text-base uppercase text-center font-bold text-primary"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-bold gap-2">
                <span>Redeem & Activate</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Instant screen-level credential provisioning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>Zero hospital network intrusion or agents</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
