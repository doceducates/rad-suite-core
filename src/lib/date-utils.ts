/**
 * Safe Date Parsing & Formatting Utility
 * Bulletproof against DICOM 8-digit strings (YYYYMMDD), HMIS dates (DD/MM/YYYY),
 * invalid dates, nulls, and ISO conversion RangeErrors.
 */

export function parseDateSafely(raw?: unknown): Date {
  if (!raw || raw === '0' || raw === 0) return new Date();

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? new Date() : raw;
  }

  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return new Date();

    // 1. DICOM 8-digit date string (YYYYMMDD) e.g. "20261015"
    if (/^\d{8}$/.test(trimmed)) {
      const y = parseInt(trimmed.slice(0, 4), 10);
      const m = parseInt(trimmed.slice(4, 6), 10) - 1;
      const d = parseInt(trimmed.slice(6, 8), 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      if (!isNaN(dt.getTime())) return dt;
    }

    // 2. HMIS / UK format (DD-MM-YYYY or DD/MM/YYYY)
    const dmyParts = trimmed.split(/[-/]/);
    if (dmyParts.length === 3 && dmyParts[0].length <= 2 && dmyParts[2].length === 4) {
      const d = parseInt(dmyParts[0], 10);
      const m = parseInt(dmyParts[1], 10) - 1;
      const y = parseInt(dmyParts[2], 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      if (!isNaN(dt.getTime())) return dt;
    }

    // 3. Standard ISO / RFC parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

export function parseDateOrNull(raw?: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '' || raw === '0' || raw === 0) return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (/^\d{8}$/.test(trimmed)) {
      const y = parseInt(trimmed.slice(0, 4), 10);
      const m = parseInt(trimmed.slice(4, 6), 10) - 1;
      const d = parseInt(trimmed.slice(6, 8), 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      if (!isNaN(dt.getTime())) return dt;
    }

    const dmyParts = trimmed.split(/[-/]/);
    if (dmyParts.length === 3 && dmyParts[0].length <= 2 && dmyParts[2].length === 4) {
      const d = parseInt(dmyParts[0], 10);
      const m = parseInt(dmyParts[1], 10) - 1;
      const y = parseInt(dmyParts[2], 10);
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0));
      if (!isNaN(dt.getTime())) return dt;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function safeIsoString(raw?: unknown, fallbackIso?: string): string {
  const d = parseDateOrNull(raw);
  if (d) return d.toISOString();
  if (fallbackIso) return fallbackIso;
  return new Date().toISOString();
}
