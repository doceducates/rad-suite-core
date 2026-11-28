/**
 * Anatomical Domain Entity Schemas
 * Adheres to FMA (Foundational Model of Anatomy) & Terminologia Anatomica 2
 */

export type AnatomicalSex = 'male' | 'female';
export type NodeSexTag = 'shared' | 'male' | 'female';

export type AnatomicalSystemId =
  | 'skeletal'
  | 'muscular'
  | 'circulatory'
  | 'nervous'
  | 'respiratory'
  | 'digestive'
  | 'urinary'
  | 'reproductive'
  | 'endocrine'
  | 'lymphatic'
  | 'integumentary';

export type AnatomicalRegionId =
  | 'head_neck'
  | 'thorax'
  | 'abdomen'
  | 'pelvis'
  | 'spine'
  | 'upper_extremity'
  | 'lower_extremity';

export interface MuscleAttachmentInfo {
  origins: string[];
  insertions: string[];
  innervation: string[];
  arterialSupply: string[];
  actions: string[];
}

export interface AnatomicalStructure {
  id: string; // e.g. "fma_62000" or slug
  slug: string; // e.g. "biceps_brachii"
  name: string; // Standard English name
  latinName: string; // Terminologia Anatomica 2 Latin
  system: AnatomicalSystemId;
  region: AnatomicalRegionId;
  description: string;
  clinicalNotes?: string;
  muscleData?: MuscleAttachmentInfo;
  pronunciationIpa?: string;
  modelMeshId?: string;
  defaultPosition?: [number, number, number]; // Anatomical XYZ in millimeters
}

export interface AnatomicalSystemMeta {
  id: AnatomicalSystemId;
  name: string;
  latinName: string;
  colorHex: string;
  defaultOpacity: number;
  structureCount: number;
}
