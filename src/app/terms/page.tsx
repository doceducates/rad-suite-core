import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { LegalPageLayout, LegalSection } from '@/components/legal/legal-page-layout';
import { AtlasTermsContent } from '@/components/legal/atlas-terms-content';
import { ShieldAlert, AlertTriangle, FileCheck, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms of Service | DocEducates & Rad Suite',
  description: 'Terms and Conditions governing the use of DocEducates Atlas and Rad Suite diagnostic workstation.',
};

const SECTIONS: LegalSection[] = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'clinical-scope', title: '2. Clinical Scope & Medical Disclaimer' },
  { id: 'google-integration', title: '3. Google Drive™ & Docs Integration' },
  { id: 'user-accounts', title: '4. User Accounts & Alpha Access' },
  { id: 'data-ownership', title: '5. Data Ownership & Local Storage' },
  { id: 'acceptable-use', title: '6. Acceptable Use & Workstation Security' },
  { id: 'disclaimers', title: '7. Disclaimer of Warranties' },
  { id: 'liability', title: '8. Limitation of Liability' },
  { id: 'termination', title: '9. Account Termination & Revocation' },
  { id: 'contact', title: '10. Contact Information' },
];

export default async function TermsOfServicePage() {
  const headerList = await headers();
  const host = headerList.get('host') || '';
  const isAtlas = host.toLowerCase().includes('atlas') || config.isAtlasMode;

  if (isAtlas) {
    return <AtlasTermsContent />;
  }

  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="These Terms and Conditions govern your access to and use of the Rad Suite diagnostic radiology workstation, clinical report editor, and optional Google cloud synchronization features."
      effectiveDate="October 22, 2026"
      badgeText="Terms & Conditions"
      sections={SECTIONS}
    >
      {/* 1. Acceptance */}
      <section id="acceptance" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Acceptance of Terms
        </h2>
        <p className="text-muted-foreground">
          By registering for, accessing, or using <strong>Rad Suite</strong> (developed by SehatAI, hosted at radiology.sehatai.org or running as a desktop/local workstation instance), you confirm that you have read, understood, and agree to be bound by these Terms of Service (&quot;Terms&quot;) and our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
        <p className="text-muted-foreground">
          If you are accessing Rad Suite on behalf of a hospital, imaging center, or healthcare facility, you represent that you have the authority to bind that organization to these Terms. If you do not agree to these Terms, you may not access or use the software.
        </p>
      </section>

      {/* 2. Clinical Scope & Medical Disclaimer */}
      <section id="clinical-scope" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Clinical Scope &amp; Medical Disclaimer
        </h2>
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            CRITICAL CLINICAL NOTICE — RADIOLOGIST PROFESSIONAL RESPONSIBILITY
          </div>
          <p>
            Rad Suite is a computerized radiologist workstation, DICOM viewer, and report authoring tool. While Rad Suite incorporates automated speech formatting, rule-based checklists, and optional AI-assisted dictation drafting, <strong>Rad Suite does NOT practice medicine, provide medical diagnosis, or replace clinical judgment</strong>.
          </p>
        </div>
        <p className="text-muted-foreground">
          All measurements, Hounsfield windowings, structured findings, and diagnostic impressions generated or edited within the workstation must be independently reviewed, verified, and signed off by a licensed medical practitioner (e.g., Consultant Radiologist or credentialed Resident). The attending healthcare professional retains sole legal and clinical responsibility for patient diagnosis, treatment planning, and report validity.
        </p>
      </section>

      {/* 3. Google Integration */}
      <section id="google-integration" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Google Drive™ &amp; Docs Integration
        </h2>
        <p className="text-muted-foreground">
          Rad Suite offers optional integration with Google Drive and Google Docs to enable radiologists to export, backup, or synchronize finalized radiology reports directly to their designated Google account.
        </p>
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-primary">
            <FileCheck className="w-4 h-4 shrink-0" />
            Restricted Google OAuth Scope Compliance
          </div>
          <p className="text-muted-foreground">
            Rad Suite requests the restricted OAuth scope <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">https://www.googleapis.com/auth/drive.file</code>. This scope permits Rad Suite to view, create, and modify <strong>ONLY files and folders created directly by Rad Suite</strong>. Rad Suite has zero technical ability or permission to view, read, index, or access any other existing documents, photos, or files in your Google Drive.
          </p>
        </div>
        <p className="text-muted-foreground">
          Connecting your Google Account is completely voluntary. You may revoke Rad Suite&apos;s access at any time through the Workstation Settings or via Google&apos;s security portal.
        </p>
      </section>

      {/* 4. User Accounts */}
      <section id="user-accounts" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. User Accounts &amp; Alpha Access
        </h2>
        <p className="text-muted-foreground">
          Rad Suite operates an invite-governed Alpha release. Creating an account without an authorized invite code places your account in a waitlisted state. Access to workstation modules (Worklist, DICOM Viewer, HMIS bridge, Admin consoles) is governed by role-based access control (RBAC) and explicit administrator activation.
        </p>
        <p className="text-muted-foreground">
          You are responsible for maintaining the confidentiality of your credentials. You agree to notify SehatAI immediately upon discovering any unauthorized access to your account.
        </p>
      </section>

      {/* 5. Data Ownership */}
      <section id="data-ownership" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Data Ownership &amp; Local Storage
        </h2>
        <p className="text-muted-foreground">
          You and your healthcare facility retain 100% ownership of all patient records, DICOM images, dictated transcripts, and generated radiology reports. Rad Suite stores operational data in your secure local/edge SQLite vault (<code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">radsuite.db</code>) with AES-256 encryption at rest. SehatAI does not claim any intellectual property rights or ownership over your clinical reports.
        </p>
      </section>

      {/* 6. Acceptable Use */}
      <section id="acceptable-use" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Acceptable Use &amp; Workstation Security
        </h2>
        <p className="text-muted-foreground">
          You agree not to reverse engineer, decompile, disable safety locks (such as the HMIS zero-submit safeguard), or introduce malicious code into the workstation. You agree to use Rad Suite in full compliance with all applicable health data privacy statutes, including HIPAA and local medical council standards.
        </p>
      </section>

      {/* 7. Disclaimers */}
      <section id="disclaimers" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. Disclaimer of Warranties
        </h2>
        <p className="text-muted-foreground uppercase text-xs tracking-wider font-mono">
          Rad Suite is provided &quot;as is&quot; and &quot;as available&quot;, without warranty of any kind, express or implied. To the maximum extent permitted by applicable law, SehatAI disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular clinical purpose, uninterrupted uptime, and non-infringement.
        </p>
      </section>

      {/* 8. Limitation of Liability */}
      <section id="liability" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          8. Limitation of Liability
        </h2>
        <p className="text-muted-foreground">
          Under no circumstances shall SehatAI, its founders, or contributors be liable for any indirect, incidental, consequential, special, or punitive damages, or for any loss of data, patient care delays, or diagnostic errors resulting from the use or inability to use the workstation.
        </p>
      </section>

      {/* 9. Termination */}
      <section id="termination" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          9. Account Termination &amp; Revocation
        </h2>
        <p className="text-muted-foreground">
          You may terminate your account at any time by contacting our administration or through your organization&apos;s workspace administrator. Upon termination, all locally encrypted tokens are purged, and your clinical vault remains under the custody of your facility.
        </p>
      </section>

      {/* 10. Contact */}
      <section id="contact" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          10. Contact Information
        </h2>
        <p className="text-muted-foreground">
          For legal inquiries, terms clarification, or enterprise deployment agreements, contact:
        </p>
        <div className="p-4 rounded-xl border border-border bg-card/60 text-xs space-y-1.5 font-mono">
          <div className="font-bold text-foreground font-sans text-sm">SehatAI Legal &amp; Compliance Team</div>
          <div>Application: Rad Suite Diagnostic Workstation</div>
          <div>Website: <a href="https://radiology.sehatai.org" className="text-primary hover:underline">https://radiology.sehatai.org</a></div>
          <div>Email: <a href="mailto:official@sehatai.org" className="text-primary hover:underline">official@sehatai.org</a></div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
