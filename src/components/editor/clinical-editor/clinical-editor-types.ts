export type ClinicalEditorViewMode = 'fullscreen' | 'split' | 'floating' | 'mobile';

export interface PatientContext {
  age?: number;
  gender?: string;
  clinicalHistory?: string;
  modality?: string;
  studyDescription?: string;
  templateId?: string;
}

export interface ClinicalEditorProps {
  content: string;
  onChange: (html: string, markdown?: string) => void;
  placeholder?: string;
  minHeight?: string;
  modality?: string;
  patientContext?: PatientContext;
  activeSection?: 'history' | 'findings' | 'impression';
  viewMode?: ClinicalEditorViewMode;
  readOnly?: boolean;
  className?: string;
  frameless?: boolean;
  onAiAction?: (actionName: string) => void;
  studyId?: string;
}

export interface SlashMenuItem {
  title: string;
  subtext: string;
  aliases: string[];
  group: 'Templates' | 'AI Actions' | 'Pertinent Negatives' | 'Formatting';
  badge?: string;
  iconName: string;
  action: (editor: any) => void | Promise<void>;
}

export interface ActiveSuggestion {
  text: string;
  matchedOrgan?: string;
  category: 'completion' | 'structured_finding' | 'impression';
  draftPrefix: string;
  pos: { from: number; to: number };
}

export interface SlashMenuState {
  isOpen: boolean;
  query: string;
  pos: { from: number; to: number };
  coords: { top: number; left: number } | null;
}
