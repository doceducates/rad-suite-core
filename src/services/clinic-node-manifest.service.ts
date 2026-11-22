/**
 * Clinic Node Manifest Service (<100 lines).
 * Computes composite version hashes and dynamic file manifests for Clinic Node scripts.
 * AGENTS.md Rule 1: Under 250 lines. AGENTS.md Rule 11: Anti-Lockout.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.json',
  '.lua',
  '.bat',
  '.ps1',
  '.txt',
  '.md',
  '.exe',
]);

const IGNORED_PREFIXES = ['.', 'tmp_', 'temp_'];
const IGNORED_SUFFIXES = ['.log', '.bak', '.zip', '.gz'];

export function getClinicHostDir(): string {
  const candidates = [
    path.join(process.cwd(), 'plugins', 'clinic-edge', 'host-scripts'),
    path.join(process.cwd(), 'scripts', 'clinic-host'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function getClinicHostFiles(): string[] {
  const baseDir = getClinicHostDir();
  if (!fs.existsSync(baseDir)) return [];

  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      if (IGNORED_PREFIXES.some((p) => name.startsWith(p))) continue;
      if (IGNORED_SUFFIXES.some((s) => name.endsWith(s))) continue;

      const ext = path.extname(name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      files.push(name);
    }
    return files.sort();
  } catch (err) {
    console.error('[CLINIC_MANIFEST] Error reading clinic scripts dir:', err);
    return [];
  }
}

export function getAllowedClinicFiles(): string[] {
  return getClinicHostFiles();
}

// Retain ALLOWED_CLINIC_FILES proxy for backwards compatibility
export const ALLOWED_CLINIC_FILES = new Proxy<string[]>([], {
  get(target, prop, receiver) {
    const files = getClinicHostFiles();
    if (prop === 'length') return files.length;
    if (prop === 'includes') return (item: string) => files.includes(item);
    if (typeof prop === 'string' && !isNaN(Number(prop))) return files[Number(prop)];
    const val = Reflect.get(files, prop, receiver);
    return typeof val === 'function' ? val.bind(files) : val;
  },
});

export function getClinicScriptManifest(): { version: string; files: Record<string, string> } {
  const baseDir = getClinicHostDir();
  const fileHashes: Record<string, string> = {};
  const hashCollector = crypto.createHash('sha256');

  const files = getClinicHostFiles();
  for (const f of files) {
    // Only hash scripts and configs for the version signature, skip huge binaries like Orthanc.exe/node.exe
    if (f.endsWith('.exe')) continue;

    const fPath = path.join(baseDir, f);
    if (fs.existsSync(fPath)) {
      try {
        const content = fs.readFileSync(fPath);
        const fileHash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
        fileHashes[f] = fileHash;
        hashCollector.update(`${f}:${fileHash}`);
      } catch {}
    }
  }

  const compositeVersion = hashCollector.digest('hex').slice(0, 16);
  return { version: compositeVersion, files: fileHashes };
}
