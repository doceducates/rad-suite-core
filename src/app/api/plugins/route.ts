import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedContext } from '@/lib/api-handler';
import { pluginManager } from '@/services/plugin-manager.service';
import { z } from 'zod';

const PluginAdminActionSchema = z
  .object({
    pluginId: z.string().min(1),
    enabled: z.boolean().optional(),
    authorized: z.boolean().optional(),
  })
  .refine((data) => data.enabled !== undefined || data.authorized !== undefined, {
    message: 'Either "enabled" or "authorized" must be specified.',
  });

export const GET = withAuth(
  async () => {
    const plugins = await pluginManager.listPlugins();
    return NextResponse.json({ success: true, plugins });
  }
);

export const PATCH = withAuth(
  async (req: NextRequest, { user }: AuthenticatedContext) => {
    const body = await req.json().catch(() => null);
    const parsed = PluginAdminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    try {
      let updated;
      if (parsed.data.authorized !== undefined) {
        updated = await pluginManager.authorizePlugin(parsed.data.pluginId, parsed.data.authorized, {
          id: user.id,
          email: user.email,
        });
      } else {
        updated = await pluginManager.togglePlugin(parsed.data.pluginId, parsed.data.enabled!, user.id);
      }
      return NextResponse.json({ success: true, plugin: updated });
    } catch (err: unknown) {
      return NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : 'Failed to update plugin state' },
        { status: 404 }
      );
    }
  },
  { roles: ['admin'] }
);

export const DELETE = withAuth(
  async (req: NextRequest, { user }: AuthenticatedContext) => {
    const { searchParams } = new URL(req.url);
    const pluginId = searchParams.get('pluginId');
    if (!pluginId) {
      return NextResponse.json(
        { success: false, error: 'pluginId query parameter is required.' },
        { status: 400 }
      );
    }

    const existing = await pluginManager.getPlugin(pluginId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Plugin "${pluginId}" not found.` },
        { status: 404 }
      );
    }

    // Only admin, or the clinician who uploaded an unauthorized pending plugin, can delete it
    const isAdmin = user.role === 'admin';
    const isOwnerOfPending =
      existing.manifest.authorized === false && existing.manifest.installedBy === user.email;

    if (!isAdmin && !isOwnerOfPending) {
      return NextResponse.json(
        { success: false, error: 'Only system administrators can uninstall approved workstation plugins.' },
        { status: 403 }
      );
    }

    const success = await pluginManager.uninstallPlugin(pluginId, user.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: `Failed to remove plugin "${pluginId}".` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: `Plugin "${pluginId}" removed successfully.` });
  }
);
