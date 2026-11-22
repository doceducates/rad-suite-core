import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { pluginManager } from '@/services/plugin-manager.service';
import { PluginSlotIdSchema } from '@/lib/plugins/plugin-validation';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const slotIdRaw = searchParams.get('slotId');

  const parseResult = PluginSlotIdSchema.safeParse(slotIdRaw);
  if (!parseResult.success) {
    return NextResponse.json(
      { success: false, error: 'Valid "slotId" parameter is required.' },
      { status: 400 }
    );
  }

  const contributions = await pluginManager.getSlotContributions(parseResult.data, user?.role);
  return NextResponse.json({ success: true, slotId: parseResult.data, contributions });
});
