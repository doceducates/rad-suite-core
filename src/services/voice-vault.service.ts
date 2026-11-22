/**
 * Voice Recordings Vault & Retention Manager (Layer 2 - Domain/Services)
 * Organizes patient audio recordings across reporting, clinical comments, and voice lab.
 * Manages configurable retention lifecycle (default 5 days) with automated cleanup.
 */
import fs from 'fs';
import path from 'path';

export interface VoiceRecordingMeta {
  id: string;
  filename: string;
  patientName?: string;
  patientMrn?: string;
  accessionNumber?: string;
  studyId?: string;
  studyDescription?: string;
  modality?: string;
  source: 'reporting_canvas' | 'comment' | 'voice_lab';
  authorName: string;
  authorRole: string;
  duration: number;
  size: number;
  mimeType: string;
  audioUrl: string;
  rawTranscript?: string;
  hasStructuredReport?: boolean;
  createdAt: string;
  expiresAt: string;
}

const VAULT_DIR = path.join(process.cwd(), 'storage', 'media', 'voice_vault');
const INDEX_FILE = path.join(VAULT_DIR, 'recordings_index.json');
export const DEFAULT_RETENTION_DAYS = 5;

function ensureVaultDir(): void {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
  if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(INDEX_FILE, '[]', 'utf-8');
  }
}

export function loadVaultIndex(): VoiceRecordingMeta[] {
  ensureVaultDir();
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveVaultIndex(records: VoiceRecordingMeta[]): void {
  ensureVaultDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export function saveVoiceRecording(
  buffer: Buffer,
  meta: Omit<VoiceRecordingMeta, 'id' | 'filename' | 'size' | 'createdAt' | 'expiresAt' | 'audioUrl'> & {
    retentionDays?: number;
    customId?: string;
  }
): VoiceRecordingMeta {
  ensureVaultDir();
  const now = new Date();
  const retentionDays = meta.retentionDays || DEFAULT_RETENTION_DAYS;
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const id = meta.customId || `rec_${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}_${Math.random().toString(36).substring(2, 8)}`;
  const ext = meta.mimeType.includes('wav') ? 'wav' : meta.mimeType.includes('mp4') ? 'mp4' : 'webm';
  const filename = `${id}.${ext}`;
  const filePath = path.join(VAULT_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  const record: VoiceRecordingMeta = {
    id,
    filename,
    patientName: meta.patientName || 'Unknown Patient',
    patientMrn: meta.patientMrn,
    accessionNumber: meta.accessionNumber,
    studyId: meta.studyId,
    studyDescription: meta.studyDescription,
    modality: meta.modality || 'CT',
    source: meta.source,
    authorName: meta.authorName || 'Radiologist',
    authorRole: meta.authorRole || 'resident',
    duration: meta.duration || 0,
    size: buffer.length,
    mimeType: meta.mimeType || 'audio/webm',
    audioUrl: `/api/voice/recordings/stream?id=${id}`,
    rawTranscript: meta.rawTranscript,
    hasStructuredReport: Boolean(meta.hasStructuredReport),
    createdAt: now.toISOString(),
    expiresAt,
  };

  const index = loadVaultIndex();
  index.unshift(record);
  saveVaultIndex(index);

  return record;
}

export function listVoiceRecordings(filter?: {
  search?: string;
  source?: string;
  modality?: string;
  patientMrn?: string;
}): { recordings: VoiceRecordingMeta[]; total: number; totalBytes: number } {
  let list = loadVaultIndex();

  if (filter?.source && filter.source !== 'all') {
    list = list.filter((r) => r.source === filter.source);
  }
  if (filter?.modality && filter.modality !== 'all') {
    const m = filter.modality.toUpperCase();
    list = list.filter((r) => (r.modality || '').toUpperCase() === m);
  }
  if (filter?.patientMrn) {
    list = list.filter((r) => r.patientMrn === filter.patientMrn);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.patientName?.toLowerCase().includes(q) ||
        r.patientMrn?.toLowerCase().includes(q) ||
        r.accessionNumber?.toLowerCase().includes(q) ||
        r.studyDescription?.toLowerCase().includes(q) ||
        r.rawTranscript?.toLowerCase().includes(q)
    );
  }

  const totalBytes = list.reduce((sum, r) => sum + (r.size || 0), 0);
  return { recordings: list, total: list.length, totalBytes };
}

export function getVoiceRecordingFile(id: string): { filePath: string; mimeType: string } | null {
  ensureVaultDir();
  const index = loadVaultIndex();
  const record = index.find((r) => r.id === id);
  if (!record) return null;

  const filePath = path.join(VAULT_DIR, record.filename);
  if (!fs.existsSync(filePath)) return null;

  return { filePath, mimeType: record.mimeType };
}

export function deleteVoiceRecording(id: string): boolean {
  const index = loadVaultIndex();
  const recordIndex = index.findIndex((r) => r.id === id);
  if (recordIndex === -1) return false;

  const record = index[recordIndex];
  const filePath = path.join(VAULT_DIR, record.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Continue removing from index
    }
  }

  index.splice(recordIndex, 1);
  saveVaultIndex(index);
  return true;
}

/**
 * Retention Reaper: deletes audio files older than their expiration timestamp.
 */
export function cleanExpiredRecordings(customDays?: number): { purgedCount: number; freedBytes: number } {
  const index = loadVaultIndex();
  const now = new Date().getTime();
  const remaining: VoiceRecordingMeta[] = [];
  let purgedCount = 0;
  let freedBytes = 0;

  for (const record of index) {
    let isExpired = false;
    if (customDays !== undefined) {
      const created = new Date(record.createdAt).getTime();
      const cutoff = customDays * 24 * 60 * 60 * 1000;
      isExpired = now - created > cutoff;
    } else {
      isExpired = new Date(record.expiresAt).getTime() <= now;
    }

    if (isExpired) {
      const filePath = path.join(VAULT_DIR, record.filename);
      if (fs.existsSync(filePath)) {
        try {
          const stat = fs.statSync(filePath);
          freedBytes += stat.size;
          fs.unlinkSync(filePath);
        } catch {
          // Ignore
        }
      }
      purgedCount++;
    } else {
      remaining.push(record);
    }
  }

  if (purgedCount > 0) {
    saveVaultIndex(remaining);
  }

  return { purgedCount, freedBytes };
}
