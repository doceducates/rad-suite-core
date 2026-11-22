import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { preRegistrations } from '@/db/schema';
import { getCurrentUser } from '@/services/auth.service';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const rows = await db
      .select()
      .from(preRegistrations)
      .orderBy(desc(preRegistrations.createdAt))
      .limit(200);

    const formatted = rows.map((r: any) => ({
      ...r,
      modalitiesOfInterest: (() => {
        try {
          return JSON.parse(r.modalitiesOfInterest || '[]');
        } catch {
          return [];
        }
      })(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] List pre-registrations error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to list pre-registrations', requestId }, { status: 500 });
  }
}
