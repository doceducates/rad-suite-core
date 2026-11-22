import type { AnatomicalStructure, AnatomicalSystemId, AnatomicalRegionId } from './schema';
import extractedRaw from './extracted_structures.json';
import clinicalRaw from './clinical_dictionary.json';

interface RawItem {
  slug: string;
  name: string;
  bundle: string;
}

interface ClinicalEntry {
  id: string;
  name: string;
  latinName: string;
  system: string;
  region: string;
  description: string;
}

const clinicalMap = clinicalRaw as Record<string, ClinicalEntry>;

export class AnatomicalDictionary {
  private static structures: AnatomicalStructure[] = [];
  private static lookupMap: Map<string, AnatomicalStructure> = new Map();
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Index audio/raw items
    const rawList = extractedRaw as RawItem[];
    for (let index = 0; index < rawList.length; index++) {
      const item = rawList[index];
      const struct: AnatomicalStructure = {
        id: `fma_${10000 + index}`,
        slug: item.slug,
        name: item.name,
        latinName: `Terminologia: ${item.name}`,
        system: 'skeletal',
        region: 'head_neck',
        description: `${item.name} (Human Body Atlas)`,
        modelMeshId: `mesh_${item.slug}`,
      };
      this.lookupMap.set(struct.id, struct);
      this.lookupMap.set(struct.slug, struct);
    }

    // 2. Index full clinical dictionary (6,847 structures)
    for (const [key, entry] of Object.entries(clinicalMap)) {
      const struct: AnatomicalStructure = {
        id: entry.id,
        slug: entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: entry.name,
        latinName: entry.latinName,
        system: (entry.system as AnatomicalSystemId) || 'skeletal',
        region: (entry.region as AnatomicalRegionId) || 'head_neck',
        description: entry.description,
        modelMeshId: entry.id,
      };
      this.lookupMap.set(key, struct);
      this.lookupMap.set(entry.id, struct);
      this.lookupMap.set(struct.slug, struct);
      this.lookupMap.set(entry.name.toLowerCase(), struct);
      this.structures.push(struct);
    }
  }

  static getAll(): AnatomicalStructure[] {
    this.initialize();
    return this.structures;
  }

  static getById(id: string): AnatomicalStructure | undefined {
    this.initialize();
    if (!id) return undefined;

    // Direct lookup
    let match = this.lookupMap.get(id);
    if (match) return match;

    // Clean structure ID if formatted e.g. "000796_Humerus_L" or "struct_000796"
    const cleanId = id.split('_')[0].replace(/^~/, '');
    match = this.lookupMap.get(cleanId);
    if (match) return match;

    // Try without leading zeros
    const unpadded = cleanId.replace(/^0+/, '');
    match = this.lookupMap.get(unpadded);
    if (match) return match;

    // Try with 6-digit zero pad
    if (/^\d+$/.test(unpadded)) {
      match = this.lookupMap.get(unpadded.padStart(6, '0'));
      if (match) return match;
    }

    // Fuzzy match by name if id contains name words
    const lower = id.toLowerCase().replace(/_/g, ' ');
    match = this.lookupMap.get(lower);
    if (match) return match;

    // Fallback: construct structure from ID/name so InfoBox always appears
    const cleanName = id.replace(/^[0-9]+_/, '').replace(/_/g, ' ');
    if (cleanName && cleanName.trim().length > 0) {
      return {
        id,
        slug: id.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: cleanName,
        latinName: `Terminologia: ${cleanName}`,
        system: 'skeletal',
        region: 'head_neck',
        description: `${cleanName} is a recognized human anatomical structure.`,
        modelMeshId: id,
      };
    }

    return undefined;
  }

  static search(query: string, limit = 20): AnatomicalStructure[] {
    this.initialize();
    const q = query.toLowerCase().trim();
    if (!q) return this.structures.slice(0, limit);
    return this.structures
      .filter((s) => s.name.toLowerCase().includes(q) || s.slug.includes(q) || s.latinName.toLowerCase().includes(q))
      .slice(0, limit);
  }

  static getBySystem(system: AnatomicalSystemId): AnatomicalStructure[] {
    this.initialize();
    return this.structures.filter((s) => s.system === system);
  }

  static getByRegion(region: AnatomicalRegionId): AnatomicalStructure[] {
    this.initialize();
    return this.structures.filter((s) => s.region === region);
  }
}
