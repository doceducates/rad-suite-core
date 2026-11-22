import { NextRequest, NextResponse } from 'next/server';
import { testS3Connection } from '@/services/s3-client';
import { withAuth } from '@/lib/api-handler';
import { UnifiedStorageSettingsSchema } from '@/lib/validation';

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const parsed = UnifiedStorageSettingsSchema.partial().safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' },
          { status: 400 }
        );
      }

      const s3Result = await testS3Connection(parsed.data);

      return NextResponse.json({
        success: s3Result.success,
        s3: s3Result,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Storage connection test failed' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'consultant'],
    audit: {
      action: 'test_storage_connection',
      entityType: 'StorageConfig',
    },
  }
);
