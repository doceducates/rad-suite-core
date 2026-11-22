import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedStorageSettings, saveUnifiedStorageSettings } from '@/services/storage-config.service';
import { getActiveStorageSources } from '@/services/unified-source-aggregator.service';
import { UnifiedStorageSettingsSchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async () => {
    const settings = getUnifiedStorageSettings();
    const sources = getActiveStorageSources();
    return NextResponse.json({ success: true, settings, sources });
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist', 'service'],
  }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json();
    const parsed = UnifiedStorageSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updated = saveUnifiedStorageSettings(parsed.data);
    const sources = getActiveStorageSources();

    return NextResponse.json({ success: true, settings: updated, sources });
  },
  {
    roles: ['admin', 'radiologist'],
    audit: {
      action: 'update_storage_configuration',
      entityType: 'StorageConfig',
    },
  }
);
