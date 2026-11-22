import { NextResponse } from 'next/server';
import { destroySession, getCurrentUser } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'logout',
      entityType: 'Auth',
      details: 'Clinician logged out',
    });
  }

  await destroySession();
  return NextResponse.json({ success: true, message: 'Logged out' });
}
