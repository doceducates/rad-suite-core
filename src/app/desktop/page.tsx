import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

interface DesktopEntryProps {
  searchParams?: Promise<{ nonce?: string; source?: string }>;
}

export default async function DesktopEntryPage({ searchParams }: DesktopEntryProps) {
  const params = await searchParams;
  const expectedNonce = process.env.RADSUITE_INTERNAL_NONCE?.trim();

  // If internal nonce was configured on boot, verify handshake
  if (expectedNonce) {
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get('radsuite_loopback_nonce')?.value;
    const providedNonce = params?.nonce?.trim();

    if (providedNonce && providedNonce === expectedNonce) {
      cookieStore.set('radsuite_loopback_nonce', expectedNonce, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production' && process.env.IS_DESKTOP !== '1',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    } else if (!existingCookie || existingCookie !== expectedNonce) {
      console.warn('[SECURITY] Loopback handshake failed: invalid or missing internal nonce.');
    }
  }

  const user = await getCurrentUser();

  // If not logged in, route to login screen with desktop mode flag
  if (!user) {
    redirect('/login?source=desktop');
  }

  // If waitlisted, route to the review queue / alpha code entry screen
  if (user.status === 'waitlisted' || user.status === 'pending_invite') {
    redirect('/pending-access');
  }

  // Active clinician lands directly in the diagnostic Command Center dashboard
  redirect('/dashboard');
}
