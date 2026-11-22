import React, { useState } from 'react';
import {
  FormattingToolbar,
  BlockTypeSelect,
  BasicTextStyleButton,
  TextAlignButton,
  ColorPickerButton,
} from '@blocknote/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { executeAiBlockEdit } from './notion-ai-items';

interface NotionCustomToolbarProps {
  editor: any;
  modality?: string;
  onAiStateChange?: (loading: boolean) => void;
}

export function NotionCustomToolbar({
  editor,
  modality = 'CT',
  onAiStateChange,
}: NotionCustomToolbarProps) {
  const [loading, setLoading] = useState(false);

  const handleAiPolish = async () => {
    const selected = editor.getSelectedText();
    const pos = editor.getTextCursorPosition();
    const blockText = Array.isArray(pos.block.content)
      ? pos.block.content.map((c: any) => c.text || '').join('')
      : '';
    const textToProcess = selected || blockText;

    if (!textToProcess.trim()) return;

    setLoading(true);
    onAiStateChange?.(true);
    try {
      const polished = await executeAiBlockEdit('standardize', textToProcess, modality);
      if (selected) {
        editor.insertBlocks(
          [{ type: 'paragraph', content: polished }],
          pos.block,
          'after'
        );
      } else {
        editor.updateBlock(pos.block, { content: polished });
      }
    } catch (err) {
      console.error('[Toolbar AI Polish]', err);
    } finally {
      setLoading(false);
      onAiStateChange?.(false);
    }
  };

  return (
    <FormattingToolbar>
      <BlockTypeSelect key="blockTypeSelect" />
      <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
      <BasicTextStyleButton basicTextStyle="italic" key="italicStyleButton" />
      <BasicTextStyleButton basicTextStyle="underline" key="underlineStyleButton" />
      <BasicTextStyleButton basicTextStyle="strike" key="strikeStyleButton" />
      <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
      <TextAlignButton textAlignment="center" key="textAlignCenterButton" />
      <TextAlignButton textAlignment="right" key="textAlignRightButton" />
      <ColorPickerButton key="colorPickerButton" />

      <button
        type="button"
        onClick={handleAiPolish}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
        title="AI Standardize & Polish selected text"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span>AI Polish</span>
      </button>
    </FormattingToolbar>
  );
}
