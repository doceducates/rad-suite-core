import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { config } from '@/lib/config';
import { AtlasLoginView } from '@/components/auth/atlas-login-view';
import { ClinicianLoginForm } from '@/components/auth/clinician-login-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return {
    title: isAtlas ? 'Student & Trainee Sign In' : 'Clinician Sign In',
    description: isAtlas
      ? 'Sign in to your DocEducates Atlas account to resume study sessions, quizzes, and bookmarks.'
      : 'Enter your institutional email or HMIS portal username to access your workstation.',
  };
}

export default async function LoginPage() {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  if (isAtlas) {
    return <AtlasLoginView />;
  }

  return <ClinicianLoginForm />;
}
