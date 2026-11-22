// Layer 2 / Types: Sign-Out Discussion & Surgical Delta Patch Contracts

export interface AbnormalityPreset {
  label: string;
  text: string;
  impression?: string;
}

export interface AnatomicalSection {
  id: string;
  heading: string;
  shortLabel: string;
  normalStandardized: string;
  normalHmis: string;
  commonAbnormalities?: AbnormalityPreset[];
}

export interface SignoutTemplate {
  id: string;
  modalityKey: string;
  title: string;
  techniqueStandardized: string;
  techniqueHmis: string;
  defaultHistory: string;
  quickLevels: string[];
  sections: AnatomicalSection[];
  normalImpression: string[];
}

export interface ConsultantPatchResult {
  patchedSections: Record<string, string>;
  patchedImpression: string[];
  changesSummary: string[];
}

export interface ExtractedPositiveSection extends AnatomicalSection {
  currentText: string;
  isPositive: boolean;
  baselineNormal: string;
}
