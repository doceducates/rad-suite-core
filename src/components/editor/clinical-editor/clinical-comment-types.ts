// Layer 4 (Presentation): Clinical Comment & Discussion Thread Data Contracts
export type ClinicalCommentColor = 'amber' | 'indigo' | 'teal' | 'rose' | 'sky';

export interface ClinicalCommentAttachment {
  name: string;
  url: string; // Base64 data URL or local object URL
  type: string; // 'image/png', 'image/jpeg', 'audio/webm', 'audio/wav', etc.
  size?: number;
  duration?: number; // For audio recordings in seconds
}

export interface ClinicalCommentItem {
  id: string;
  quotedText?: string;
  authorId?: string;
  authorName: string;
  authorRole: 'resident' | 'consultant' | 'radiologist' | 'admin';
  comment: string;
  createdAt: string;
  resolved?: boolean;
  blockPos?: number;
  blockIndex?: number;
  color?: ClinicalCommentColor;
  attachment?: ClinicalCommentAttachment;
}

export type CommentColorPalette = {
  label: string;
  bg: string;
  border: string;
  text: string;
  ring: string;
  dot: string;
};

export const COMMENT_COLOR_PALETTES: Record<ClinicalCommentColor, CommentColorPalette> = {
  amber: {
    label: 'Amber (Review)',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'hover:border-amber-500/60 ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  indigo: {
    label: 'Indigo (Consultant)',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'hover:border-indigo-500/60 ring-indigo-500/30',
    dot: 'bg-indigo-500',
  },
  teal: {
    label: 'Teal (Verified)',
    bg: 'bg-teal-500/15',
    border: 'border-teal-500/40',
    text: 'text-teal-600 dark:text-teal-400',
    ring: 'hover:border-teal-500/60 ring-teal-500/30',
    dot: 'bg-teal-500',
  },
  rose: {
    label: 'Rose (Critical/Urgent)',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'hover:border-rose-500/60 ring-rose-500/30',
    dot: 'bg-rose-500',
  },
  sky: {
    label: 'Sky (Peer Note)',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/40',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'hover:border-sky-500/60 ring-sky-500/30',
    dot: 'bg-sky-500',
  },
};

export interface CommentCoordinates {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/**
 * Calculates responsive comment card coordinates.
 * When right margin space is available (>=220px), positions the comment card
 * in the free right space outside the editor so it NEVER obscures clinical findings.
 * On smaller screens or tight margins, gracefully centers as a floating modal.
 */
export function computeSmartCommentCoords(
  containerEl: HTMLElement | null,
  lineTop: number | null
): { top: number; left: number } {
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Fallback to center on mobile or when container is missing
  if (windowWidth < 768 || !containerEl) {
    return {
      top: Math.max(60, (windowHeight - 340) / 2),
      left: Math.max(12, (windowWidth - 320) / 2),
    };
  }

  const containerRect = containerEl.getBoundingClientRect();
  const spaceToRight = windowWidth - containerRect.right;
  const targetTop = Math.max(70, Math.min(lineTop ?? containerRect.top + 20, windowHeight - 380));

  // If there is >= 220px free space to the right of the editor container
  if (spaceToRight >= 220) {
    return {
      top: targetTop,
      left: Math.min(containerRect.right + 16, windowWidth - 310),
    };
  }

  // Narrow screen fallback: center on screen so it never covers findings
  return {
    top: Math.max(60, (windowHeight - 340) / 2),
    left: Math.max(12, (windowWidth - 320) / 2),
  };
}
