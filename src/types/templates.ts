export interface CrossSectionalTemplate {
  id: string;
  name: string;
  modality: 'CT' | 'MRI' | 'USG' | 'X-Ray' | string;
  subspecialty: string;
  category?: string;
  description: string;
  subtitle?: string;
  technique: string;
  normalFindings: string[];
  defaultImpression: string;
  isCustom?: boolean;
  createdBy?: string | null;
  createdAt?: string;
}

export type HmisNormalTemplate = CrossSectionalTemplate;
