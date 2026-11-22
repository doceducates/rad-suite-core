import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth.service';
import { getPacsServers } from '@/services/pacs.service';
import { SettingsTabbedContainer } from '@/components/settings/settings-tabbed-container';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return {
    title: isAtlas ? 'Atlas Preferences & Profile' : 'Workstation Settings',
    description: isAtlas
      ? 'Manage student profile, 3D anatomical aesthetic themes, and preferences.'
      : 'Manage clinician credentials, HMIS bridge, display presets, and AI provider.',
  };
}

export default async function SettingsPage() {
  const [user, servers, headerList] = await Promise.all([
    getCurrentUser(),
    getPacsServers().catch(() => []),
    headers(),
  ]);

  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  return <SettingsTabbedContainer user={user} pacsServers={servers} isAtlas={isAtlas} />;
}
