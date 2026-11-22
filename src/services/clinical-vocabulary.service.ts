/**
 * Clinical Vocabulary & Acoustic Biasing Service (Layer 2 - Domain/Services)
 * Manages learned medical lexicon, detects unrecognized terminology,
 * and compiles acoustic condition prompts for VoiceStudio Whisper on CUDA.
 */
import fs from 'fs';
import path from 'path';

export interface VocabularyTerm {
  id: string;
  term: string;
  category: 'spine' | 'brain' | 'chest' | 'abdomen' | 'msk' | 'general' | 'abbrev';
  phoneticHint?: string;
  modality?: 'MRI' | 'CT' | 'XRAY' | 'US' | 'ALL';
  addedAt: string;
  usageCount: number;
  source: 'default' | 'user' | 'auto_detected';
}

const VOCAB_DIR = path.join(process.cwd(), 'storage', 'voice_lab');
const VOCAB_FILE = path.join(VOCAB_DIR, 'vocabulary.json');

const DEFAULT_TERMS: Omit<VocabularyTerm, 'id' | 'addedAt' | 'usageCount' | 'source'>[] = [
  // Spine
  { term: 'spondylolisthesis', category: 'spine', modality: 'ALL', phoneticHint: 'spon-dye-lo-lis-thee-sis' },
  { term: 'ligamentum flavum', category: 'spine', modality: 'MRI', phoneticHint: 'lig-a-men-tum flay-vum' },
  { term: 'thecal sac', category: 'spine', modality: 'ALL' },
  { term: 'neural foramina', category: 'spine', modality: 'ALL' },
  { term: "Schmorl's nodes", category: 'spine', modality: 'ALL' },
  { term: 'Modic changes', category: 'spine', modality: 'MRI' },
  { term: 'syringomyelia', category: 'spine', modality: 'MRI' },
  { term: 'conus medullaris', category: 'spine', modality: 'MRI' },
  { term: 'cauda equina', category: 'spine', modality: 'MRI' },
  { term: 'annular fissure', category: 'spine', modality: 'MRI' },
  { term: 'subarticular recess', category: 'spine', modality: 'ALL' },
  // Brain / Neuro
  { term: 'calvarium', category: 'brain', modality: 'ALL' },
  { term: 'encephalomalacia', category: 'brain', modality: 'ALL' },
  { term: 'periventricular leukomalacia', category: 'brain', modality: 'MRI' },
  { term: 'centrum semiovale', category: 'brain', modality: 'MRI' },
  { term: 'cerebellopontine angle', category: 'brain', modality: 'MRI' },
  { term: 'microangiopathic ischemic', category: 'brain', modality: 'ALL' },
  { term: 'extra-axial', category: 'brain', modality: 'ALL' },
  { term: 'intra-axial', category: 'brain', modality: 'ALL' },
  { term: 'arachnoid granulation', category: 'brain', modality: 'ALL' },
  // Chest
  { term: 'costophrenic angles', category: 'chest', modality: 'ALL' },
  { term: 'bronchiectasis', category: 'chest', modality: 'CT' },
  { term: 'centrilobular emphysema', category: 'chest', modality: 'CT' },
  { term: 'ground-glass opacities', category: 'chest', modality: 'CT' },
  { term: 'lymphadenopathy', category: 'chest', modality: 'ALL' },
  { term: 'cardiothoracic ratio', category: 'chest', modality: 'XRAY' },
  // Abdomen
  { term: 'cholelithiasis', category: 'abdomen', modality: 'ALL' },
  { term: 'choledocholithiasis', category: 'abdomen', modality: 'ALL' },
  { term: 'hepatic steatosis', category: 'abdomen', modality: 'ALL' },
  { term: 'hydronephrosis', category: 'abdomen', modality: 'ALL' },
  { term: 'retroperitoneal', category: 'abdomen', modality: 'ALL' },
  { term: 'mesenteric panniculitis', category: 'abdomen', modality: 'CT' },
  // MSK
  { term: 'meniscal tear', category: 'msk', modality: 'MRI' },
  { term: 'suprapatellar effusion', category: 'msk', modality: 'ALL' },
  { term: 'chondromalacia patellae', category: 'msk', modality: 'MRI' },
  { term: 'subchondral sclerosis', category: 'msk', modality: 'ALL' },
  { term: "Baker's cyst", category: 'msk', modality: 'MRI' },
  { term: 'tenosynovitis', category: 'msk', modality: 'ALL' },
  // Abbreviations & Technical
  { term: 'T1-weighted', category: 'abbrev', modality: 'MRI' },
  { term: 'T2-weighted', category: 'abbrev', modality: 'MRI' },
  { term: 'FLAIR', category: 'abbrev', modality: 'MRI' },
  { term: 'DWI/ADC', category: 'abbrev', modality: 'MRI' },
  { term: 'Hounsfield units', category: 'abbrev', modality: 'CT' },
];

