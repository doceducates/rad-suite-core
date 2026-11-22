import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/services/auth.service';
import { inviteService } from '@/services/invite.service';
import { mailService } from '@/services/mail.service';
import { rbacService } from '@/services/rbac.service';
import { CreateInviteCodeSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const invites = await inviteService.listInviteCodes();
    return NextResponse.json({ success: true, data: invites });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] List invites error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to list invites', requestId }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const json = await req.json();
    const result = CreateInviteCodeSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 });
    }

    const {
      role,
      allowedScreens,
      maxUses,
      expiresInDays,
      recipientName,
      recipientEmail,
      recipientPhone,
      notes,
      sendEmail,
    } = result.data;

    const invite = await inviteService.createInviteCode({
      role,
      allowedScreens,
      maxUses,
      expiresInDays,
      recipientName,
      recipientEmail: recipientEmail || undefined,
      recipientPhone,
      notes,
      createdBy: currentUser.id,
    });

    // Auto-dispatch email if requested
    let emailSent = false;
    if (sendEmail && recipientEmail && recipientEmail.includes('@')) {
      emailSent = await mailService.sendAlphaInviteEmail({
        to: recipientEmail,
        fullName: recipientName || 'Clinician',
        inviteCode: invite.code,
        role: invite.role,
        allowedScreens: invite.allowedScreens,
      });
    }

    // Generate WhatsApp link if recipient phone provided
    let whatsAppUrl: string | null = null;
    if (recipientPhone && recipientPhone.length >= 8) {
      whatsAppUrl = rbacService.buildWhatsAppInviteUrl(recipientPhone, invite.code, recipientName);
    }

    return NextResponse.json({
      success: true,
      message: `Invite code ${invite.code} created successfully`,
      data: {
        invite,
        emailSent,
        whatsAppUrl,
      },
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Create invite error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create invite code', requestId }, { status: 500 });
  }
}
