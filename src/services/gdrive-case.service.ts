import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PacsQueryFilter, PacsStudyResult } from '@/types/pacs';
import { getInternalStorageCredentials } from './storage-config.service';
import { getUserGoogleAccessToken } from './google-auth.service';

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedGdriveToken: CachedToken | null = null;

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getGdriveAccessToken(clientEmail: string, privateKey: string): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGdriveToken && cachedGdriveToken.expiresAt > now + 60) {
    return cachedGdriveToken.token;
  }

  try {
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const claimSet = JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    });

    const encodedHeader = base64UrlEncode(header);
    const encodedClaim = base64UrlEncode(claimSet);
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn('[GDRIVE_AUTH_ERROR]', await res.text());
      return null;
    }

    const data = await res.json();
    cachedGdriveToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600),
    };
    return cachedGdriveToken.token;
  } catch (err) {
    console.warn('[GDRIVE_TOKEN_EXCEPTION]', err);
    return null;
  }
}

export async function queryGoogleDriveStudies(filter: PacsQueryFilter = {}): Promise<PacsStudyResult[]> {
  let token: string | null = null;

  // 1. Check if requesting clinician has an authenticated personal Google Drive
  if (filter.currentUserId) {
    try {
      token = await getUserGoogleAccessToken(filter.currentUserId);
    } catch {}
  }

  // 2. If no user OAuth token, check system service account credentials
  if (!token) {
    const creds = getInternalStorageCredentials();
    if (creds.gdrive.enabled && creds.gdrive.email && creds.gdrive.privateKey) {
      token = await getGdriveAccessToken(creds.gdrive.email, creds.gdrive.privateKey);
    }
  }

  if (!token) {
    return [];
  }

  try {
    let q = "trashed = false and (mimeType = 'application/zip' or name contains '.zip')";
    if (filter.accessionNumber) {
      q += ` and name contains '${filter.accessionNumber.replace(/'/g, "\\'")}'`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,createdTime,modifiedTime,size)&pageSize=50`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn('[GDRIVE_LIST_FAIL]', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const files = data.files || [];

    return files.map((file: any) => {
      let accession = 'N/A';
      let patientName = 'PATIENT (GDrive)';
      let modality = 'MR';

      // Parse format: "[MODALITY] ACCESSION - PATIENT_NAME.zip"
      const bracketMatch = (file.name || '').match(/\[([A-Z]+)\]\s*([A-Za-z0-9_-]+)\s*-\s*([^.]+)\.zip/i);
      if (bracketMatch) {
        modality = bracketMatch[1].toUpperCase();
        accession = bracketMatch[2];
        patientName = bracketMatch[3].replace(/_/g, ' ');
      } else {
        const parts = (file.name || 'UNKNOWN').replace(/\.zip$/i, '').split('_');
        accession = parts[0] || file.name;
        patientName = parts[1]?.replace(/-/g, ' ') || 'PATIENT (GDrive)';
        modality = parts[2] || 'MR';
      }

      const dateStr = file.createdTime ? file.createdTime.slice(0, 10) : new Date().toISOString().slice(0, 10);

      return {
        accessionNumber: accession,
        patientName,
        patientMrn: `GD-${accession.slice(-6)}`,
        patientId: `GD-${accession.slice(-6)}`,
        age: 45,
        gender: 'Other' as const,
        modality,
        studyDescription: `Google Drive Archive: ${file.name}`,
        studyDate: dateStr,
        numSeries: 1,
        numInstances: Number(file.size) ? Math.max(1, Math.round(Number(file.size) / (512 * 512 * 2))) : 1,
        pacsServerAe: 'GDRIVE_CLOUD',
        studyInstanceUid: `1.2.840.113619.gdrive.${file.id}`,
        source: 'gdrive' as const,
        availableSources: ['gdrive' as const],
        isDownloaded: false,
      };
    });
  } catch (err) {
    console.warn('[GDRIVE_QUERY_EXCEPTION]', err);
    return [];
  }
}

export async function downloadStudyFromGoogleDrive(
  accession: string,
  targetDir: string
): Promise<{ success: boolean; filesDownloaded: number }> {
  const creds = getInternalStorageCredentials();
  if (!creds.gdrive.enabled || !creds.gdrive.email || !creds.gdrive.privateKey) {
    return { success: false, filesDownloaded: 0 };
  }

  try {
    const token = await getGdriveAccessToken(creds.gdrive.email, creds.gdrive.privateKey);
    if (!token) return { success: false, filesDownloaded: 0 };

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // List files inside study folder matching accession
    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${creds.gdrive.folderId}' in parents and name contains '${accession}' and trashed = false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const folderData = await folderRes.json();
    const folder = folderData.files?.[0];
    if (!folder) return { success: false, filesDownloaded: 0 };

    const filesRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folder.id}' in parents and trashed = false`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const filesData = await filesRes.json();
    const files = filesData.files || [];

    let count = 0;
    for (const f of files) {
      const fileStream = await fetch(
        `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (fileStream.ok) {
        const buffer = await fileStream.arrayBuffer();
        fs.writeFileSync(path.join(targetDir, f.name.endsWith('.dcm') ? f.name : `${f.name}.dcm`), Buffer.from(buffer));
        count++;
      }
    }

    return { success: true, filesDownloaded: count };
  } catch (err) {
    console.warn('[GDRIVE_DOWNLOAD_FAIL]', err);
    return { success: false, filesDownloaded: 0 };
  }
}
