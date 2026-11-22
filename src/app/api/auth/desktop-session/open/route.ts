// Layer 1 (Transport): System Default Browser Opener (Server-side helper for desktop workstation)
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Invalid URL provided' }, { status: 400 });
    }

    // Launch default system browser on workstation host
    const platform = process.platform;
    let cmd = '';
    if (platform === 'win32') {
      cmd = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        console.warn('[DESKTOP_BROWSER_OPEN_WARN]', err);
      }
    });

    return NextResponse.json({ success: true, message: 'Browser launched' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
