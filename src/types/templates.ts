export interface CrossSectionalTemplate {
  id: string;
  name: string;
  modality: 'CT' | 'MRI';
  subspecialty: 'Neuroradiology' | 'Abdominal' | 'Thoracic' | 'Musculoskeletal' | 'Head & Neck' | 'Vascular' | 'Pediatric';
  description: string;
  subtitle?: string;
  technique: string;
  normalFindings: string[];
  defaultImpression: string;
}

export type HmisNormalTemplate = CrossSectionalTemplate;
