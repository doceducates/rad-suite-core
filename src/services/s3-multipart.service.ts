import {
  buildS3Url,
  getSigV4Headers,
  s3HttpRequest,
  type S3Credentials,
  type S3HttpResponse,
} from './s3-client';

const DEFAULT_PART_SIZE = 22 * 1024 * 1024; // 22MB: >20MB Bot API threshold (routes via VPS proxy, no 15/min limit) & <25MB (Worker MD5 CPU safe, no 1102)
const MULTIPART_THRESHOLD = 80 * 1024 * 1024; // Single PUT up to 80MB (safely under 100MB Cloudflare limit); Multipart above

function getRetryDelayMs(res: S3HttpResponse, attempt: number): number {
  const rawHeader = res.headers?.['retry-after'];
  const raw = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const sec = raw ? parseInt(raw, 10) : NaN;
  if (!isNaN(sec) && sec > 0) {
    return Math.min(60000, Math.max(5000, sec * 1000));
  }
  return Math.min(60000, (attempt + 1) * 10000);
}

async function abortMultipartBestEffort(creds: S3Credentials, keyPath: string, uploadId: string): Promise<void> {
  try {
    const abortUrl = buildS3Url(creds, keyPath, { uploadId });
    const abortHeaders = getSigV4Headers('DELETE', abortUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, '');
    await s3HttpRequest('DELETE', abortUrl, abortHeaders, '', 15000);
  } catch {}
}

/**
 * Uploads an object via single PUT (<=80MB) or S3 Multipart Upload (>80MB) in 50MB parts,
 * avoiding Cloudflare's 100MB body limit and the 20MB Worker rate-limited direct Bot API path.
 */
export async function uploadBufferSmartToS3(
  creds: S3Credentials,
  keyPath: string,
  buffer: Buffer,
  contentType: string = 'application/zip'
): Promise<S3HttpResponse> {
  if (buffer.length <= MULTIPART_THRESHOLD) {
    const putUrl = buildS3Url(creds, keyPath);
    const headers = getSigV4Headers('PUT', putUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, buffer, {
      'content-type': contentType,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    }, true);
    return s3HttpRequest('PUT', putUrl, headers, buffer, 180000);
  }

  // 1. Initiate Multipart Upload
  const initUrl = buildS3Url(creds, keyPath, { uploads: '' });
  const initHeaders = getSigV4Headers('POST', initUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, '', {
    'content-type': contentType,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  }, true);
  const initRes = await s3HttpRequest('POST', initUrl, initHeaders, '', 30000);
  if (!initRes.ok) return initRes;

  const initXml = await initRes.text();
  const uploadIdMatch = initXml.match(/<UploadId>([^<]+)<\/UploadId>/);
  const uploadId = uploadIdMatch?.[1]?.trim();
  if (!uploadId) {
    return {
      ok: false,
      status: 500,
      text: async () => `Missing UploadId in CreateMultipartUpload response: ${initXml.slice(0, 150)}`,
      arrayBuffer: async () => Buffer.alloc(0),
    };
  }

  const completedParts: { partNumber: number; etag: string }[] = [];
  const totalParts = Math.ceil(buffer.length / DEFAULT_PART_SIZE);
  console.log(`[MULTIPART] Started uploadId=${uploadId} for ${keyPath} (${totalParts} parts, ${(buffer.length / 1048576).toFixed(1)} MB)`);

  try {
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      const chunk = buffer.subarray(i * DEFAULT_PART_SIZE, Math.min(buffer.length, (i + 1) * DEFAULT_PART_SIZE));
      const partUrl = buildS3Url(creds, keyPath, { partNumber: String(partNumber), uploadId });

      let partRes: S3HttpResponse | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const partHeaders = getSigV4Headers('PUT', partUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, chunk, {
          'content-type': 'application/octet-stream',
          'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        }, true);
        const t0 = Date.now();
        partRes = await s3HttpRequest('PUT', partUrl, partHeaders, chunk, 180000);
        if (partRes.ok) {
          const rawEtag = partRes.headers?.['etag'];
          const etag = Array.isArray(rawEtag) ? rawEtag[0] : (rawEtag || '');
          completedParts.push({ partNumber, etag });
          console.log(`[MULTIPART] Part ${partNumber}/${totalParts} (${(chunk.length / 1048576).toFixed(1)} MB) uploaded in ${Date.now() - t0}ms`);
          break;
        }
        if (partRes.status === 429 || partRes.status >= 500) {
          console.warn(`[MULTIPART] Part ${partNumber}/${totalParts} returned HTTP ${partRes.status}, retrying attempt ${attempt + 1}/4...`);
          if (attempt === 3) {
            await abortMultipartBestEffort(creds, keyPath, uploadId);
            return partRes;
          }
          await new Promise((r) => setTimeout(r, getRetryDelayMs(partRes!, attempt)));
          continue;
        }
        await abortMultipartBestEffort(creds, keyPath, uploadId);
        return partRes;
      }

      if (!partRes || !partRes.ok) {
        await abortMultipartBestEffort(creds, keyPath, uploadId);
        return partRes!;
      }

      // Polite pause between parts to respect Telegram S3 and tunnel rate limits
      if (partNumber < totalParts) {
        await new Promise((r) => setTimeout(r, 3500));
      }
    }

    // 3. Complete Multipart Upload
    const partsXml = completedParts
      .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`)
      .join('');
    const completeXml = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;
    const completeUrl = buildS3Url(creds, keyPath, { uploadId });
    const completeHeaders = getSigV4Headers('POST', completeUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, completeXml, {
      'content-type': 'application/xml',
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    }, true);
    console.log(`[MULTIPART] Completing upload for ${keyPath} (${completedParts.length} parts)...`);
    let completeRes: S3HttpResponse | null = null;
    for (let cAttempt = 0; cAttempt < 3; cAttempt++) {
      completeRes = await s3HttpRequest('POST', completeUrl, completeHeaders, completeXml, 600000);
      if (completeRes.ok) {
        console.log(`[MULTIPART] CompleteMultipartUpload succeeded for ${keyPath}`);
        return completeRes;
      }
      if (completeRes.status === 429 || completeRes.status >= 500) {
        console.warn(`[MULTIPART] Complete returned HTTP ${completeRes.status}, retrying attempt ${cAttempt + 1}/3...`);
        if (cAttempt < 2) {
          await new Promise((r) => setTimeout(r, 5000 * (cAttempt + 1)));
          continue;
        }
      }
      break;
    }
    await abortMultipartBestEffort(creds, keyPath, uploadId);
    return completeRes!;
  } catch (err) {
    await abortMultipartBestEffort(creds, keyPath, uploadId);
    throw err;
  }
}
