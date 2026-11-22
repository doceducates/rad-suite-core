export interface OrganSlot {
  slotId: string;
  organName: string;
  keywords: string[];
  normalText: string;
}

export interface SlotTemplate {
  id: string;
  name: string;
  modality: 'CT' | 'MRI' | 'US' | 'X-RAY';
  bodyPart: string;
  technique: string;
  slots: OrganSlot[];
  defaultImpression: string;
}

export interface SlotMergeResult {
  technique: string;
  findingsHtml: string;
  activeSlots: Array<{
    slotId: string;
    organName: string;
    status: 'normal' | 'replaced';
    text: string;
    originalNormal?: string;
  }>;
  suppressedNormalsCount: number;
}
