/**
 * Pre-warm Atlas Disk Cache (<140 lines).
 * Zero-dependency utility to decrypt slices from .radatlas into radatlas/cache/
 * Usage: node scripts/prewarm-atlas-cache.js [module_code]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const RADATLAS_FILE =
  process.env.RADATLAS_PATH ||
  path.join(process.cwd(), 'radatlas', 'radatlas_complete.radatlas');

const CACHE_ROOT =
  process.env.VOXEN_ATLAS_CACHE_DIR ||
  path.join(process.cwd(), 'radatlas', 'cache');

const PASSPHRASE = 'RadSuite-Universal-Anatomy-Core-v1';
const SALT = 'RadAtlas-Vault-Salt-2026';
const DERIVED_KEY = crypto.pbkdf2Sync(PASSPHRASE, SALT, 100000, 32, 'sha256');

function decrypt(isEncrypted, iv, payload) {
  if (!isEncrypted) return payload;
  const tagLength = 16;
  const ciphertext = payload.subarray(0, payload.length - tagLength);
  const authTag = payload.subarray(payload.length - tagLength);

  const decipher = crypto.createDecipheriv('aes-256-gcm', DERIVED_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function prewarm(targetModule = null) {
  if (!fs.existsSync(RADATLAS_FILE)) {
    console.error(`[PreWarm] Error: ${RADATLAS_FILE} not found.`);
    process.exit(1);
  }

  console.log(`[PreWarm] Opening container: ${RADATLAS_FILE}`);
  const db = new Database(RADATLAS_FILE, { readonly: true });

  const query = targetModule
    ? db.prepare("SELECT module_code, series_id, slice_sort, contrast, is_encrypted, iv, payload FROM media_store WHERE media_type = 'slice' AND module_code = ?")
    : db.prepare("SELECT module_code, series_id, slice_sort, contrast, is_encrypted, iv, payload FROM media_store WHERE media_type = 'slice'");

  const rows = targetModule ? query.all(targetModule) : query.all();
  console.log(`[PreWarm] Found ${rows.length} slices to extract into ${CACHE_ROOT}...`);

  let count = 0;
  let skipped = 0;

  for (const row of rows) {
    const safeMod = row.module_code.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeSeries = String(row.series_id || 0);
    const safeSlice = String(row.slice_sort || 1).padStart(4, '0');
    const isDefaultContrast = !row.contrast || row.contrast === 'contraste_' || row.contrast === 'standard';
    const safeContrast = isDefaultContrast ? '' : `_${row.contrast.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const destDir = path.join(CACHE_ROOT, safeMod);
    const destFile = path.join(destDir, `${safeSeries}_${safeSlice}${safeContrast}.jpg`);
    const canonicalFile = path.join(destDir, `${safeSeries}_${safeSlice}.jpg`);

    if (fs.existsSync(destFile) && fs.existsSync(canonicalFile)) {
      skipped++;
      continue;
    }

    try {
      const decrypted = decrypt(row.is_encrypted, row.iv, row.payload);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      if (!fs.existsSync(destFile)) fs.writeFileSync(destFile, decrypted);
      if (!fs.existsSync(canonicalFile)) {
        try {
          fs.linkSync(destFile, canonicalFile);
        } catch {
          fs.writeFileSync(canonicalFile, decrypted);
        }
      }
      count++;
      if (count % 200 === 0) {
        process.stdout.write(`\r[PreWarm] Extracted ${count} slices...`);
      }
    } catch (err) {
      console.error(`\nFailed to extract ${safeMod}/${safeSeries}_${safeSlice}:`, err.message);
    }
  }

  console.log(`\n[PreWarm] Completed! Extracted: ${count}, Skipped (Already cached): ${skipped}`);
}

const moduleArg = process.argv[2] || null;
prewarm(moduleArg);