function ensureStorage(): void {
  if (!fs.existsSync(VOCAB_DIR)) {
    fs.mkdirSync(VOCAB_DIR, { recursive: true });
  }
  if (!fs.existsSync(VOCAB_FILE)) {
    const initial: VocabularyTerm[] = DEFAULT_TERMS.map((t, idx) => ({
      ...t,
      id: `voc_${String(idx + 1).padStart(3, '0')}`,
      addedAt: new Date().toISOString(),
      usageCount: 1,
      source: 'default',
    }));
    fs.writeFileSync(VOCAB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export function loadVocabulary(): VocabularyTerm[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(VOCAB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveVocabulary(terms: VocabularyTerm[]): void {
  ensureStorage();
  fs.writeFileSync(VOCAB_FILE, JSON.stringify(terms, null, 2), 'utf-8');
}

export function getVocabulary(filter?: {
  modality?: string;
  category?: string;
  search?: string;
}): { terms: VocabularyTerm[]; total: number; categories: Record<string, number> } {
  let list = loadVocabulary();

  const categories: Record<string, number> = {};
  list.forEach((t) => {
    categories[t.category] = (categories[t.category] || 0) + 1;
  });

  if (filter?.category && filter.category !== 'all') {
    list = list.filter((t) => t.category === filter.category);
  }
  if (filter?.modality && filter.modality !== 'all') {
    const m = filter.modality.toUpperCase();
    list = list.filter((t) => t.modality === 'ALL' || t.modality === m);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter((t) => t.term.toLowerCase().includes(q) || t.phoneticHint?.toLowerCase().includes(q));
  }

  list.sort((a, b) => b.usageCount - a.usageCount || a.term.localeCompare(b.term));

  return { terms: list, total: list.length, categories };
}

export function addVocabularyTerm(payload: {
  term: string;
  category?: VocabularyTerm['category'];
  modality?: VocabularyTerm['modality'];
  phoneticHint?: string;
}): VocabularyTerm {
  const list = loadVocabulary();
  const cleanTerm = payload.term.trim();
  const existing = list.find((t) => t.term.toLowerCase() === cleanTerm.toLowerCase());

  if (existing) {
    existing.usageCount += 1;
    if (payload.phoneticHint) existing.phoneticHint = payload.phoneticHint;
    saveVocabulary(list);
    return existing;
  }

  const newEntry: VocabularyTerm = {
    id: `voc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    term: cleanTerm,
    category: payload.category || 'general',
    modality: payload.modality || 'ALL',
    phoneticHint: payload.phoneticHint?.trim() || undefined,
    addedAt: new Date().toISOString(),
    usageCount: 1,
    source: 'user',
  };

  list.unshift(newEntry);
  saveVocabulary(list);
  return newEntry;
}

export function removeVocabularyTerm(id: string): boolean {
  const list = loadVocabulary();
  const filtered = list.filter((t) => t.id !== id);
  if (filtered.length !== list.length) {
    saveVocabulary(filtered);
    return true;
  }
  return false;
}

/**
 * Builds an optimal acoustic prompt for Whisper ASR conditioned on the modality
 * and high-yield vocabulary hints. Whisper accepts up to ~200 tokens of initial prompt.
 */
export function buildAcousticVocabularyPrompt(modality = 'CT', studyDescription = ''): string {
  const list = loadVocabulary();
  const normModality = modality.toUpperCase();

  // Filter terms relevant to this modality or universally relevant
  const relevant = list.filter((t) => {
    if (t.modality === 'ALL') return true;
    if (normModality.includes('MR') && t.modality === 'MRI') return true;
    if (normModality.includes('CT') && t.modality === 'CT') return true;
    if ((normModality.includes('XR') || normModality.includes('X-RAY')) && t.modality === 'XRAY') return true;
    if (normModality.includes('US') && t.modality === 'US') return true;
    return false;
  });

  // Pick top 35 terms by usage count
  relevant.sort((a, b) => b.usageCount - a.usageCount);
  const picked = relevant.slice(0, 35).map((t) => t.term);

  const desc = studyDescription ? `Study: ${studyDescription}. ` : '';
  return `Radiology medical dictation. Modality: ${normModality}. ${desc}Vocabulary hints: ${picked.join(', ')}.`;
}

/**
 * Auto-detects potential medical terms or abbreviations from a report or transcript,
 * registering any new high-value clinical terms into the vocabulary store.
 */
export function autoDetectVocabularyFromText(text: string, modality = 'ALL'): string[] {
  if (!text) return [];
  const list = loadVocabulary();
  const known = new Set(list.map((t) => t.term.toLowerCase()));

  // Regex for multi-word or hyphenated anatomical/pathological expressions
  const candidateRegex = /\b[A-Za-z]+(?:-[A-Za-z]+|\s+[A-Za-z]+){1,3}\b/g;
  const matches = text.match(candidateRegex) || [];
  const newlyAdded: string[] = [];

  for (const match of matches) {
    const clean = match.trim();
    if (clean.length < 5 || clean.length > 35) continue;
    if (known.has(clean.toLowerCase())) continue;
    // Check if it looks clinical (e.g. contains disc, spine, node, cyst, fossa, ligament, artery, vein, fracture)
    if (/(?:disc|vertebra|sac|ligament|foramen|fossa|sulcus|artery|vein|nerve|fracture|effusion|stenosis|hernia|lesion|cortex|bursa|cyst|sinus|ganglion)/i.test(clean)) {
      addVocabularyTerm({
        term: clean,
        category: 'general',
        modality: (modality.toUpperCase() as any) || 'ALL',
      });
      known.add(clean.toLowerCase());
      newlyAdded.push(clean);
    }
  }

  return newlyAdded;
}
