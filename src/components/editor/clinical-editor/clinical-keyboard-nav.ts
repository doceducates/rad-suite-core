'use client';

import { Extension } from '@tiptap/core';

export interface KeyboardNavOptions {
  isSlashOpen: () => boolean;
  hasActiveSuggestion: () => boolean;
  onAcceptSuggestion: () => void;
  onDismissSuggestion: () => void;
  onCloseSlash: () => void;
  onRequestAiCompletion: () => void;
  readOnly?: boolean;
}

export const ClinicalKeyboardNav = Extension.create<KeyboardNavOptions>({
  name: 'clinicalKeyboardNav',

  addKeyboardShortcuts() {
    return {
      ArrowDown: () => {
        if (!this.options.isSlashOpen()) return false;
        window.dispatchEvent(new CustomEvent('clinical-slash-nav', { detail: 'down' }));
        return true;
      },
      ArrowUp: () => {
        if (!this.options.isSlashOpen()) return false;
        window.dispatchEvent(new CustomEvent('clinical-slash-nav', { detail: 'up' }));
        return true;
      },
      Enter: () => {
        if (!this.options.isSlashOpen()) return false;
        window.dispatchEvent(new CustomEvent('clinical-slash-nav', { detail: 'enter' }));
        return true;
      },
      Tab: () => {
        if (this.options.isSlashOpen()) {
          window.dispatchEvent(new CustomEvent('clinical-slash-nav', { detail: 'enter' }));
          return true;
        }
        if (this.options.hasActiveSuggestion()) {
          this.options.onAcceptSuggestion();
          return true;
        }
        return false;
      },
      Escape: () => {
        if (this.options.isSlashOpen()) {
          this.options.onCloseSlash();
          return true;
        }
        if (this.options.hasActiveSuggestion()) {
          this.options.onDismissSuggestion();
          return true;
        }
        return false;
      },
      'Mod-Space': () => {
        if (!this.options.readOnly) {
          this.options.onRequestAiCompletion();
          return true;
        }
        return false;
      },
      'Mod-Alt-m': () => {
        if (this.options.readOnly) return false;
        window.dispatchEvent(new CustomEvent('clinical-trigger-comment'));
        return true;
      },
      'Mod-Shift-m': () => {
        if (this.options.readOnly) return false;
        window.dispatchEvent(new CustomEvent('clinical-trigger-comment'));
        return true;
      },
      'Alt-c': () => {
        if (this.options.readOnly) return false;
        window.dispatchEvent(new CustomEvent('clinical-trigger-comment'));
        return true;
      },
      Space: () => {
        if (this.options.readOnly) return false;
        const { editor } = this;
        const { from, to } = editor.state.selection;
        if (from !== to) return false;
        const $from = editor.state.selection.$from;
        if ($from.parent.content.size === 0) {
          window.dispatchEvent(
            new CustomEvent('clinical-empty-space-ai', { detail: { pos: from } })
          );
          return true;
        }
        return false;
      },
    };
  },
});
