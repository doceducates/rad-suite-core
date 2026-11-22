import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedContext } from '@/lib/api-handler';
import { pluginManager } from '@/services/plugin-manager.service';

export const POST = withAuth(
  async (req: NextRequest, { user }: AuthenticatedContext) => {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Multipart form data required with a "file" field containing plugin .zip' },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing plugin zip archive file in "file" field.' },
        { status: 400 }
      );
    }

    const blob = file as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Max plugin size: 50MB
    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Plugin archive exceeds maximum permitted size of 50 MB.' },
        { status: 400 }
      );
    }

    try {
      const result = await pluginManager.installPluginZip(buffer, {
        id: user.id,
        email: user.email,
        role: user.role,
      });
      return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
      return NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : 'Plugin installation failed' },
        { status: 400 }
      );
    }
  }
);
