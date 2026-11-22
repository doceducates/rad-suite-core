// Layer 4 (Presentation): Clinical Editor In-Document Search & Replace Extension
import { Extension, type Range } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SearchAndReplaceOptions {
  searchResultClass: string;
  disableRegex: boolean;
}

export interface SearchAndReplaceStorage {
  searchTerm: string;
  replaceTerm: string;
  results: Range[];
  lastSearchTerm: string;
  caseSensitive: boolean;
  resultIndex: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (searchTerm: string) => ReturnType;
      setReplaceTerm: (replaceTerm: string) => ReturnType;
      setCaseSensitive: (caseSensitive: boolean) => ReturnType;
      nextSearchResult: () => ReturnType;
      previousSearchResult: () => ReturnType;
      replace: () => ReturnType;
      replaceAll: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }

  interface Storage {
    searchAndReplace: SearchAndReplaceStorage;
  }
}

export const searchAndReplacePluginKey = new PluginKey('searchAndReplacePlugin');

function getRegex(s: string, disableRegex: boolean, caseSensitive: boolean): RegExp {
  return new RegExp(
    disableRegex ? s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : s,
    caseSensitive ? 'gu' : 'gui'
  );
}

function processSearches(
  doc: PMNode,
  regex: RegExp,
  className: string,
  resultIndex: number
): { decorations: DecorationSet; results: Range[] } {
  const decorations: Decoration[] = [];
  const results: Range[] = [];
  const textNodes: Array<{ text: string; pos: number }> = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      textNodes.push({ text: node.text, pos });
    }
  });

  for (const { text, pos } of textNodes) {
    const matches = Array.from(text.matchAll(regex));
    for (const match of matches) {
      if (!match[0]) break;
      if (match.index !== undefined) {
        results.push({
          from: pos + match.index,
          to: pos + match.index + match[0].length,
        });
      }
    }
  }

  results.forEach((r, i) => {
    const currentClass = i === resultIndex ? `${className} ${className}-current` : className;
    decorations.push(Decoration.inline(r.from, r.to, { class: currentClass }));
  });

  return { decorations: DecorationSet.create(doc, decorations), results };
}

export const ClinicalSearchReplace = Extension.create<SearchAndReplaceOptions, SearchAndReplaceStorage>({
  name: 'searchAndReplace',

  addOptions() {
    return {
      searchResultClass: 'search-result',
      disableRegex: true,
    };
  },

  addStorage() {
    return {
      searchTerm: '',
      replaceTerm: '',
      results: [],
      lastSearchTerm: '',
      caseSensitive: false,
      resultIndex: 0,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (searchTerm: string) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.searchTerm = searchTerm;
          editor.storage.searchAndReplace.resultIndex = 0;
          return true;
        },

      setReplaceTerm:
        (replaceTerm: string) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.replaceTerm = replaceTerm;
          return true;
        },

      setCaseSensitive:
        (caseSensitive: boolean) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.caseSensitive = caseSensitive;
          return true;
        },

      clearSearch:
        () =>
        ({ editor }) => {
          editor.storage.searchAndReplace.searchTerm = '';
          editor.storage.searchAndReplace.replaceTerm = '';
          editor.storage.searchAndReplace.results = [];
          editor.storage.searchAndReplace.resultIndex = 0;
          return true;
        },

      nextSearchResult:
        () =>
        ({ editor }) => {
          const { results, resultIndex } = editor.storage.searchAndReplace;
          if (results.length === 0) return false;
          editor.storage.searchAndReplace.resultIndex = (resultIndex + 1) % results.length;
          return true;
        },

      previousSearchResult:
        () =>
        ({ editor }) => {
          const { results, resultIndex } = editor.storage.searchAndReplace;
          if (results.length === 0) return false;
          editor.storage.searchAndReplace.resultIndex =
            resultIndex - 1 < 0 ? results.length - 1 : resultIndex - 1;
          return true;
        },

      replace:
        () =>
        ({ editor, tr, dispatch }) => {
          const { replaceTerm, results, resultIndex } = editor.storage.searchAndReplace;
          const current = results[resultIndex];
          if (!current || !dispatch) return false;

          tr.insertText(replaceTerm, current.from, current.to);
          dispatch(tr);
          return true;
        },

      replaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          const { replaceTerm, results } = editor.storage.searchAndReplace;
          if (!results.length || !dispatch) return false;

          let offset = 0;
          for (const { from, to } of results) {
            tr.insertText(replaceTerm, from + offset, to + offset);
            offset += replaceTerm.length - (to - from);
          }
          dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const { searchResultClass, disableRegex } = this.options;

    return [
      new Plugin({
        key: searchAndReplacePluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, oldDecorations, oldState, newState) {
            const { searchTerm, caseSensitive, resultIndex } = editor.storage.searchAndReplace;
            if (!searchTerm.trim()) {
              editor.storage.searchAndReplace.results = [];
              return DecorationSet.empty;
            }

            try {
              const regex = getRegex(searchTerm, disableRegex, caseSensitive);
              const { decorations, results } = processSearches(
                newState.doc,
                regex,
                searchResultClass,
                resultIndex
              );
              editor.storage.searchAndReplace.results = results;
              return decorations;
            } catch {
              return oldDecorations;
            }
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
