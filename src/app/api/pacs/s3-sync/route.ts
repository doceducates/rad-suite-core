// Layer 1 (Transport): S3 Cloud Catalog Sync Endpoint
import { NextResponse } from 'next/server';
import { syncS3BucketToDatabase } from '@/services/s3-catalog-sync.service';
import { withAuth } from '@/lib/api-handler';

export const POST = withAuth(
  async () => {
    try {
      const result = await syncS3BucketToDatabase();
      return NextResponse.json({
        success: true,
        synced: result.synced,
        totalKeys: result.totalKeys,
        studies: result.studies,
      });
    } catch (error: any) {
      console.error('[API_PACS_S3_SYNC_ERR]', error);
      return NextResponse.json(
        { success: false, error: 'Failed to synchronize S3 catalog' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin'],
    audit: {
      action: 's3_catalog_sync',
      entityType: 'Storage',
      details: 'Triggered S3 cloud bucket catalog synchronization',
    },
  }
);
