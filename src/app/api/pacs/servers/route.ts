import { NextRequest, NextResponse } from 'next/server';
import { getPacsServers, savePacsServer, deletePacsServer, setDefaultPacsServer } from '@/services/pacs.service';
import { PacsServerSchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (_req: NextRequest, { user }) => {
    const servers = await getPacsServers(user?.id, user?.role === 'admin');
    return NextResponse.json({ success: true, servers });
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist'],
  }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = PacsServerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    try {
      const saved = await savePacsServer(parsed.data, user?.id, user?.role === 'admin');
      return NextResponse.json({ success: true, server: saved });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed saving PACS server' }, { status: 403 });
    }
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist'],
    audit: {
      action: 'configure_pacs_server',
      entityType: 'PacsServer',
    },
  }
);

export const DELETE = withAuth(
  async (req: NextRequest, { user }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Server ID required' }, { status: 400 });
    }
    const ok = await deletePacsServer(id, user?.id, user?.role === 'admin');
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Unable to delete PACS server' }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist'],
    audit: {
      action: 'delete_pacs_server',
      entityType: 'PacsServer',
    },
  }
);

export const PATCH = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Server ID required' }, { status: 400 });
    }
    const ok = await setDefaultPacsServer(id, user?.id, user?.role === 'admin');
    return NextResponse.json({ success: ok });
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist'],
    audit: {
      action: 'set_default_pacs_server',
      entityType: 'PacsServer',
    },
  }
);

