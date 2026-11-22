'use client';

import React from 'react';
import { LegalPageLayout, LegalSection } from './legal-page-layout';
import { AlertTriangle, BookOpen, ShieldCheck, FileCheck } from 'lucide-react';

const SECTIONS: LegalSection[] = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'educational-disclaimer', title: '2. Educational Scope & Medical Disclaimer' },
  { id: 'student-accounts', title: '3. Student Accounts & Fair Use' },
  { id: 'google-auth', title: '4. Google Single Sign-On (SSO)' },
  { id: 'intellectual-property', title: '5. Intellectual Property & Nomenclature' },
  { id: 'liability', title: '6. Limitation of Liability' },
  { id: 'termination', title: '7. Account Termination' },
  { id: 'contact', title: '8. Contact Information' },
];

export function AtlasTermsContent() {
  return (
    <LegalPageLayout
      title="DocEducates Atlas Terms of Service"
      subtitle="Terms and Conditions governing student access, educational use, and interactive study tools on DocEducates Atlas."
      effectiveDate="November 9, 2026"
      badgeText="Educational Terms & Fair Use"
      sections={SECTIONS}
    >
      {/* 1. Acceptance */}
      <section id="acceptance" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Acceptance of Terms
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          By registering for, accessing, or using <strong>DocEducates Atlas</strong> (hosted at{' '}
          <a href="https://atlas.doceducates.com" className="text-emerald-500 hover:underline">
            atlas.doceducates.com
          </a>
          ), you agree to be bound by these Terms of Service and our{' '}
          <a href="/privacy" className="text-emerald-500 hover:underline">
            Privacy Policy
          </a>
          . If you do not agree to these terms, please do not use the platform.
        </p>
      </section>

      {/* 2. Medical Disclaimer */}
      <section id="educational-disclaimer" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Educational Scope &amp; Medical Disclaimer
        </h2>
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            EDUCATIONAL USE ONLY — NOT FOR CLINICAL DIAGNOSIS
          </div>
          <p>
            DocEducates Atlas is an academic and pedagogical tool created to assist medical students, residents, and healthcare professionals in learning human anatomy. <strong>DocEducates Atlas is NOT a clinical medical device and must never be used for primary diagnostic decision-making, surgical planning, or real-time patient care.</strong>
          </p>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The cross-sectional reference images, pinpoints, and self-quizzes represent generalized anatomical models and normative imaging. They do not substitute for personalized medical diagnosis by licensed physicians.
        </p>
      </section>

      {/* 3. Student Accounts */}
      <section id="student-accounts" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Student Accounts &amp; Fair Use
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You are responsible for maintaining the confidentiality of your login credentials. You agree to use the platform in good faith for personal educational advancement and not to systematically scrape, extract, or redistribute the imaging slices or structure database.
        </p>
      </section>

      {/* 4. Google Single Sign-On */}
      <section id="google-auth" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. Google Single Sign-On (SSO)
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          DocEducates Atlas provides Google Single Sign-On for streamlined student authentication. By using Google Sign-In, you authorize DocEducates Atlas to verify your identity using your standard Google account details in compliance with Google API User Data Policies.
        </p>
      </section>

      {/* 5. Intellectual Property */}
      <section id="intellectual-property" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Intellectual Property &amp; Nomenclature
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          All platform interface designs, 3D spatial loaders, self-quiz software, and curated anatomical coordinate datasets are the intellectual property of DocEducates Academy. Anatomical nomenclature is aligned with international <em>Terminologia Anatomica</em> standards.
        </p>
      </section>

      {/* 6. Limitation of Liability */}
      <section id="liability" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Limitation of Liability
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          DocEducates Atlas is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. Under no circumstances shall DocEducates Academy or its contributors be liable for any indirect, incidental, or consequential damages arising from the use of this educational service.
        </p>
      </section>

      {/* 7. Termination */}
      <section id="termination" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. Account Termination
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You may close your account at any time. DocEducates Academy reserves the right to suspend or terminate accounts that engage in automated abuse or violations of fair academic use.
        </p>
      </section>

      {/* 8. Contact */}
      <section id="contact" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          8. Contact Information
        </h2>
        <div className="p-4 rounded-xl border border-border/60 bg-card text-xs space-y-1.5">
          <p className="font-semibold text-foreground">DocEducates Academy &bull; Student Support</p>
          <p>Email: <a href="mailto:official@doceducates.com" className="text-emerald-500 hover:underline">official@doceducates.com</a></p>
          <p>Website: <a href="https://atlas.doceducates.com" className="text-emerald-500 hover:underline">https://atlas.doceducates.com</a></p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
