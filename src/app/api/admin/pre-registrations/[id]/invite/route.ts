import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { preRegistrations } from '@/db/schema';
import { getCurrentUser } from '@/services/auth.service';
import { inviteService } from '@/services/invite.service';
import { mailService } from '@/services/mail.service';
import { rbacService } from '@/services/rbac.service';
import type { UserRole } from '@/types';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [lead] = await db
      .select()
      .from(preRegistrations)
      .where(eq(preRegistrations.id, id as any))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Pre-registration lead not found' }, { status: 404 });
    }

    // Determine target role from lead's roleDesignation
    let targetRole: UserRole = 'consultant';
    const desig = (lead.roleDesignation || '').toLowerCase();
    if (desig.includes('pgr') || desig.includes('resident') || desig.includes('trainee')) {
      targetRole = 'pgr';
    } else if (desig.includes('technologist') || desig.includes('tech')) {
      targetRole = 'technologist';
    }

    const invite = await inviteService.createInviteCode({
      role: targetRole,
      allowedScreens: ['my_cases', 'hmis', 'workstation', 'studio', 'settings'],
      maxUses: 1,
      expiresInDays: 30,
      recipientName: lead.fullName,
      recipientEmail: lead.email,
      recipientPhone: lead.phone,
      notes: `Approved alpha pre-registration for ${lead.fullName} (${lead.hospital})`,
      createdBy: currentUser.id,
    });

    // Send email from official@sehatai.org
    let emailSent = false;
    if (lead.email && lead.email.includes('@')) {
      emailSent = await mailService.sendAlphaInviteEmail({
        to: lead.email,
        fullName: lead.fullName,
        inviteCode: invite.code,
        role: targetRole,
      });
    }

    // Build WhatsApp URL
    const whatsAppUrl = rbacService.buildWhatsAppInviteUrl(lead.phone, invite.code, lead.fullName);

    // Update lead status
    await db
      .update(preRegistrations)
      .set({
        status: 'invited',
        inviteCodeSent: invite.code,
        updatedAt: (new Date().toISOString() as any),
      })
      .where(eq(preRegistrations.id, id as any));

    return NextResponse.json({
      success: true,
      message: `Invite code ${invite.code} generated and dispatched for ${lead.fullName}`,
      data: {
        inviteCode: invite.code,
        emailSent,
        whatsAppUrl,
      },
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Approve pre-registration error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to approve pre-registration', requestId }, { status: 500 });
  }
}
