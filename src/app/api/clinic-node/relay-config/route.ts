/**
 * Layer 1: Transport Controller for Clinic Relay Configuration
 *
 * Allows Desktop / Localhost administrators to inspect, test, and save
 * custom Cloud Relay (VPS URL & Secret Token) settings without needing .env.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import {
  getEffectiveRelayConfig,
  saveStoredRelayConfig,
  clearStoredRelayConfig,
} from '@/services/clinic-relay-storage.service';
import { testRelayConnection, resetRelayCache } from '@/services/clinic-relay.service';

const RelayConfigSchema = z.object({
  action: z.enum(['save', 'test', 'reset']).default('save'),
  relayUrl: z.string().optional(),
  secret: z.string().optional(),
});

export const GET = withAuth(
  async (_req: NextRequest) => {
    const effective = getEffectiveRelayConfig();
    return NextResponse.json({
      success: true,
      relayUrl: effective.relayUrl,
      source: effective.source,
      isConfigured: effective.isConfigured,
      hasSecret: Boolean(effective.secret),
    });
  },
  { roles: ['admin'] }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = RelayConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { action, relayUrl, secret } = parsed.data;

    if (action === 'reset') {
      clearStoredRelayConfig();
      resetRelayCache();
      const updated = getEffectiveRelayConfig();
      return NextResponse.json({
        success: true,
        message: 'Custom relay configuration cleared.',
        relayUrl: updated.relayUrl,
        source: updated.source,
        isConfigured: updated.isConfigured,
        hasSecret: Boolean(updated.secret),
      });
    }

    if (action === 'test') {
      const testResult = await testRelayConnection(relayUrl, secret);
      return NextResponse.json({
        ...testResult,
      });
    }

    // Default: 'save'
    if (!relayUrl || !relayUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Cloud Relay URL is required to save configuration.' },
        { status: 400 }
      );
    }

    const testResult = await testRelayConnection(relayUrl, secret);
    const saved = saveStoredRelayConfig({ relayUrl, secret });
    resetRelayCache();

    return NextResponse.json({
      success: true,
      message: testResult.success
        ? `Connected and saved: ${testResult.message}`
        : `Configuration saved, but connection check returned: ${testResult.message}`,
      relayUrl: saved.relayUrl,
      source: 'custom',
      isConfigured: true,
      hasSecret: Boolean(saved.secret),
      testResult,
    });
  },
  { roles: ['admin'] }
);
