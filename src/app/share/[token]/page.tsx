// Layer 1 (Transport/Page): Public Sandboxed Consultant Case Share Route (<90 lines)
import { cookies } from 'next/headers';
import { ShieldX, Clock } from 'lucide-react';
import { getPublicShareMeta, verifyShareSessionProof } from '@/services/case-share.service';
import { ShareClientGate } from './share-client-gate';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Consultant Case Review | Rad Suite',
  description: 'Secure, time-limited supervisory review portal.',
};

export default async function ConsultantSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) {
    return <ExpiredOrInvalidScreen reason="missing_token" />;
  }

  const meta = await getPublicShareMeta(token);
  if (meta.status !== 'valid') {
    return <ExpiredOrInvalidScreen reason={(meta as any).reason} />;
  }

  const cookieStore = await cookies();
  const cookieProof = cookieStore.get(`rad_suite_share_${token}`)?.value;
  const isVerified = Boolean(cookieProof && verifyShareSessionProof(token, cookieProof));

  return (
    <ShareClientGate
      token={token}
      initialVerified={isVerified}
      initialProof={isVerified ? cookieProof : undefined}
      passwordHint={meta.passwordHint}
      studyPreview={meta.studyPreview}
      expiresAt={meta.expiresAt || new Date().toISOString()}
    />
  );
}

function ExpiredOrInvalidScreen({ reason }: { reason?: string }) {
  const isExpired = reason === 'expired';
  const isRevoked = reason === 'revoked';

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl border border-outline-variant/60 shadow-2xl p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          {isExpired ? <Clock className="w-8 h-8" /> : <ShieldX className="w-8 h-8" />}
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-on-surface">
            {isExpired
              ? 'Case Review Link Expired'
              : isRevoked
              ? 'Case Review Link Revoked'
              : 'Link Invalid or Not Found'}
          </h1>
          <p className="text-xs text-secondary leading-relaxed">
            {isExpired
              ? 'This supervisory consultation link has reached its expiration time limit. Please contact the reporting radiologist to request a fresh review link.'
              : isRevoked
              ? 'This review link has been explicitly deactivated by the authoring radiologist.'
              : 'The requested link does not match any active diagnostic study in our records.'}
          </p>
        </div>

        <div className="pt-4 border-t border-outline-variant/40">
          <span className="text-[10px] text-secondary font-mono tracking-wider">
            RAD SUITE CLINICAL WORKSTATION • ZERO LATERAL ACCESS
          </span>
        </div>
      </div>
    </div>
  );
}
