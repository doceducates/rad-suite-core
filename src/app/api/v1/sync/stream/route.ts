// Layer 1: Server-Sent Events (SSE) Live Multi-Device Sync Stream Controller
import { NextRequest } from 'next/server';
import { syncBroadcaster, type SyncStreamEvent } from '@/services/sync/sync-stream-broadcaster';
import { getVpsSyncApiKey } from '@/services/sync/case-sync-client.service';
import { verifySession } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authenticate via Bearer header, URL token param (for browser EventSource), or session cookie
  const authHeader = req.headers.get('authorization') || '';
  const expectedKey = getVpsSyncApiKey();
  const tokenParam = req.nextUrl.searchParams.get('token') || '';
  const headerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  let isAuthorized = (headerKey && headerKey === expectedKey) || (tokenParam && tokenParam === expectedKey);

  if (!isAuthorized) {
    // Check user session cookie (for logged-in workstation / iPad / mobile browser)
    const sessionToken = req.cookies.get('radsuite_session')?.value;
    if (sessionToken) {
      const session = await verifySession(sessionToken);
      if (session?.user) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid sync stream credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Set up SSE ReadableStream
  const encoder = new TextEncoder();
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Handshake packet
      const initPayload = JSON.stringify({
        status: 'connected',
        serverTime: new Date().toISOString(),
        subscribers: syncBroadcaster.getSubscriberCount() + 1,
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initPayload}\n\n`));

      // Subscribe to real-time broadcaster
      unsubscribe = syncBroadcaster.subscribe((event: SyncStreamEvent) => {
        try {
          const packet = `event: mutation\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(packet));
        } catch {
          // Stream might have closed
        }
      });

      // 15s Heartbeat ping to keep cellular/proxy connections alive
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
