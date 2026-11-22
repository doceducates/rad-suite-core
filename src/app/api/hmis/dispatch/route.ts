import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { hmisSubmissions } from '@/db/schema';
import { HmisDispatchSchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';
import { dispatchReportToHmisGateway } from '@/services/hmis.service';

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json();
    const parsed = HmisDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const gatewayResult = await dispatchReportToHmisGateway(payload);

    if (!gatewayResult.success) {
      return NextResponse.json(
        { success: false, error: gatewayResult.error },
        { status: 502 }
      );
    }

    // Record staged submission in database audit
    try {
      await db.insert(hmisSubmissions).values({
        id: crypto.randomUUID(),
        reportId: payload.accessionNumber || payload.patientMrn,
        destinationSystem: 'HMIS_PUNJAB_CHROME_GATEWAY',
        status: 'submitted',
        payloadJson: JSON.stringify(payload),
        ackResponse: JSON.stringify(gatewayResult.data || {}),
        submittedAt: new Date().toISOString(),
      } as any);
    } catch (dbErr) {
      console.warn('[HMIS_AUDIT_WARN] Could not persist submission record:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Verified report successfully dispatched to HMIS Punjab extension.',
      data: gatewayResult.data,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_report_dispatch',
      entityType: 'Report',
      details: 'Dispatched verified cross-sectional report to Punjab HMIS gateway',
    },
  }
);
