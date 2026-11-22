export interface CollabUserInfo {
  name: string;
  color: string;
  id?: string;
  [key: string]: unknown;
}

export interface NotionEditorProps {
  initialContent?: string;
  onChange?: (html: string, markdown: string) => void;
  placeholder?: string;
  minHeight?: string;
  modality?: string;
  roomId?: string;
  collabUser?: CollabUserInfo;
  readOnly?: boolean;
  className?: string;
  frameless?: boolean;
}

export interface AiActionItem {
  id: string;
  title: string;
  subtext: string;
  badge?: string;
  action: 'impression' | 'standardize' | 'simplify' | 'custom';
  customPrompt?: string;
}
