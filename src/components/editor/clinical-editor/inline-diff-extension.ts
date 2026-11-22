import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ActiveSuggestion } from './clinical-editor-types';

export const inlineDiffPluginKey = new PluginKey('clinicalInlineDiff');

export interface InlineDiffOptions {
  onAccept?: () => void;
  onDismiss?: () => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineDiff: {
      setAiDiffSuggestion: (suggestion: ActiveSuggestion | null) => ReturnType;
    };
  }
}

function createInlineDiffWidget(
  suggestion: ActiveSuggestion,
  onAccept?: () => void,
  onDismiss?: () => void
): HTMLElement {
  const container = document.createElement('span');
  container.className =
    'ai-diff-widget inline-flex items-center gap-1.5 ml-1 px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-xs align-baseline select-none animate-in fade-in duration-150 cursor-pointer';
  container.contentEditable = 'false';

  // Proposed text badge
  const proposedText = document.createElement('span');
  proposedText.className =
    'ai-diff-proposed font-medium text-teal-700 dark:text-teal-300 opacity-80';
  proposedText.textContent = suggestion.text;
  container.appendChild(proposedText);

  // Accept hint [Tab]
  const acceptHint = document.createElement('span');
  acceptHint.className = 'text-[9px] uppercase tracking-wider text-teal-600/60 dark:text-teal-400/60 font-bold ml-1';
  acceptHint.textContent = 'TAB TO ACCEPT';
  container.appendChild(acceptHint);

  container.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAccept?.();
  };

  return container;
}

export const InlineDiffExtension = Extension.create<InlineDiffOptions>({
  name: 'inlineDiff',

  addOptions() {
    return {
      onAccept: undefined,
      onDismiss: undefined,
    };
  },

  addCommands() {
    return {
      setAiDiffSuggestion:
        (suggestion: ActiveSuggestion | null) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(inlineDiffPluginKey, { suggestion });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { onAccept, onDismiss } = this.options;

    return [
      new Plugin({
        key: inlineDiffPluginKey,
        state: {
          init() {
            return {
              suggestion: null as ActiveSuggestion | null,
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, prevState, oldState, newState) {
            const meta = tr.getMeta(inlineDiffPluginKey);

            if (meta !== undefined) {
              const suggestion: ActiveSuggestion | null = meta.suggestion;
              if (!suggestion) {
                return { suggestion: null, decorations: DecorationSet.empty };
              }

              const { from, to } = suggestion.pos;
              const docLen = newState.doc.content.size;

              if (to <= docLen) {
                const widgetDeco = Decoration.widget(
                  to,
                  () => createInlineDiffWidget(suggestion, onAccept, onDismiss),
                  { side: 1, stopEvent: () => true }
                );

                return {
                  suggestion,
                  decorations: DecorationSet.create(newState.doc, [widgetDeco]),
                };
              }

              return { suggestion: null, decorations: DecorationSet.empty };
            }

            if (tr.docChanged && prevState.suggestion) {
              // If document changed without explicitly setting suggestion, map or clear
              const mapped = prevState.decorations.map(tr.mapping, newState.doc);
              return {
                suggestion: prevState.suggestion,
                decorations: mapped,
              };
            }

            return prevState;
          },
        },
        props: {
          decorations(state) {
            return inlineDiffPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
