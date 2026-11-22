// Layer 1 (Transport): Local DICOM Folder & Directory Import Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  scanAndIndexLocalDirectory,
  detectAvailableLocalFolders,
} from '@/services/local-folder-import.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const FolderImportSchema = z.object({
  folderPath: z.string().min(1, 'Folder path is required'),
});

export const GET = withAuth(
  async () => {
    try {
      const detected = detectAvailableLocalFolders();
      return NextResponse.json({
        success: true,
        detectedFolders: detected,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed detecting local storage paths' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
  }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const contentType = req.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await req.json();
        const parsed = FolderImportSchema.safeParse(body);

        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.errors[0]?.message || 'Invalid folder path' },
            { status: 400 }
          );
        }

        const result = await scanAndIndexLocalDirectory(parsed.data.folderPath, {
          userId: user.id,
          userName: user.name,
        });

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error || 'Failed scanning local folder' },
            { status: 422 }
          );
        }

        return NextResponse.json(result);
      }

      return NextResponse.json(
        { success: false, error: 'Unsupported Content-Type. Send JSON with folderPath.' },
        { status: 400 }
      );
    } catch (err: any) {
      console.error('[IMPORT_FOLDER_API_ERR]', err);
      return NextResponse.json(
        { success: false, error: err.message || 'Internal error scanning local folder' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
    audit: {
      action: 'import_local_dicom_folder',
      entityType: 'Storage',
    },
  }
);
