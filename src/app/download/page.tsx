import React from 'react';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/services/auth.service';
import { releaseService } from '@/services/release.service';
import { DownloadView } from '@/components/download/download-view';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingFooter } from '@/components/landing/landing-footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Download Rad Suite Desktop Workstation | Official Windows Release',
  description: 'Download the standalone Rad Suite diagnostic workstation for Windows. Embedded offline engine, Gigabit LAN PACS harvest, and secure HMIS draft synchronization.',
};

export default async function DownloadPage() {
  const user = await getCurrentUser();
  const release = releaseService.getLatestRelease();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <LandingHeader user={user} />
      <main className="flex-1 pt-16">
        <DownloadView release={release} />
      </main>
      <LandingFooter />
    </div>
  );
}
