import React from 'react';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/services/auth.service';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingDicomShowcase } from '@/components/landing/landing-dicom-showcase';
import { LandingFeaturesBento } from '@/components/landing/landing-features-bento';
import { LandingComparison } from '@/components/landing/landing-comparison';
import { LandingAlphaCta } from '@/components/landing/landing-alpha-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rad Suite — Advanced Radiology Reporting Workstation',
  description: 'Hospital-grade radiology reporting, PACS imaging, voice dictation, and HMIS bridge.',
};

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <LandingHeader user={user} />
      <main className="flex-1">
        <LandingHero />
        <LandingDicomShowcase />
        <LandingFeaturesBento />
        <LandingComparison />
        <LandingAlphaCta />
      </main>
      <LandingFooter />
    </div>
  );
}
