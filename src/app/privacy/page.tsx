import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { LegalPageLayout, LegalSection } from '@/components/legal/legal-page-layout';
import { AtlasPrivacyContent } from '@/components/legal/atlas-privacy-content';
import { ShieldCheck, Lock, Key, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy | DocEducates & Rad Suite',
  description: 'Privacy Policy and Google API Services User Data Policy compliance for DocEducates Atlas and Rad Suite.',
};

const SECTIONS: LegalSection[] = [
  { id: 'overview', title: '1. Overview & Scope' },
  { id: 'information-collected', title: '2. Information We Collect' },
  { id: 'google-user-data', title: '3. Google API User Data & Limited Use' },
  { id: 'how-we-use-data', title: '4. How We Use Clinical & User Data' },
  { id: 'data-storage-security', title: '5. Data Storage & HIPAA Encryption' },
  { id: 'data-sharing', title: '6. Zero Sale & Third-Party Sharing' },
  { id: 'retention-deletion', title: '7. User Rights & Data Deletion' },
  { id: 'security-measures', title: '8. Security Measures & Audit Logs' },
  { id: 'contact', title: '9. Contact & Data Protection Officer' },
];

export default async function PrivacyPolicyPage() {
  const headerList = await headers();
  const host = headerList.get('host') || '';
  const isAtlas = host.toLowerCase().includes('atlas') || config.isAtlasMode;

  if (isAtlas) {
    return <AtlasPrivacyContent />;
  }

  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="How Rad Suite collects, protects, and handles user information, clinical telemetry, and Google OAuth user data in accordance with HIPAA standards and the Google API Services User Data Policy."
      effectiveDate="October 22, 2026"
      badgeText="Privacy & Google Compliance"
      sections={SECTIONS}
    >
      {/* 1. Overview */}
      <section id="overview" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          1. Overview &amp; Scope
        </h2>
        <p className="text-muted-foreground">
          At <strong>Rad Suite</strong> (developed by SehatAI, accessible via <a href="https://radiology.sehatai.org" className="text-primary hover:underline">radiology.sehatai.org</a>), we hold patient confidentiality, Protected Health Information (PHI), and clinician data privacy to the highest ethical and statutory standards.
        </p>
        <p className="text-muted-foreground">
          This Privacy Policy describes our practices regarding the collection, use, storage, and protection of information when you use our diagnostic radiology workstation, DICOM viewer, local AI dictation services, and optional Google cloud synchronization tools.
        </p>
      </section>

      {/* 2. Information Collected */}
      <section id="information-collected" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          2. Information We Collect
        </h2>
        <div className="space-y-3 text-muted-foreground">
          <p>We collect and process the following categories of information strictly to provide clinical workstation functionality:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong>Clinician Account Details:</strong> Full name, medical title (e.g. Consultant Radiologist, Resident), hospital or clinic affiliation, license number, institutional email address, phone number (for alpha access notifications), and password hash (bcrypt).</li>
            <li><strong>Clinical Reporting Data:</strong> Requisition accessions, study descriptions, modality metadata, report drafts, final structured findings, and digital sign-off stamps. This data resides primarily in your encrypted local/edge SQLite vault.</li>
            <li><strong>Authentication &amp; Session Tokens:</strong> Secure HttpOnly session tokens and cryptographic hashes stored in compliance with enterprise security standards.</li>
            <li><strong>Google Account Information (Optional):</strong> When you connect your Google account, we collect your Google email address, profile identifier, and OAuth 2.0 access and refresh tokens.</li>
          </ul>
        </div>
      </section>

      {/* 3. Google API User Data & Limited Use */}
      <section id="google-user-data" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          3. Google API User Data &amp; Limited Use Disclosure
        </h2>

        {/* Callout box for Google Verification */}
        <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 text-foreground space-y-3">
          <div className="flex items-center gap-2 font-bold text-primary text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            Google API Services User Data Policy Compliance
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Rad Suite&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-border/60 bg-card/80 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                No Generalized AI Training
              </div>
              <p className="text-muted-foreground text-[11px]">
                Google user data is NEVER used to train, retrain, or improve generalized machine learning or artificial intelligence models.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-card/80 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Zero Advertising or Sale
              </div>
              <p className="text-muted-foreground text-[11px]">
                Google user data is NEVER sold, rented, or transferred to third parties, data brokers, or advertising platforms.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-muted-foreground">
          <h3 className="text-sm font-bold text-foreground">Requested OAuth Scopes and Purpose</h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl border border-border bg-card/40">
              <span className="font-mono text-primary font-bold">https://www.googleapis.com/auth/drive.file</span>
              <p className="mt-1 text-muted-foreground">
                <strong>Purpose:</strong> Restricted scope used solely to create, update, and manage Google Docs and folders created directly by Rad Suite (under the hierarchy <code>Rad Suite Reports / YYYY / MM / MODALITY</code>). Rad Suite <strong>CANNOT</strong> view, read, index, modify, or delete any other user documents or files in your Google Drive.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card/40">
              <span className="font-mono text-primary font-bold">https://www.googleapis.com/auth/userinfo.email</span>
              <p className="mt-1 text-muted-foreground">
                <strong>Purpose:</strong> Used to display the connected Google email address in Workstation Settings to prevent clinician identity confusion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How We Use Data */}
      <section id="how-we-use-data" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          4. How We Use Clinical &amp; User Data
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-xs">
          <li><strong>Workstation Operation:</strong> Loading DICOM studies, rendering multi-slice CT/MRI helical series, enabling Hounsfield windowing, and providing local dictation structuring.</li>
          <li><strong>Report Archival &amp; Backup:</strong> Exporting clinician-signed reports to local disk, hospital PACS archives, or the clinician&apos;s connected Google Drive folder upon request.</li>
          <li><strong>Security &amp; Audit Logs:</strong> Enforcing tamper-evident audit logging for access to Protected Health Information (PHI) in compliance with hospital standards.</li>
        </ul>
      </section>

      {/* 5. Data Storage & HIPAA Encryption */}
      <section id="data-storage-security" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          5. Data Storage &amp; HIPAA Encryption
        </h2>
        <p className="text-muted-foreground">
          Rad Suite utilizes a privacy-first, edge-isolated architecture:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Lock className="w-4 h-4 text-primary" />
              AES-256-GCM at Rest
            </div>
            <p className="text-muted-foreground text-[11px]">
              Sensitive tokens (including Google OAuth refresh tokens and HMIS credentials) are encrypted using authenticated AES-256-GCM.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Key className="w-4 h-4 text-emerald-500" />
              TLS 1.3 in Transit
            </div>
            <p className="text-muted-foreground text-[11px]">
              All communication between your browser, edge nodes, and Google API servers is secured with TLS 1.3 encryption.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Local-First Vault
            </div>
            <p className="text-muted-foreground text-[11px]">
              Case reports and voice transcripts remain in the hospital&apos;s local workstation database, immune to public cloud breaches.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Zero Sale */}
      <section id="data-sharing" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          6. Zero Sale &amp; Third-Party Sharing
        </h2>
        <p className="text-muted-foreground">
          <strong>We never sell, rent, monetize, or trade clinician or patient data to any third party.</strong> Data is never shared with third parties except:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li>To Google Drive APIs strictly upon your explicit command to synchronize or export a clinical report.</li>
          <li>To the Punjab HMIS portal strictly when you initiate an authorized draft save for a hospitalized patient.</li>
          <li>When mandated by valid legal subpoenas or healthcare regulatory court orders.</li>
        </ul>
      </section>

      {/* 7. Retention & Deletion */}
      <section id="retention-deletion" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          7. User Rights, Revocation &amp; Data Deletion
        </h2>
        <p className="text-muted-foreground">
          You maintain complete sovereignty over your data and third-party integrations:
        </p>
        <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2 text-xs">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 text-rose-500" />
            How to Disconnect Google Drive &amp; Purge Stored Tokens
          </div>
          <p className="text-muted-foreground">
            You can revoke Rad Suite&apos;s access to your Google account at any time through either of the following methods:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li><strong>Inside Rad Suite:</strong> Open <em>Settings &rarr; Clinician Profile &rarr; Google Docs &amp; Drive Sync</em> and click <strong>&quot;Disconnect Account&quot;</strong>. This instantly purges all stored access and refresh tokens from the workstation database.</li>
            <li><strong>Via Google Security Settings:</strong> Visit <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">myaccount.google.com/permissions</a> and remove access for Rad Suite.</li>
          </ol>
        </div>
        <p className="text-muted-foreground text-xs">
          To request full deletion of your clinician profile or workstation account, email us at <a href="mailto:official@sehatai.org" className="text-primary hover:underline">official@sehatai.org</a>. Requests are completed within 72 hours.
        </p>
      </section>

      {/* 8. Security Measures */}
      <section id="security-measures" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          8. Security Measures &amp; Audit Logs
        </h2>
        <p className="text-muted-foreground">
          Every action involving report synchronization, patient record access, or OAuth credential modification creates an immutable audit entry recording user ID, action timestamp, IP address, and outcome. These logs are accessible solely to authorized system administrators.
        </p>
      </section>

      {/* 9. Contact */}
      <section id="contact" className="scroll-mt-24 space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2">
          9. Contact &amp; Data Protection Officer
        </h2>
        <p className="text-muted-foreground">
          For any privacy questions, Google OAuth verification inquiries, or data protection requests:
        </p>
        <div className="p-4 rounded-xl border border-border bg-card/60 text-xs space-y-1.5 font-mono">
          <div className="font-bold text-foreground font-sans text-sm">SehatAI Privacy &amp; Data Protection Office</div>
          <div>Product: Rad Suite (Diagnostic Radiology Workstation)</div>
          <div>Web: <a href="https://radiology.sehatai.org" className="text-primary hover:underline">https://radiology.sehatai.org</a></div>
          <div>Email: <a href="mailto:official@sehatai.org" className="text-primary hover:underline">official@sehatai.org</a></div>
          <div>Supervising Radiologist: Department Head / Chief Radiologist</div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
