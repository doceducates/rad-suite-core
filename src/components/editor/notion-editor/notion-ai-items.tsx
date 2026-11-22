import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import { Sparkles, CheckCircle2, HeartHandshake, ShieldCheck } from 'lucide-react';
import React from 'react';

export async function executeAiBlockEdit(
  action: 'impression' | 'standardize' | 'simplify' | 'custom',
  text: string,
  modality = 'CT',
  customPrompt?: string
): Promise<string> {
  try {
    const res = await fetch('/api/ai/edit-block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, text, modality, customPrompt }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to process AI edit');
    }
    return data.result;
  } catch (err: any) {
    console.error('[AI Block Edit]', err);
    throw err;
  }
}

export function getRadSuiteSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  modality = 'CT',
  onLoading?: (isLoading: boolean) => void
) {
  const defaultItems = getDefaultReactSlashMenuItems(editor);

  const getFullEditorText = (): string => {
    return editor.document
      .map((block: any) => {
        if (Array.isArray(block.content)) {
          return block.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  };

  const aiItems = [
    {
      title: 'Synthesize Impression',
      subtext: 'Analyze drafted findings to generate numbered impressions',
      aliases: ['ai', 'impression', 'imp', 'diagnose'],
      group: 'Rad Suite AI',
      badge: 'AI',
      icon: <Sparkles className="w-4 h-4 text-primary" />,
      onItemClick: async () => {
        const text = getFullEditorText();
        if (!text.trim()) return;

        onLoading?.(true);
        try {
          const result = await executeAiBlockEdit('impression', text, modality);
          const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
          const pos = editor.getTextCursorPosition();
          const newBlocks = lines.map(line => ({
            type: 'numberedListItem' as const,
            content: line.replace(/^\d+[\.\)]\s*/, ''),
          }));
          editor.insertBlocks(newBlocks, pos.block, 'after');
        } finally {
          onLoading?.(false);
        }
      },
    },
    {
      title: 'Standardize & Clean Phrasing',
      subtext: 'Normalize dimensions, laterality, and ACR terminology',
      aliases: ['standardize', 'clean', 'fix', 'discrepancy'],
      group: 'Rad Suite AI',
      badge: 'AI',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      onItemClick: async () => {
        const pos = editor.getTextCursorPosition();
        const blockText = Array.isArray(pos.block.content)
          ? pos.block.content.map((c: any) => c.text || '').join('')
          : '';
        const targetText = blockText.trim() || getFullEditorText();
        if (!targetText.trim()) return;

        onLoading?.(true);
        try {
          const result = await executeAiBlockEdit('standardize', targetText, modality);
          editor.updateBlock(pos.block, {
            content: result,
          });
        } finally {
          onLoading?.(false);
        }
      },
    },
    {
      title: 'Patient Discharge Summary',
      subtext: 'Generate reassuring, simplified explanation for patient',
      aliases: ['patient', 'simplify', 'discharge'],
      group: 'Rad Suite AI',
      badge: 'AI',
      icon: <HeartHandshake className="w-4 h-4 text-violet-500" />,
      onItemClick: async () => {
        const text = getFullEditorText();
        if (!text.trim()) return;

        onLoading?.(true);
        try {
          const result = await executeAiBlockEdit('simplify', text, modality);
          const pos = editor.getTextCursorPosition();
          editor.insertBlocks(
            [
              {
                type: 'paragraph' as const,
                props: { textColor: 'blue' },
                content: `ℹ️ ${result}`,
              },
            ],
            pos.block,
            'after'
          );
        } finally {
          onLoading?.(false);
        }
      },
    },
    {
      title: 'Normal Survey Negatives',
      subtext: 'Insert baseline pertinent negatives for imaged organ systems',
      aliases: ['normal', 'survey', 'negatives'],
      group: 'Rad Suite AI',
      badge: 'Normal',
      icon: <ShieldCheck className="w-4 h-4 text-sky-500" />,
      onItemClick: () => {
        const pos = editor.getTextCursorPosition();
        editor.insertBlocks(
          [
            {
              type: 'paragraph' as const,
              content: 'No acute intracranial hemorrhage, mass effect, or midline shift.',
            },
            {
              type: 'paragraph' as const,
              content: 'Ventricles, basal cisterns, and cortical sulci are within normal limits.',
            },
            {
              type: 'paragraph' as const,
              content: 'Major intracranial vascular flow-voids appear intact.',
            },
          ],
          pos.block,
          'after'
        );
      },
    },
  ];

  return [...aiItems, ...defaultItems];
}

export { filterSuggestionItems };
