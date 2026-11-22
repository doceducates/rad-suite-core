import http from 'http';
import https from 'https';
import crypto from 'crypto';
import dns from 'dns';
import type { UnifiedStorageSettings } from '@/types/pacs';
import { getInternalStorageCredentials } from './storage-config.service';

if (typeof (dns as any)?.setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

function s3DnsLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const resolvedIp = process.env.S3_RESOLVED_IP;
  if (resolvedIp && (hostname === 's3.sehatai.org' || hostname === process.env.S3_CUSTOM_HOST)) {
    if (options && options.all) {
      return callback(null, [{ address: resolvedIp, family: 4 }]);
    }
    return callback(null, resolvedIp, 4);
  }
  return dns.lookup(hostname, options, callback);
}

const httpsKeepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 10, lookup: s3DnsLookup });
const httpKeepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });

export interface S3HttpResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<Buffer>;
}

export function s3HttpGet(
  urlStr: string,
  headers: Record<string, string>,
  timeoutMs = 8000
): Promise<S3HttpResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = urlStr.startsWith('https:');
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent;

    const req = client.get(urlStr, { headers, agent, timeout: timeoutMs }, (res) => {
      res.on('error', reject);
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const fullBuf = Buffer.concat(chunks);
        resolve({
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          status: res.statusCode || 0,
          text: async () => fullBuf.toString('utf8'),
          arrayBuffer: async () => fullBuf,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });
    req.on('error', reject);
  });
}

export function s3HttpPut(
  urlStr: string,
  headers: Record<string, string>,
  body: Buffer,
  timeoutMs = 25000
): Promise<S3HttpResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = urlStr.startsWith('https:');
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsKeepAliveAgent : httpKeepAliveAgent;

    const req = client.request(
      urlStr,
      {
        method: 'PUT',
        headers: {
          ...headers,
          'content-length': body.length.toString(),
        },
        agent,
        timeout: timeoutMs,
      },
      (res) => {
        res.on('error', reject);
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const fullBuf = Buffer.concat(chunks);
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            text: async () => fullBuf.toString('utf8'),
            arrayBuffer: async () => fullBuf,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('ETIMEDOUT'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function hmac(key: string | Buffer, string: string): Buffer {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface S3Credentials {
  enabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function getEffectiveS3Credentials(override?: Partial<UnifiedStorageSettings>): S3Credentials {
  const creds = getInternalStorageCredentials();
  return {
    enabled: override?.s3Enabled ?? creds.s3.enabled,
    endpoint: (override?.s3Endpoint ?? creds.s3.endpoint).replace(/\/$/, ''),
    region: override?.s3Region || creds.s3.region || 'us-east-1',
    bucket: override?.s3Bucket || creds.s3.bucket || '',
    accessKeyId: override?.s3AccessKeyId || creds.s3.accessKeyId || '',
    secretAccessKey: override?.s3SecretAccessKey || creds.s3.secretAccessKey || '',
    forcePathStyle: override?.s3ForcePathStyle ?? creds.s3.forcePathStyle ?? true,
  };
}

export function getSigV4Headers(
  method: string,
  urlStr: string,
  region: string,
  accessKey: string,
  secretKey: string,
  payload: Buffer | string = '',
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  const url = new URL(urlStr);
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const payloadHash = hash(payload);

  // Canonical query string must be sorted alphabetically by key
  const canonicalQuery = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const headersToSign: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...extraHeaders,
  };

  const sortedHeaderKeys = Object.keys(headersToSign)
    .map((k) => k.toLowerCase())
    .sort();

  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${headersToSign[k].trim()}\n`)
    .join('');

  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = `${method.toUpperCase()}\n${url.pathname}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headersToSign,
    'User-Agent': 'RadSuite/1.0 (PACS Workstation)',
    Authorization: authorizationHeader,
  };
}

export function buildS3Url(
  creds: S3Credentials,
  keyPath: string = '',
  queryParams: Record<string, string> = {}
): string {
  const cleanKey = keyPath.replace(/^\/+/, '');
  let baseUrl: string;

  if (creds.forcePathStyle || creds.endpoint) {
    const base = creds.endpoint || 'https://s3.amazonaws.com';
    baseUrl = creds.bucket ? `${base}/${creds.bucket}` : base;
  } else {
    baseUrl = `https://${creds.bucket}.s3.${creds.region}.amazonaws.com`;
  }

  const fullBase = cleanKey ? `${baseUrl}/${cleanKey}` : baseUrl;
  const entries = Object.entries(queryParams);
  if (entries.length === 0) return fullBase;

  const queryString = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  return `${fullBase}?${queryString}`;
}

export async function testS3Connection(
  overrides?: Partial<UnifiedStorageSettings>
): Promise<{ success: boolean; latencyMs: number; message: string; buckets?: string[] }> {
  const creds = getEffectiveS3Credentials(overrides);
  const startTime = Date.now();

  if (!creds.endpoint && !creds.bucket) {
    return { success: false, latencyMs: 0, message: 'Neither S3 Endpoint nor Bucket is configured.' };
  }
  if (!creds.accessKeyId || !creds.secretAccessKey) {
    return { success: false, latencyMs: 0, message: 'S3 Access Key ID or Secret Access Key is missing.' };
  }

  try {
    // 1. Probe the specified bucket with max-keys=1
    const testBucket = creds.bucket || 'rad-suite';
    const probeCreds = { ...creds, bucket: testBucket };
    const listUrl = buildS3Url(probeCreds, '', { 'list-type': '2', 'max-keys': '1' });
    const headers = getSigV4Headers('GET', listUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);

    const res = await s3HttpGet(listUrl, headers, 6000);
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let codeMatch = errText.match(/<Code>([^<]+)<\/Code>/);
      let msgMatch = errText.match(/<Message>([^<]+)<\/Message>/);
      const code = codeMatch ? codeMatch[1] : `HTTP ${res.status}`;
      const msg = msgMatch ? msgMatch[1] : 'S3 Request Failed';
      return { success: false, latencyMs, message: `${code}: ${msg}` };
    }

    // 2. Discover all available buckets
    let availableBuckets: string[] = [];
    try {
      const rootUrl = buildS3Url({ ...creds, bucket: '' }, '', {});
      const rootHeaders = getSigV4Headers('GET', rootUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
      const rootRes = await s3HttpGet(rootUrl, rootHeaders, 4000);
      if (rootRes.ok) {
        const rootXml = await rootRes.text();
        const matches = [...rootXml.matchAll(/<Name>([^<]+)<\/Name>/g)];
        availableBuckets = matches.map((m) => m[1]);
      }
    } catch {}

    return {
      success: true,
      latencyMs,
      message: `Successfully connected to bucket "${testBucket}" (${latencyMs}ms)`,
      buckets: availableBuckets.length ? availableBuckets : [testBucket],
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      message: err.name === 'TimeoutError' ? 'Connection timed out (6s)' : (err.message || 'Unknown network error'),
    };
  }
}
