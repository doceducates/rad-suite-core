import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthenticatedContext } from '@/lib/api-handler';
import { pluginManager } from '@/services/plugin-manager.service';

interface PluginRouteParams {
  pluginId: string;
  route: string[];
}

async function handleProxy(req: NextRequest, ctx: AuthenticatedContext) {
  const params = ctx.params as unknown as PluginRouteParams | undefined;
  const pluginId = params?.pluginId;
  const route = params?.route;

  if (!pluginId || !route) {
    return NextResponse.json(
      { success: false, error: 'Invalid plugin route parameter' },
      { status: 400 }
    );
  }

  const pluginInfo = await pluginManager.getPlugin(pluginId);
  if (!pluginInfo) {
    return NextResponse.json(
      { success: false, error: `Plugin "${pluginId}" is not installed.` },
      { status: 404 }
    );
  }

  if (pluginInfo.status !== 'active') {
    return NextResponse.json(
      { success: false, error: `Plugin "${pluginId}" is currently disabled.` },
      { status: 403 }
    );
  }

  const { backendPort } = pluginInfo.manifest;
  if (!backendPort) {
    return NextResponse.json(
      { success: false, error: `Plugin "${pluginId}" does not expose a backend service.` },
      { status: 404 }
    );
  }

  const subPath = Array.isArray(route) ? route.join('/') : route;
  const { search } = new URL(req.url);
  const targetUrl = `http://127.0.0.1:${backendPort}/${subPath}${search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.set('X-Forwarded-For', req.headers.get('x-forwarded-for') || '127.0.0.1');
    headers.set('X-RadSuite-Plugin', pluginId);
    headers.set('X-RadSuite-User-Id', ctx.user.id);
    headers.set('X-RadSuite-User-Role', ctx.user.role);

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await req.arrayBuffer();
    }

    const res = await fetch(targetUrl, init);
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed communicating with plugin "${pluginId}" service: ${err instanceof Error ? err.message : 'Unknown error'}`,
      },
      { status: 502 }
    );
  }
}

export const GET = withAuth(handleProxy);
export const POST = withAuth(handleProxy);
export const PUT = withAuth(handleProxy);
export const DELETE = withAuth(handleProxy);
