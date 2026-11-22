// Layer 2 (Domain/Services): WhatsApp Handover Local Storage Persistence Helpers
// Strict File Size Invariant: Target < 100 lines

import { HandoverFieldsConfig, DEFAULT_HANDOVER_FIELDS } from './whatsapp-handover-fields';

export const STORAGE_FIELDS_KEY = 'radsuite_whatsapp_handover_fields';
export const STORAGE_PHONE_KEY = 'radsuite_whatsapp_last_phone';
export const STORAGE_DATE_KEY = 'radsuite_whatsapp_last_class_date';

export function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function loadSavedHandoverFields(): HandoverFieldsConfig {
  if (typeof window === 'undefined') return DEFAULT_HANDOVER_FIELDS;
  try {
    const saved = localStorage.getItem(STORAGE_FIELDS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const includeTotalCases = parsed.includeTotalCases !== undefined
        ? Boolean(parsed.includeTotalCases)
        : (parsed.includeSummaryCount !== undefined ? Boolean(parsed.includeSummaryCount) : DEFAULT_HANDOVER_FIELDS.includeTotalCases);
      const includeTotalStudies = parsed.includeTotalStudies !== undefined
        ? Boolean(parsed.includeTotalStudies)
        : (parsed.includeSummaryCount !== undefined ? Boolean(parsed.includeSummaryCount) : DEFAULT_HANDOVER_FIELDS.includeTotalStudies);

      return {
        ...DEFAULT_HANDOVER_FIELDS,
        ...parsed,
        includeTotalCases,
        includeTotalStudies,
      };
    }
  } catch {}
  return DEFAULT_HANDOVER_FIELDS;
}

export function saveHandoverFields(fields: HandoverFieldsConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_FIELDS_KEY, JSON.stringify(fields));
  } catch {}
}

export function loadSavedClassDate(): string {
  if (typeof window === 'undefined') return getTodayIso();
  return localStorage.getItem(STORAGE_DATE_KEY) || getTodayIso();
}

export function saveClassDate(date: string): void {
  if (typeof window === 'undefined' || !date) return;
  try {
    localStorage.setItem(STORAGE_DATE_KEY, date);
  } catch {}
}

export function loadSavedPhone(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_PHONE_KEY) || '';
}

export function savePhone(phone: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PHONE_KEY, phone);
  } catch {}
}
