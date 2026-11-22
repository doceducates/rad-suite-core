'use client';

import React from 'react';
import { LegalPageLayout, LegalSection } from './legal-page-layout';
import { ShieldCheck, Lock, Trash2, Mail, CheckCircle2 } from 'lucide-react';

const SECTIONS: LegalSection[] = [
  { id: 'overview', title: '1. Overview & Educational Scope' },
  { id: 'information-collected', title: '2. Information We Collect' },
  { id: 'google-user-data', title: '3. Google OAuth & Limited Use' },
  { id: 'how-we-use-data', title: '4. How We Use Learning Data' },
  { id: 'data-storage-security', title: '5. Data Storage & Security' },
  { id: 'data-sharing', title: '6. Zero Sale of Personal Data' },
  { id: 'retention-deletion', title: '7. User Rights & Account Deletion' },
  { id: 'contact', title: '8. Contact & Academy Support' },
];

export function AtlasPrivacyContent() {
  return (
    <LegalPageLayout
      title="DocEducates Atlas Privacy Policy"
      subtitle="How DocEducates Atlas collects, uses, and protects student learning information and Google OAuth data in accordance with international privacy regulations and the Google API Services User Data Policy."
      effectiveDate="November 9, 2026"
      badgeText="Educational Privacy & Google Compliance"
      sections={SECTIONS}
    >
      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Overview &amp; Educational Scope
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Welcome to <strong>DocEducates Atlas</strong> (accessible at <a href="https://atlas.doceducates.com" className="text-emerald-500 hover:underline">atlas.doceducates.com</a>), an open-access medical educational platform dedicated to cross-sectional human anatomy, radiologic correlation, and board-exam self-quizzing.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          DocEducates Atlas is strictly designed for educational and pedagogical purposes. This Privacy Policy informs learners, medical students, trainees, and educators about how we collect, store, and safeguard your personal information when you access our interactive atlas or use Google Single Sign-On (SSO).
        </p>
      </section>

      {/* 2. Information Collected */}
      <section id="information-collected" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Information We Collect
        </h2>
        <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
          <p>We collect only the minimum necessary data required to deliver educational services:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong>Account Profile:</strong> Your full name, email address, password hash (salted bcrypt), and academic level (e.g. Medical Student, Resident, Educator).</li>
            <li><strong>Educational Progress:</strong> Anonymized quiz attempts, recall accuracy scores, study streak counters, and saved slice bookmarks.</li>
            <li><strong>Authentication Data:</strong> Secure HttpOnly session tokens and cryptographic cookies to keep you signed in across devices.</li>
            <li><strong>Google Profile Data:</strong> When signing in via Google, we receive your verified Google email address, display name, and avatar URL. We do not access contacts, drives, photos, or private files.</li>
          </ul>
        </div>
      </section>

      {/* 3. Google API User Data & Limited Use */}
      <section id="google-user-data" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Google API User Data &amp; Limited Use Disclosure
        </h2>

        <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 text-foreground space-y-3">
          <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            Google API Services User Data Policy Compliance
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            DocEducates Atlas&apos;s use and transfer to any other app of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
            <li>We request only standard identity scopes: <code className="bg-muted px-1 py-0.5 rounded font-mono">openid</code>, <code className="bg-muted px-1 py-0.5 rounded font-mono">email</code>, and <code className="bg-muted px-1 py-0.5 rounded font-mono">profile</code>.</li>
            <li>We do NOT request access to Google Drive, Gmail, or sensitive cloud data on DocEducates Atlas.</li>
            <li>We do NOT sell Google user data to data brokers, advertisers, or third parties under any circumstances.</li>
          </ul>
        </div>
      </section>

      {/* 4. How We Use Data */}
      <section id="how-we-use-data" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. How We Use Learning Data
        </h2>
        <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
          <p>Your information is used strictly to:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Authenticate your account and maintain active study sessions.</li>
            <li>Save your customized pinned structures, notes, and quiz mastery level.</li>
            <li>Generate personalized study streaks and spaced repetition recommendations.</li>
            <li>Deliver platform security updates and account management notifications.</li>
          </ul>
        </div>
      </section>

      {/* 5. Storage & Security */}
      <section id="data-storage-security" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Data Storage &amp; Encryption Standards
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          All data in transit is protected by TLS 1.3 encryption with Perfect Forward Secrecy. Student accounts are stored in isolated encrypted database vaults with strict role-based access control. Sensitive authentication tokens are stored in HttpOnly, SameSite=Lax encrypted cookies.
        </p>
      </section>

      {/* 6. Zero Sale */}
      <section id="data-sharing" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Zero Sale of Personal Data
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We maintain an absolute <strong>zero-sale policy</strong>. We never monetize, rent, or distribute student profiles, quiz scores, or academic history to third-party advertising networks or commercial aggregators.
        </p>
      </section>

      {/* 7. Retention & Deletion */}
      <section id="retention-deletion" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. User Rights &amp; One-Click Deletion
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You retain complete ownership of your educational data. You may request full deletion of your DocEducates Atlas account, study history, and associated tokens at any time by emailing{' '}
          <a href="mailto:official@doceducates.com" className="text-emerald-500 hover:underline font-semibold">
            official@doceducates.com
          </a>
          . All personal records are permanently purged within 7 business days of verification.
        </p>
      </section>

      {/* 8. Contact */}
      <section id="contact" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          8. Contact &amp; Academy Support
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          For privacy inquiries, data subject rights, or security disclosures:
        </p>
        <div className="p-4 rounded-xl border border-border/60 bg-card text-xs space-y-1.5">
          <p className="font-semibold text-foreground">DocEducates Academy &bull; Data Governance Office</p>
          <p>Email: <a href="mailto:official@doceducates.com" className="text-emerald-500 hover:underline">official@doceducates.com</a></p>
          <p>Website: <a href="https://atlas.doceducates.com" className="text-emerald-500 hover:underline">https://atlas.doceducates.com</a></p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
