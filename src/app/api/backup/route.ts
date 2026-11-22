// Layer 1 Transport: Workstation Backup Export/Import Controller
// Invariant: Strictly under 250 lines. Error shielding and RBAC enforcement.

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedContext } from '@/lib/api-handler';
import { backupService } from '@/services/backup.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (req: NextRequest, { user }: AuthenticatedContext) => {
    try {
      const backupData = await backupService.exportAllData(user);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `radsuite-backup-${dateStr}.json`;

      return new NextResponse(JSON.stringify(backupData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (err: unknown) {
      console.error('[BACKUP_EXPORT_ERR]', err);
      return NextResponse.json(
        { success: false, error: 'Failed to generate workstation backup archive.' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'consultant', 'radiologist'] }
);

export const POST = withAuth(
  async (req: NextRequest, { user }: AuthenticatedContext) => {
    try {
      const contentType = req.headers.get('content-type') || '';
      let rawJson: unknown;

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
          return NextResponse.json(
            { success: false, error: 'Missing backup file in "file" form field.' },
            { status: 400 }
          );
        }
        const text = await (file as Blob).text();
        rawJson = JSON.parse(text);
      } else {
        rawJson = await req.json();
      }

      const result = await backupService.importBackupData(rawJson, user);
      return NextResponse.json(result, { status: 200 });
    } catch (err: unknown) {
      console.error('[BACKUP_IMPORT_ERR]', err);
      const message = err instanceof Error ? err.message : 'Failed to import workstation backup data.';
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }
  },
  { roles: ['admin'] }
);
