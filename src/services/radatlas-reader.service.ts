/**
 * radatlas-reader.service.ts (<230 lines).
 * Zero-extraction reader for RadAtlas (.radatlas) SQLite packages in Rad Suite.
 * Reads & decrypts slices, masks, and icons directly in RAM using AES-256-GCM.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';

const DEFAULT_RADATLAS_DIR =
  process.env.RADATLAS_DIR ||
  (fs.existsSync(path.join(process.cwd(), 'radatlas'))
    ? path.join(process.cwd(), 'radatlas')
    : 'D:\\Projects\\Rad-Reporting\\IMAIOS\\dist\\radatlas');
const DEFAULT_PASSPHRASE = 'RadSuite-Universal-Anatomy-Core-v1';
const DEFAULT_SALT = 'RadAtlas-Vault-Salt-2026';

let derivedKey: Buffer | null = null;
let mountedDbs: DatabaseType[] = [];
let moduleMap: Map<string, DatabaseType> = new Map();
const lruCache: Map<string, Buffer> = new Map();
const MAX_CACHE_ITEMS = 1024; // ~120 MB RAM in-memory LRU ring cache

function getKey(): Buffer {
  if (derivedKey) return derivedKey;
  derivedKey = crypto.pbkdf2Sync(DEFAULT_PASSPHRASE, DEFAULT_SALT, 100000, 32, 'sha256');
  return derivedKey;
}

function initPackages(): boolean {
  if (mountedDbs.length > 0) return true;
  if (!fs.existsSync(DEFAULT_RADATLAS_DIR)) return false;

  try {
    const files = fs
      .readdirSync(DEFAULT_RADATLAS_DIR)
      .filter((f) => f.endsWith('.radatlas'))
      .map((f) => path.join(DEFAULT_RADATLAS_DIR, f));

    if (!files.length) return false;

    // Prefer monolithic radatlas_complete.radatlas if present, else mount region files
    const completePkg = files.find((f) => f.includes('radatlas_complete'));
    const targetFiles = completePkg ? [completePkg] : files;

    for (const file of targetFiles) {
      const db = new Database(file, { readonly: true, fileMustExist: true });
      mountedDbs.push(db);

      try {
        const rows = db.prepare('SELECT code FROM module').all() as { code: string }[];
        for (const r of rows) {
          if (!moduleMap.has(r.code) || !file.includes('core')) {
            moduleMap.set(r.code, db);
          }
        }
      } catch {
        // Core package or index only
      }
    }
    return mountedDbs.length > 0;
  } catch (err) {
    console.error('[RadAtlasReader] Failed to initialize packages:', err);
    return false;
  }
}

function decrypt(isEncrypted: number, iv: Buffer | null, payload: Buffer): Buffer {
  if (!isEncrypted) return payload;
  if (!iv) throw new Error('Missing IV for encrypted RadAtlas payload');

  const tagLength = 16;
  const ciphertext = payload.subarray(0, payload.length - tagLength);
  const authTag = payload.subarray(payload.length - tagLength);

  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function getFromCache(key: string): Buffer | null {
  const item = lruCache.get(key);
  if (item) {
    // Refresh LRU
    lruCache.delete(key);
    lruCache.set(key, item);
    return item;
  }
  return null;
}

function setCache(key: string, data: Buffer): void {
  if (lruCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = lruCache.keys().next().value;
    if (firstKey) lruCache.delete(firstKey);
  }
  lruCache.set(key, data);
}

export function isRadAtlasAvailable(): boolean {
  return initPackages();
}

export function getSliceImageBuffer(
  moduleCode: string,
  seriesId: number,
  sliceSort: number,
  contrast = ''
): Buffer | null {
  if (!initPackages()) return null;
  const cacheKey = `${moduleCode}:slice:${seriesId}:${sliceSort}:${contrast}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const db = moduleMap.get(moduleCode) || mountedDbs[0];
  if (!db) return null;

  try {
    const query = `
      SELECT is_encrypted, iv, payload, contrast FROM media_store
      WHERE module_code = ? AND media_type = 'slice' AND series_id = ? AND slice_sort = ?
    `;
    const rows = db.prepare(query).all(moduleCode, seriesId, sliceSort) as {
      is_encrypted: number;
      iv: Buffer;
      payload: Buffer;
      contrast: string | null;
    }[];

    if (!rows.length) return null;

    let target = rows[0];
    if (contrast) {
      const match = rows.find((r) => (r.contrast || '').includes(contrast));
      if (match) target = match;
    }

    const decrypted = decrypt(target.is_encrypted, target.iv, target.payload);
    setCache(cacheKey, decrypted);
    return decrypted;
  } catch (err) {
    console.error('[RadAtlasReader] getSliceImageBuffer error:', err);
    return null;
  }
}

export function getMaskImageBuffer(moduleCode: string, hashOrName: string): Buffer | null {
  if (!initPackages()) return null;
  const cacheKey = `${moduleCode}:mask:${hashOrName}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const db = moduleMap.get(moduleCode) || mountedDbs[0];
  if (!db) return null;

  try {
    const query = `
      SELECT is_encrypted, iv, payload FROM media_store
      WHERE module_code = ? AND media_type = 'mask' AND (ref_key = ? OR ref_key LIKE ?)
      LIMIT 1
    `;
    const row = db.prepare(query).get(moduleCode, hashOrName, `%${hashOrName}%`) as {
      is_encrypted: number;
      iv: Buffer;
      payload: Buffer;
    } | undefined;

    if (!row) return null;
    const decrypted = decrypt(row.is_encrypted, row.iv, row.payload);
    setCache(cacheKey, decrypted);
    return decrypted;
  } catch (err) {
    console.error('[RadAtlasReader] getMaskImageBuffer error:', err);
    return null;
  }
}

export function getThumbImageBuffer(moduleCode: string, sliceSort: number): Buffer | null {
  if (!initPackages()) return null;
  const cacheKey = `${moduleCode}:thumb:${sliceSort}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const db = moduleMap.get(moduleCode) || mountedDbs[0];
  if (!db) return null;

  try {
    const query = `
      SELECT is_encrypted, iv, payload FROM media_store
      WHERE module_code = ? AND media_type = 'thumb' AND slice_sort = ?
      LIMIT 1
    `;
    const row = db.prepare(query).get(moduleCode, sliceSort) as {
      is_encrypted: number;
      iv: Buffer;
      payload: Buffer;
    } | undefined;

    if (!row) return null;
    const decrypted = decrypt(row.is_encrypted, row.iv, row.payload);
    setCache(cacheKey, decrypted);
    return decrypted;
  } catch (err) {
    console.error('[RadAtlasReader] getThumbImageBuffer error:', err);
    return null;
  }
}

export function getIconBuffer(iconName: string): Buffer | null {
  if (!initPackages()) return null;
  const cacheKey = `icon:${iconName}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const cleanName = iconName.replace(/^icons[\/\\]/, '');
  for (const db of mountedDbs) {
    try {
      const query = `
        SELECT is_encrypted, iv, payload FROM media_store
        WHERE media_type = 'icon' AND (ref_key = ? OR ref_key LIKE ?)
        LIMIT 1
      `;
      const row = db.prepare(query).get(cleanName, `%${cleanName}`) as {
        is_encrypted: number;
        iv: Buffer;
        payload: Buffer;
      } | undefined;

      if (row) {
        const decrypted = decrypt(row.is_encrypted, row.iv, row.payload);
        setCache(cacheKey, decrypted);
        return decrypted;
      }
    } catch {
      // Continue to next mounted database
    }
  }
  return null;
}

export function closeRadAtlas(): void {
  for (const db of mountedDbs) {
    try {
      db.close();
    } catch {}
  }
  mountedDbs = [];
  moduleMap.clear();
  lruCache.clear();
}
