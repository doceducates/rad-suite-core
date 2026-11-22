import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getClinicNodeStatus } from '@/services/clinic-node.service';
import { DEFAULT_CLINIC_WIFI_NETWORKS } from '@/services/clinic-node-storage';
import { getClinicHostFiles, getClinicHostDir } from '@/services/clinic-node-manifest.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiverModule = require('archiver');
import { PassThrough } from 'stream';

function createZipArchive(options: any = { zlib: { level: 9 } }) {
  if (typeof archiverModule === 'function') {
    return archiverModule('zip', options);
  }
  if (archiverModule.ZipArchive) {
    return new archiverModule.ZipArchive(options);
  }
  if (archiverModule.Archiver) {
    return new archiverModule.Archiver('zip', options);
  }
  if (archiverModule.default && typeof archiverModule.default === 'function') {
    return archiverModule.default('zip', options);
  }
  throw new Error('Unsupported archiver module structure');
}

function isTokenAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const configuredSecret = process.env.CLINIC_NODE_SECRET?.trim();

  if (configuredSecret && configuredSecret.length > 0) {
    return token === configuredSecret || req.headers.get('x-clinic-token') === configuredSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const devSecret = 'clinic-secret-token';
  return token === devSecret || req.headers.get('x-clinic-token') === devSecret;
}

export async function GET(req: NextRequest) {
  try {
    if (!isTokenAuthorized(req)) {
      const cookie = req.cookies.get('rad_suite_session')?.value || req.cookies.get('rad_session')?.value;
      if (!cookie) {
        return NextResponse.json({ success: false, error: 'Unauthorized clinic token or session' }, { status: 401 });
      }
    }

    const scriptsDir = getClinicHostDir();
    if (!fs.existsSync(scriptsDir)) {
      return NextResponse.json({ success: false, error: 'Clinic edge scripts plugin is not installed on this workstation' }, { status: 404 });
    }

    const archive = createZipArchive({ zlib: { level: 1 } });
    const passThrough = new PassThrough();

    archive.pipe(passThrough);

    // Dynamically discover all valid companion scripts, configs, and binaries
    const filesToBundle = getClinicHostFiles();

    const url = new URL(req.url);
    const targetNodeId = url.searchParams.get('nodeId') || undefined;
    const reqOrigin = `${url.protocol}//${url.host}`.replace(/\/+$/, '');

    for (const f of filesToBundle) {
      const fullPath = path.join(scriptsDir, f);
      if (fs.existsSync(fullPath)) {
        if (f === 'agent-config.json') {
          try {
            const rawConfig = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const clinicSecret = process.env.CLINIC_NODE_SECRET || 'clinic-secret-token';
            rawConfig.clinicNodeToken = clinicSecret;
            if (reqOrigin && !reqOrigin.includes('localhost')) {
              rawConfig.radSuiteUrl = reqOrigin;
            }

            if (targetNodeId && targetNodeId !== 'auto' && targetNodeId !== 'new-node') {
              rawConfig.nodeId = targetNodeId;
              try {
                const nodeStatus = getClinicNodeStatus(targetNodeId);
                if (nodeStatus) {
                  if (nodeStatus.syncRules) {
                    rawConfig.syncRules = { ...rawConfig.syncRules, ...nodeStatus.syncRules };
                  }
                  if (nodeStatus.harvestSchedule) {
                    rawConfig.harvestSchedule = { ...rawConfig.harvestSchedule, ...nodeStatus.harvestSchedule };
                  }
                  if (nodeStatus.name) rawConfig.name = nodeStatus.name;
                  if (nodeStatus.hostname) rawConfig.primaryHostname = nodeStatus.hostname;
                  rawConfig.knownNetworks = nodeStatus.knownNetworks || DEFAULT_CLINIC_WIFI_NETWORKS;
                }
              } catch {}
            } else {
              rawConfig.nodeId = 'auto';
              rawConfig.name = 'auto';
              rawConfig.primaryHostname = '';
              rawConfig.knownNetworks = DEFAULT_CLINIC_WIFI_NETWORKS;
            }
            archive.append(JSON.stringify(rawConfig, null, 2), { name: f });
            continue;
          } catch {}
        }
        archive.file(fullPath, { name: f });
      }
    }

    // Finalize the archive
    archive.finalize();

    // Stream the zip back as an attachment
    const chunks: Uint8Array[] = [];
    passThrough.on('data', (chunk) => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      passThrough.on('end', resolve);
      passThrough.on('error', reject);
      archive.on('error', reject);
    });

    const fullBuffer = Buffer.concat(chunks);
    const zipFileName = targetNodeId && targetNodeId !== 'auto' && targetNodeId !== 'new-node'
      ? `clinic-node-${targetNodeId}.zip`
      : 'clinic-node-package.zip';

    return new Response(fullBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': String(fullBuffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Bundle packaging failed' }, { status: 500 });
  }
}
