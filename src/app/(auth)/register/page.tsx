import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { AtlasRegisterView } from '@/components/auth/atlas-register-view';
import { ClinicianRegisterForm } from '@/components/auth/clinician-register-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return {
    title: isAtlas ? 'Create Student Account' : 'Clinician Registration',
    description: isAtlas
      ? 'Join DocEducates Atlas to track anatomy study streaks, quiz scores, and bookmark high-yield slices.'
      : 'Register for verified clinician access to Rad Suite workstation.',
  };
}

export default async function RegisterPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  if (isAtlas) {
    return <AtlasRegisterView />;
  }

  return <ClinicianRegisterForm />;
}
