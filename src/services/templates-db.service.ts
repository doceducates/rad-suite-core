// Layer 2: Database Service for Multi-User Shared Clinical Templates
// Invariant: Target < 250 lines, max 350 lines (AGENTS.md Rule 1)

import { sqlite } from '@/db';
import { CrossSectionalTemplate } from '@/types/templates';
import { MASTER_TEMPLATE_CATALOG } from './templates/catalog.data';
import { htmlToClinicalText } from '@/lib/clinical-format';

export interface DbTemplateRecord {
  id: string;
  title: string;
  modality: string;
  study: string;
  technique: string | null;
  findings: string | null;
  impression: string | null;
  recommendation: string | null;
  created_by: string | null;
  created_at: string;
  tenant_id?: string | null;
}

export interface CreateTemplateInput {
  name: string;
  modality: string;
  subspecialty?: string;
  description?: string;
  technique: string;
  normalFindings: string[] | string;
  defaultImpression: string;
  createdBy?: string | null;
}

function parseFindingsToArray(rawFindings: string | null): string[] {
  if (!rawFindings) return [];
  let trimmed = rawFindings.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    trimmed = htmlToClinicalText(trimmed);
  }
  return trimmed
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function recordToTemplate(r: DbTemplateRecord): CrossSectionalTemplate {
  return {
    id: r.id,
    name: r.title,
    modality: r.modality,
    subspecialty: r.study || 'General',
    description: r.recommendation || `${r.modality} standardized clinical protocol`,
    technique: r.technique || '',
    normalFindings: parseFindingsToArray(r.findings),
    defaultImpression: r.impression || '',
    isCustom: true,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export function getSharedDbTemplates(): CrossSectionalTemplate[] {
  try {
    const rows = sqlite.prepare(`
      SELECT id, title, modality, study, technique, findings, impression, recommendation, created_by, created_at
      FROM templates
      ORDER BY created_at DESC
    `).all() as DbTemplateRecord[];

    return rows.map(recordToTemplate);
  } catch (err) {
    console.error('[templates-db] Failed to fetch shared templates from sqlite:', err);
    return [];
  }
}

export function getAllTemplatesShared(): CrossSectionalTemplate[] {
  const dbTemplates = getSharedDbTemplates();
  // Return database custom templates first, followed by built-in master templates
  return [...dbTemplates, ...MASTER_TEMPLATE_CATALOG];
}

export function createSharedDbTemplate(input: CreateTemplateInput): CrossSectionalTemplate {
  const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const findingsStr = Array.isArray(input.normalFindings)
    ? input.normalFindings.join('\n\n')
    : input.normalFindings || '';

  sqlite.prepare(`
    INSERT INTO templates (id, title, modality, study, technique, findings, impression, recommendation, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name.trim(),
    input.modality.toUpperCase().trim(),
    (input.subspecialty || 'General').trim(),
    input.technique.trim(),
    findingsStr.trim(),
    input.defaultImpression.trim(),
    (input.description || '').trim(),
    input.createdBy || null,
    now
  );

  return {
    id,
    name: input.name.trim(),
    modality: input.modality.toUpperCase().trim(),
    subspecialty: (input.subspecialty || 'General').trim(),
    description: (input.description || `${input.modality} standardized clinical protocol`).trim(),
    technique: input.technique.trim(),
    normalFindings: parseFindingsToArray(findingsStr),
    defaultImpression: input.defaultImpression.trim(),
    isCustom: true,
    createdBy: input.createdBy || null,
    createdAt: now,
  };
}

export function updateSharedDbTemplate(id: string, input: Partial<CreateTemplateInput>): boolean {
  try {
    const existing = sqlite.prepare('SELECT id, findings FROM templates WHERE id = ?').get(id) as DbTemplateRecord | undefined;
    if (!existing) return false;

    const fields: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      fields.push('title = ?');
      values.push(input.name.trim());
    }
    if (input.modality !== undefined) {
      fields.push('modality = ?');
      values.push(input.modality.toUpperCase().trim());
    }
    if (input.subspecialty !== undefined) {
      fields.push('study = ?');
      values.push(input.subspecialty.trim());
    }
    if (input.technique !== undefined) {
      fields.push('technique = ?');
      values.push(input.technique.trim());
    }
    if (input.normalFindings !== undefined) {
      const findingsStr = Array.isArray(input.normalFindings)
        ? input.normalFindings.join('\n\n')
        : input.normalFindings || '';
      fields.push('findings = ?');
      values.push(findingsStr.trim());
    }
    if (input.defaultImpression !== undefined) {
      fields.push('impression = ?');
      values.push(input.defaultImpression.trim());
    }
    if (input.description !== undefined) {
      fields.push('recommendation = ?');
      values.push(input.description.trim());
    }

    if (fields.length === 0) return true;

    values.push(id);
    sqlite.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  } catch (err) {
    console.error('[templates-db] Failed to update template in sqlite:', err);
    return false;
  }
}

export function deleteSharedDbTemplate(id: string): boolean {
  try {
    const res = sqlite.prepare('DELETE FROM templates WHERE id = ?').run(id);
    return res.changes > 0;
  } catch (err) {
    console.error('[templates-db] Failed to delete template from sqlite:', err);
    return false;
  }
}

export interface CategorySummary {
  id: string;
  name: string;
  label: string;
  count: number;
  description: string;
}

export function getTemplateCategoriesSummary(): CategorySummary[] {
  const allTemplates = getAllTemplatesShared();
  const counts: Record<string, number> = {};

  for (const t of allTemplates) {
    const key = (t.modality || 'OTHER').toUpperCase();
    counts[key] = (counts[key] || 0) + 1;
  }

  // Primary categories
  const primaryOrder = ['CT', 'MRI', 'USG', 'X-RAY'];
  const categoryLabels: Record<string, { label: string; desc: string }> = {
    CT: { label: 'Computed Tomography', desc: 'Cross-sectional volumetric CT head, body, thoracic, and angiography protocols' },
    MRI: { label: 'Magnetic Resonance', desc: 'High-field multi-sequence neuro, musculoskeletal, spine, and body MRI protocols' },
    USG: { label: 'Ultrasound / Sonography', desc: 'Real-time grey-scale and colour Doppler abdominal, pelvic, and small parts protocols' },
    'X-RAY': { label: 'Plain Radiography', desc: 'Digital erect and recumbent radiography and plain film bone surveys' },
  };

  const summaries: CategorySummary[] = [];

  for (const mod of primaryOrder) {
    summaries.push({
      id: mod,
      name: mod,
      label: categoryLabels[mod]?.label || mod,
      count: counts[mod] || 0,
      description: categoryLabels[mod]?.desc || `${mod} clinical templates`,
    });
  }

  // Any other custom categories added dynamically
  for (const mod of Object.keys(counts)) {
    if (!primaryOrder.includes(mod)) {
      summaries.push({
        id: mod,
        name: mod,
        label: mod,
        count: counts[mod],
        description: `Custom ${mod} departmental templates`,
      });
    }
  }

  return summaries;
}
