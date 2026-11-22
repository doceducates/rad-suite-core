'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { TipTapToolbar } from './tiptap-toolbar';
import { useEffect } from 'react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Type diagnostic findings or clinical notes...',
  minHeight = '140px',
}: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none p-3 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100 prose prose-sm dark:prose-invert max-w-none',
        style: 'min-height: ' + minHeight + ';',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      if (editor.getText() === '' && content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-[#0c121e] focus-within:ring-1 focus-within:ring-primary/50 transition-all">
      <TipTapToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
