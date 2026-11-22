const fs = require('fs');
const ext = JSON.parse(fs.readFileSync('src/services/hmis/hospitals_extracted.json', 'utf8'));

const lines = [
  '/**',
  ` * Predefined Punjab HMIS Hospitals Directory (${ext.length} Tertiary & Specialized Hospitals)`,
  ' * Source: Punjab Health Department & HMIS Portal Login Catalog (hmis.punjab.gov.pk)',
  ' */',
  '',
  'export interface HmisHospital {',
  '  readonly id: string;',
  '  readonly name: string;',
  '}',
  '',
  'export const HMIS_HOSPITALS: readonly HmisHospital[] = [',
  ...ext.map((h) => `  { id: '${h.id}', name: ${JSON.stringify(h.name)} },`),
  '] as const;',
  '',
  '/**',
  ' * Returns a hospital by its HMIS ID, or undefined if not found.',
  ' */',
  'export function getHmisHospitalById(id: string | number): HmisHospital | undefined {',
  '  const normalizedId = String(id).trim();',
  '  return HMIS_HOSPITALS.find((h) => h.id === normalizedId);',
  '}',
  '',
  '/**',
  ' * Performs case-insensitive search by hospital name or city.',
  ' */',
  'export function searchHmisHospitals(query: string): HmisHospital[] {',
  '  const q = (query || "").trim().toLowerCase();',
  '  if (!q) return [...HMIS_HOSPITALS];',
  '  return HMIS_HOSPITALS.filter((h) => h.name.toLowerCase().includes(q) || h.id === q);',
  '}',
  '',
];

fs.writeFileSync('src/services/hmis/hmis-hospitals.data.ts', lines.join('\n'));
console.log('Formatted', ext.length, 'hospitals into', lines.length, 'lines.');
