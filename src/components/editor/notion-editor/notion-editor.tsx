'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { NotionEditorProps } from './notion-editor-types';

const NotionEditorViewDynamic = dynamic(
  () => import('./notion-editor-view').then((mod) => mod.NotionEditorView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[160px] rounded-lg border border-border bg-card/60 animate-pulse flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>Loading AI Canvas...</span>
        </div>
      </div>
    ),
  }
);

export function NotionEditor(props: NotionEditorProps) {
  return <NotionEditorViewDynamic {...props} />;
}
