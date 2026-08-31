import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface SearchMatch {
  from: number;
  to: number;
}

interface SearchAndReplaceStorage {
  searchTerm: string;
  results: SearchMatch[];
  currentIndex: number;
}

function findMatches(doc: ProseMirrorNode, term: string): SearchMatch[] {
  if (!term) return [];
  const needle = term.toLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = node.text.toLowerCase();
    let index = 0;
    while (true) {
      const found = haystack.indexOf(needle, index);
      if (found === -1) break;
      matches.push({ from: pos + found, to: pos + found + needle.length });
      index = found + needle.length;
    }
  });
  return matches;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (term: string) => ReturnType;
      goToSearchResult: (direction: 'next' | 'prev') => ReturnType;
      replaceCurrentResult: (replaceTerm: string) => ReturnType;
      replaceAllResults: (replaceTerm: string) => ReturnType;
    };
  }
  interface Storage {
    searchAndReplace: SearchAndReplaceStorage;
  }
}

export const SearchAndReplace = Extension.create({
  name: 'searchAndReplace',

  addStorage(): SearchAndReplaceStorage {
    return { searchTerm: '', results: [], currentIndex: -1 };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ editor }) => {
          const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
          storage.searchTerm = term;
          storage.results = findMatches(editor.state.doc, term);
          storage.currentIndex = storage.results.length ? 0 : -1;
          editor.view.dispatch(editor.state.tr);
          return true;
        },
      goToSearchResult:
        (direction: 'next' | 'prev') =>
        ({ editor }) => {
          const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
          if (!storage.results.length) return false;
          storage.currentIndex =
            direction === 'next'
              ? (storage.currentIndex + 1) % storage.results.length
              : (storage.currentIndex - 1 + storage.results.length) % storage.results.length;
          const match = storage.results[storage.currentIndex];
          editor.chain().setTextSelection(match).scrollIntoView().run();
          return true;
        },
      replaceCurrentResult:
        (replaceTerm: string) =>
        ({ editor, tr, dispatch }) => {
          const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
          const match = storage.results[storage.currentIndex];
          if (!match) return false;
          if (dispatch) {
            tr.insertText(replaceTerm, match.from, match.to);
            dispatch(tr);
            storage.results = findMatches(editor.state.doc, storage.searchTerm);
            storage.currentIndex = storage.results.length
              ? Math.min(storage.currentIndex, storage.results.length - 1)
              : -1;
          }
          return true;
        },
      replaceAllResults:
        (replaceTerm: string) =>
        ({ editor, tr, dispatch }) => {
          const storage = editor.storage.searchAndReplace as SearchAndReplaceStorage;
          if (!storage.results.length) return false;
          if (dispatch) {
            [...storage.results]
              .reverse()
              .forEach((match) => tr.insertText(replaceTerm, match.from, match.to));
            dispatch(tr);
            storage.results = [];
            storage.currentIndex = -1;
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;
    return [
      new Plugin({
        key: new PluginKey('searchAndReplace'),
        props: {
          decorations(state) {
            const storage = extensionThis.editor.storage.searchAndReplace as SearchAndReplaceStorage;
            if (!storage.searchTerm || !storage.results.length) return null;
            const decorations = storage.results.map((match, index) =>
              Decoration.inline(match.from, match.to, {
                class: index === storage.currentIndex ? 'search-result-current' : 'search-result',
              })
            );
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
