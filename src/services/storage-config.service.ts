import fs from 'fs';
import path from 'path';
import type { UnifiedStorageSettings } from '@/types/pacs';

const CONFIG_DIR = path.join(process.cwd(), 'config');
const STORAGE_CONFIG_FILE = path.join(CONFIG_DIR, 'unified-storage.json');

const DEFAULT_SETTINGS: UnifiedStorageSettings = {
  localPath: process.env.LOCAL_CASES_PATH || 'E:\\Cases',
  pacsEnabled: process.env.PACS_ENABLED !== 'false',
  gdriveEnabled: Boolean(process.env.GDRIVE_ENABLED === 'true' || process.env.GDRIVE_FOLDER_ID),
  gdriveFolderId: process.env.GDRIVE_FOLDER_ID || '',
  gdriveServiceAccountEmail: process.env.GDRIVE_CLIENT_EMAIL || '',
  gdriveKeyConfigured: Boolean(process.env.GDRIVE_PRIVATE_KEY || fs.existsSync(path.join(CONFIG_DIR, 'service-account.json'))),
  s3Enabled: Boolean(process.env.S3_ENABLED === 'true' || process.env.S3_BUCKET),
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3Region: process.env.S3_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET || '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretConfigured: Boolean(process.env.S3_SECRET_ACCESS_KEY),
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    } catch {
      // Ignore if cannot create
    }
  }
}

export function getUnifiedStorageSettings(): UnifiedStorageSettings {
  try {
    if (fs.existsSync(STORAGE_CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STORAGE_CONFIG_FILE, 'utf8'));
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        gdriveKeyConfigured: Boolean(
          saved.gdriveServiceAccountKey ||
          process.env.GDRIVE_PRIVATE_KEY ||
          fs.existsSync(path.join(CONFIG_DIR, 'service-account.json'))
        ),
        s3SecretConfigured: Boolean(
          saved.s3SecretAccessKey ||
          process.env.S3_SECRET_ACCESS_KEY
        ),
      };
    }
  } catch (err) {
    console.warn('[STORAGE_CONFIG_READ_WARN]', err);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveUnifiedStorageSettings(newSettings: Partial<UnifiedStorageSettings>): UnifiedStorageSettings {
  ensureConfigDir();
  const current = getUnifiedStorageSettings();
  const merged: UnifiedStorageSettings = {
    ...current,
    ...newSettings,
  };

  try {
    fs.writeFileSync(STORAGE_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  } catch (err) {
    console.warn('[STORAGE_CONFIG_SAVE_WARN]', err);
  }

  return getUnifiedStorageSettings();
}

export function getInternalStorageCredentials() {
  let saved: Record<string, any> = {};
  if (fs.existsSync(STORAGE_CONFIG_FILE)) {
    try {
      saved = JSON.parse(fs.readFileSync(STORAGE_CONFIG_FILE, 'utf8'));
    } catch {}
  }

  const saJsonPath = path.join(CONFIG_DIR, 'service-account.json');
  let serviceAccountKey = saved.gdriveServiceAccountKey || process.env.GDRIVE_PRIVATE_KEY || '';
  let serviceAccountEmail = saved.gdriveServiceAccountEmail || process.env.GDRIVE_CLIENT_EMAIL || '';

  if ((!serviceAccountKey || !serviceAccountEmail) && fs.existsSync(saJsonPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(saJsonPath, 'utf8'));
      serviceAccountKey = serviceAccountKey || sa.private_key;
      serviceAccountEmail = serviceAccountEmail || sa.client_email;
    } catch {}
  }

  return {
    localPath: saved.localPath || process.env.LOCAL_CASES_PATH || 'E:\\Cases',
    pacsEnabled: saved.pacsEnabled ?? (process.env.PACS_ENABLED !== 'false'),
    gdrive: {
      enabled: saved.gdriveEnabled ?? Boolean(process.env.GDRIVE_FOLDER_ID),
      folderId: saved.gdriveFolderId || process.env.GDRIVE_FOLDER_ID || '',
      email: serviceAccountEmail,
      privateKey: serviceAccountKey,
    },
    s3: {
      enabled: saved.s3Enabled ?? Boolean(process.env.S3_BUCKET),
      endpoint: saved.s3Endpoint || process.env.S3_ENDPOINT || '',
      region: saved.s3Region || process.env.S3_REGION || 'us-east-1',
      bucket: saved.s3Bucket || process.env.S3_BUCKET || '',
      accessKeyId: saved.s3AccessKeyId || process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: saved.s3SecretAccessKey || process.env.S3_SECRET_ACCESS_KEY || '',
      forcePathStyle: saved.s3ForcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE === 'true'),
    },
  };
}
