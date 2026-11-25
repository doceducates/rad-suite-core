import {
  buildS3Url,
  getSigV4Headers,
  s3HttpRequest,
  type S3Credentials,
  type S3HttpResponse,
} from './s3-client';

const DEFAULT_PART_SIZE = 15 * 1024 * 1024; // 15MB: safely under 20MB TG Bot API & 100MB Cloudflare limit
const MULTIPART_THRESHOLD = 18 * 1024 * 1024; // Switch to S3 Multipart above 18MB

/**
 * Uploads an object via single PUT (<=18MB) or S3 Multipart Upload (>18MB) in 15MB parts,
 * avoiding Cloudflare's 100MB body limit and respecting Telegram rate limits.
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
    });
    return s3HttpRequest('PUT', putUrl, headers, buffer, 120000);
  }

  // 1. Initiate Multipart Upload
  const initUrl = buildS3Url(creds, keyPath, { uploads: '' });
  const initHeaders = getSigV4Headers('POST', initUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, '', {
    'content-type': contentType,
  });
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

  try {
    for (let i = 0; i < totalParts; i++) {
      const partNumber = i + 1;
      const chunk = buffer.subarray(i * DEFAULT_PART_SIZE, Math.min(buffer.length, (i + 1) * DEFAULT_PART_SIZE));
      const partUrl = buildS3Url(creds, keyPath, { partNumber: String(partNumber), uploadId });

      let partRes: S3HttpResponse | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const partHeaders = getSigV4Headers('PUT', partUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, chunk, {
          'content-type': 'application/octet-stream',
        });
        partRes = await s3HttpRequest('PUT', partUrl, partHeaders, chunk, 120000);
        if (partRes.ok) break;
        if (partRes.status === 429 || partRes.status === 503) {
          if (attempt === 2) return partRes;
          await new Promise((r) => setTimeout(r, (attempt + 1) * 8000));
          continue;
        }
        return partRes;
      }

      if (!partRes || !partRes.ok) {
        return partRes!;
      }

      const rawEtag = partRes.headers?.['etag'];
      const etag = Array.isArray(rawEtag) ? rawEtag[0] : (rawEtag || '');
      completedParts.push({ partNumber, etag });

      // Polite pause between parts to respect Telegram S3 rate limits
      if (partNumber < totalParts) {
        await new Promise((r) => setTimeout(r, 800));
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
    });
    return await s3HttpRequest('POST', completeUrl, completeHeaders, completeXml, 300000);
  } catch (err) {
    // Best-effort abort on unhandled exception
    try {
      const abortUrl = buildS3Url(creds, keyPath, { uploadId });
      const abortHeaders = getSigV4Headers('DELETE', abortUrl, creds.region, creds.accessKeyId, creds.secretAccessKey, '');
      await s3HttpRequest('DELETE', abortUrl, abortHeaders, '', 15000);
    } catch {}
    throw err;
  }
}
