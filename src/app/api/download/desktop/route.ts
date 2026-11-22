import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { releaseService } from '@/services/release.service';
import { telemetryService } from '@/services/telemetry.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const latest = releaseService.getLatestRelease();
    const releasesDir = path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'releases');
    const nsisDir = path.join(/* turbopackIgnore: true */ process.cwd(), 'src-tauri', 'target', 'release', 'bundle', 'nsis');

    // Fire-and-forget download telemetry audit log
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';
    telemetryService.recordDownload({
      ipAddress: ip,
      userAgent,
      fileName: latest.installerFileName,
    }).catch(() => {});

    // 1. Direct match with latest installer name from manifest
    const candidatePaths = [
      path.join(releasesDir, latest.installerFileName),
      path.join(nsisDir, latest.installerFileName),
    ];

    let foundPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    // 2. Dynamic fallback: Scan for any latest *.exe installer in public/releases
    if (!foundPath && fs.existsSync(releasesDir)) {
      try {
        const files = fs.readdirSync(releasesDir)
          .filter((f) => f.endsWith('.exe'))
          .map((f) => ({ name: f, fullPath: path.join(releasesDir, f), mtime: fs.statSync(path.join(releasesDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length > 0) {
          foundPath = files[0].fullPath;
        }
      } catch {}
    }

    if (foundPath) {
      const stat = fs.statSync(foundPath);
      const fileStream = fs.createReadStream(foundPath);
      const fileName = path.basename(foundPath);

      // Convert Node read stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new Response(webStream, {
        headers: {
          'Content-Type': 'application/vnd.microsoft.portable-executable',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Fallback: If installer is stored in cloud S3 mirror, redirect to S3 URL
    const s3DownloadUrl = `https://s3.sehatai.org/rad-suite/releases/${encodeURIComponent(latest.installerFileName)}`;
    return NextResponse.redirect(s3DownloadUrl, 302);
  } catch (error: any) {
    console.error('[DownloadDesktopAPI] Error serving installer:', error);
    return NextResponse.json(
      { success: false, error: 'Installer temporarily unavailable for direct stream. Please try again.' },
      { status: 500 }
    );
  }
}
