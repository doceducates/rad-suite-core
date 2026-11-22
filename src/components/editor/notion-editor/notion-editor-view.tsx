'use client';

import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController, FormattingToolbarController } from '@blocknote/react';
import { withCollaboration } from '@blocknote/core/yjs';
import { useTheme } from '@/components/theme-provider';
import { useEffect, useMemo, useState, useRef } from 'react';
import { NotionEditorProps } from './notion-editor-types';
import { createCollabSession } from './notion-collab';
import { getRadSuiteSlashMenuItems, filterSuggestionItems } from './notion-ai-items';
import { NotionCustomToolbar } from './notion-toolbar';
import { Sparkles, Users } from 'lucide-react';

export function NotionEditorView({
  initialContent,
  onChange,
  minHeight = '180px',
  modality = 'CT',
  roomId,
  collabUser,
  readOnly = false,
  className = '',
  frameless = false,
}: NotionEditorProps) {
  const { theme, resolvedTheme } = useTheme();
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasLoadedInitial = useRef(false);
  const lastEmittedHtml = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const collabSession = useMemo(() => {
    if (!roomId) return null;
    return createCollabSession(roomId, collabUser);
  }, [roomId, collabUser]);

  useEffect(() => {
    return () => {
      collabSession?.cleanup();
    };
  }, [collabSession]);

  const editor = useCreateBlockNote(
    collabSession?.provider
      ? withCollaboration({
          collaboration: {
            fragment: collabSession.fragment,
            provider: collabSession.provider,
            user: collabUser || { name: 'Dr. Radiologist', color: '#0284c7' },
          },
        })
      : {},
    [collabSession, collabUser]
  );

  useEffect(() => {
    if (!editor || !initialContent) return;
    if (
      !hasLoadedInitial.current ||
      (lastEmittedHtml.current !== null && initialContent !== lastEmittedHtml.current) ||
      (lastEmittedHtml.current === null && hasLoadedInitial.current && initialContent)
    ) {
      const populate = async () => {
        try {
          const blocks = initialContent.trim().startsWith('<')
            ? await editor.tryParseHTMLToBlocks(initialContent)
            : await editor.tryParseMarkdownToBlocks(initialContent);
          if (blocks && blocks.length > 0) {
            editor.replaceBlocks(editor.document, blocks);
            hasLoadedInitial.current = true;
            lastEmittedHtml.current = initialContent;
          }
        } catch (err) {
          console.warn('[NotionEditor] Failed to parse initial content:', err);
        }
      };
      populate();
    }
  }, [editor, initialContent]);

  const handleEditorChange = async () => {
    if (!onChange || !editor) return;
    try {
      const html = await editor.blocksToFullHTML(editor.document);
      const md = await editor.blocksToMarkdownLossy(editor.document);
      lastEmittedHtml.current = html;
      onChange(html, md);
    } catch {
      // fallback
    }
  };

  if (!mounted || !editor) {
    return (
      <div
        className="w-full animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center text-xs text-muted-foreground"
        style={{ minHeight }}
      >
        Initializing Rad Suite Notion Canvas...
      </div>
    );
  }

  const currentTheme = (theme || resolvedTheme) === 'dark' ? 'dark' : 'light';

  const editorBody = (
    <div style={{ minHeight }} className={frameless ? 'py-0.5' : 'p-2'}>
      <BlockNoteView
        editor={editor}
        theme={currentTheme}
        editable={!readOnly}
        slashMenu={false}
        formattingToolbar={false}
        onChange={handleEditorChange}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              getRadSuiteSlashMenuItems(editor, modality, setIsAiRunning),
              query
            )
          }
        />
        <FormattingToolbarController
          formattingToolbar={() => (
            <NotionCustomToolbar
              editor={editor}
              modality={modality}
              onAiStateChange={setIsAiRunning}
            />
          )}
        />
      </BlockNoteView>
    </div>
  );

  if (frameless) {
    return (
      <div
        data-color-scheme={currentTheme}
        className={`relative w-full text-on-surface select-text transition-all ${className}`}
      >
        {editorBody}
      </div>
    );
  }

  return (
    <div
      data-color-scheme={currentTheme}
      className={`relative rounded-lg border border-border bg-card text-card-foreground shadow-xs overflow-hidden transition-all ${className}`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            BlockNote Notion Canvas
          </span>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
            Type / for Rad Suite AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          {roomId && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Users className="w-3 h-3" />
              <span>Peer Sync</span>
            </span>
          )}
          {isAiRunning && (
            <span className="flex items-center gap-1 text-primary animate-pulse font-medium">
              <Sparkles className="w-3 h-3" />
              <span>AI Synthesizing...</span>
            </span>
          )}
        </div>
      </div>
      {editorBody}
    </div>
  );
}
