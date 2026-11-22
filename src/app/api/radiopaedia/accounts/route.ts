import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listRadiopaediaAccounts,
  connectRadiopaediaAccount,
  deleteRadiopaediaAccount,
  toggleRadiopaediaAccount,
} from '@/services/radiopaedia-pool.service';
import { withAuth } from '@/lib/api-handler';

const connectSchema = z.object({
  name: z.string().min(1).default('Radiology Assistant'),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  authCode: z.string().min(1),
});

const actionSchema = z.object({
  accountId: z.string().min(1),
  action: z.enum(['delete', 'toggle']),
  isActive: z.boolean().optional(),
});

export const GET = withAuth(
  async () => {
    try {
      const accounts = await listRadiopaediaAccounts();
      return NextResponse.json({ success: true, accounts });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const parsed = connectSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid input parameters' }, { status: 400 });
      }

      const result = await connectRadiopaediaAccount(parsed.data);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
  },
  { roles: ['admin'] }
);

export const DELETE = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const parsed = actionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
      }

      if (parsed.data.action === 'delete') {
        await deleteRadiopaediaAccount(parsed.data.accountId);
      } else if (parsed.data.action === 'toggle' && parsed.data.isActive !== undefined) {
        await toggleRadiopaediaAccount(parsed.data.accountId, parsed.data.isActive);
      }

      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { roles: ['admin'] }
);
