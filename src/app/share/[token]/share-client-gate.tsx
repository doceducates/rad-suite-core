'use client';

// Layer 4 (Presentation): Client Gate Transition (<60 lines)
import React, { useState } from 'react';
import { ConsultantPasswordChallenge } from '@/components/share/consultant-password-challenge';
import { ConsultantReviewPortal } from '@/components/share/consultant-review-portal';

interface ShareClientGateProps {
  token: string;
  initialVerified: boolean;
  initialProof?: string;
  passwordHint?: string;
  studyPreview?: {
    modality: string;
    scanType: string;
    bodyPart?: string;
  };
  expiresAt: string;
}

export function ShareClientGate({
  token,
  initialVerified,
  initialProof,
  passwordHint,
  studyPreview,
  expiresAt,
}: ShareClientGateProps) {
  const [verified, setVerified] = useState(initialVerified);
  const [sessionProof, setSessionProof] = useState<string | undefined>(initialProof);

  if (verified) {
    return <ConsultantReviewPortal token={token} initialProof={sessionProof} />;
  }

  return (
    <ConsultantPasswordChallenge
      token={token}
      passwordHint={passwordHint}
      studyPreview={studyPreview}
      expiresAt={expiresAt}
      onVerified={(proof) => {
        setSessionProof(proof);
        setVerified(true);
      }}
    />
  );
}
