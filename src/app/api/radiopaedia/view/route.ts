import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';

/**
 * Radiopaedia Case Webview Proxy
 * Layer 1 (Transport) - Strict SSRF validation and frame unblocking
 */
export const GET = withAuth(
  async (req: NextRequest) => {
  const urlParam = req.nextUrl.searchParams.get('url');

  if (!urlParam) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // SSRF Protection: strictly allow only radiopaedia.org
  try {
    const parsed = new URL(urlParam);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('radiopaedia.org')) {
      return new NextResponse('Invalid URL target: Only radiopaedia.org is permitted', { status: 403 });
    }
  } catch {
    return new NextResponse('Malformed URL target', { status: 400 });
  }

  try {
    const response = await fetch(urlParam, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RadSuite/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Radiopaedia returned status: ${response.status}`, { status: response.status });
    }

    let html = await response.text();

    // Inject base tag so all relative assets, scripts, stylesheets, and images resolve directly
    const baseTag = '<base href="https://radiopaedia.org/" target="_blank">';
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else if (html.includes('<head ')) {
      html = html.replace(/<head[^>]*>/, `$&${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[Radiopaedia View Proxy Error]', error);
    return new NextResponse(
      `<div style="font-family:sans-serif;padding:2rem;text-align:center;color:#ef4444;">
        <h3>Unable to load Radiopaedia case in webview</h3>
        <p>You can still open this case directly on <a href="${urlParam}" target="_blank" style="color:#3b82f6;">Radiopaedia.org</a>.</p>
      </div>`,
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
);
