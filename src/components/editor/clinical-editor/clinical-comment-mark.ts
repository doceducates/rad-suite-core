import { Mark, mergeAttributes } from '@tiptap/core';
import type { Range } from '@tiptap/core';
import type { Mark as PMMark } from '@tiptap/pm/model';

export interface MarkWithRange {
  mark: PMMark;
  range: Range;
}

export interface ClinicalCommentOptions {
  HTMLAttributes: Record<string, any>;
  onCommentActivated?: (commentId: string | null) => void;
}

export interface ClinicalCommentStorage {
  activeCommentId: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clinicalComment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: (commentId: string) => ReturnType;
    };
  }

  interface Storage {
    clinicalComment: ClinicalCommentStorage;
  }
}

export const ClinicalCommentExtension = Mark.create<ClinicalCommentOptions, ClinicalCommentStorage>({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentActivated: undefined,
    };
  },

  addStorage() {
    return {
      activeCommentId: null,
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => (el as HTMLSpanElement).getAttribute('data-comment-id'),
        renderHTML: (attrs) => ({ 'data-comment-id': attrs.commentId }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
        getAttrs: (el) =>
          Boolean((el as HTMLSpanElement).getAttribute('data-comment-id')?.trim()) && null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'clinical-comment-mark',
      }),
      0,
    ];
  },

  onSelectionUpdate() {
    const { $from } = this.editor.state.selection;
    const marks = $from.marks();

    if (!marks.length) {
      if (this.storage.activeCommentId !== null) {
        this.storage.activeCommentId = null;
        this.options.onCommentActivated?.(null);
      }
      return;
    }

    const commentMarkType = this.editor.schema.marks.comment;
    const activeCommentMark = marks.find((mark) => mark.type === commentMarkType);
    const newCommentId = activeCommentMark?.attrs.commentId || null;

    if (this.storage.activeCommentId !== newCommentId) {
      this.storage.activeCommentId = newCommentId;
      this.options.onCommentActivated?.(newCommentId);
    }
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }) => {
          if (!commentId) return false;
          return commands.setMark(this.name, { commentId });
        },

      unsetComment:
        (commentId: string) =>
        ({ tr, dispatch }) => {
          if (!commentId) return false;

          const marksToRemove: MarkWithRange[] = [];

          tr.doc.descendants((node, pos) => {
            const commentMark = node.marks.find(
              (mark) => mark.type.name === 'comment' && mark.attrs.commentId === commentId
            );

            if (commentMark) {
              marksToRemove.push({
                mark: commentMark,
                range: { from: pos, to: pos + node.nodeSize },
              });
            }
          });

          for (const { mark, range } of marksToRemove) {
            tr.removeMark(range.from, range.to, mark);
          }

          if (this.storage.activeCommentId === commentId) {
            this.storage.activeCommentId = null;
            this.options.onCommentActivated?.(null);
          }

          return Boolean(dispatch?.(tr));
        },
    };
  },
});
