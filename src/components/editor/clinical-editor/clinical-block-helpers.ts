import { Editor } from '@tiptap/core';
import { CalloutType } from './clinical-callout-extension';

export interface TopLevelBlockInfo {
  start: number;
  end: number;
  node: any;
  index: number;
}

export function getTopLevelBlock(editor: Editor, pos: number): TopLevelBlockInfo | null {
  const { doc } = editor.state;
  if (!doc || doc.childCount === 0) return null;

  const clampedPos = Math.min(Math.max(0, pos), doc.content.size);
  const $pos = doc.resolve(clampedPos);

  // If cursor is inside a listItem, return the listItem block
  for (let d = $pos.depth; d >= 1; d--) {
    const node = $pos.node(d);
    if (node.type.name === 'listItem') {
      return {
        start: $pos.before(d),
        end: $pos.after(d),
        node,
        index: $pos.index(d - 1),
      };
    }
  }

  if ($pos.depth >= 1) {
    const start = $pos.before(1);
    const end = $pos.after(1);
    const node = $pos.node(1);
    const index = $pos.index(0);
    return { start, end, node, index };
  }

  const index = Math.min($pos.index(0), doc.childCount - 1);
  if (index < 0) return null;
  let start = 0;
  for (let i = 0; i < index; i++) {
    start += doc.child(i).nodeSize;
  }
  const node = doc.child(index);
  return { start, end: start + node.nodeSize, node, index };
}

export function insertBlockBelow(editor: Editor, pos: number): void {
  const block = getTopLevelBlock(editor, pos);
  if (!block) return;
  editor
    .chain()
    .focus()
    .insertContentAt(block.end, { type: 'paragraph' })
    .setTextSelection(block.end + 1)
    .run();
}

export function duplicateBlock(editor: Editor, pos: number): void {
  const block = getTopLevelBlock(editor, pos);
  if (!block) return;
  editor
    .chain()
    .focus()
    .insertContentAt(block.end, block.node.toJSON())
    .setTextSelection(block.end + 1)
    .run();
}

export function deleteBlock(editor: Editor, pos: number): void {
  const block = getTopLevelBlock(editor, pos);
  if (!block) return;
  if (editor.state.doc.childCount <= 1) {
    editor.chain().focus().setContent('<p></p>').run();
    return;
  }
  editor
    .chain()
    .focus()
    .deleteRange({ from: block.start, to: block.end })
    .run();
}

export function moveBlockUp(editor: Editor, pos: number): void {
  const block = getTopLevelBlock(editor, pos);
  if (!block || block.index <= 0) return;

  const prevNode = editor.state.doc.child(block.index - 1);
  const prevStart = block.start - prevNode.nodeSize;

  const tr = editor.state.tr;
  tr.delete(block.start, block.end);
  tr.insert(prevStart, block.node);
  editor.view.dispatch(tr);
  editor.commands.focus(prevStart + 1);
}

export function moveBlockDown(editor: Editor, pos: number): void {
  const block = getTopLevelBlock(editor, pos);
  if (!block || block.index >= editor.state.doc.childCount - 1) return;

  const nextNode = editor.state.doc.child(block.index + 1);
  const nextTarget = block.start + nextNode.nodeSize;

  const tr = editor.state.tr;
  tr.delete(block.start, block.end);
  tr.insert(nextTarget, block.node);
  editor.view.dispatch(tr);
  editor.commands.focus(nextTarget + 1);
}

export function moveBlockTo(
  editor: Editor,
  sourcePos: number,
  targetPos: number,
  insertAfter: boolean = true
): boolean {
  const source = getTopLevelBlock(editor, sourcePos);
  const target = getTopLevelBlock(editor, targetPos);
  if (!source || !target || source.index === target.index) return false;

  const tr = editor.state.tr;
  const sourceNode = source.node;

  if (source.start < target.start) {
    const insertPoint = insertAfter ? target.end : target.start;
    const adjustedInsertPoint = insertPoint - sourceNode.nodeSize;
    tr.delete(source.start, source.end);
    tr.insert(adjustedInsertPoint, sourceNode);
    editor.view.dispatch(tr);
    editor.commands.focus(adjustedInsertPoint + 1);
  } else {
    const insertPoint = insertAfter ? target.end : target.start;
    tr.delete(source.start, source.end);
    tr.insert(insertPoint, sourceNode);
    editor.view.dispatch(tr);
    editor.commands.focus(insertPoint + 1);
  }
  return true;
}

export function turnBlockInto(
  editor: Editor,
  pos: number,
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'callout',
  attrs?: { level?: 2 | 3; calloutType?: CalloutType }
): void {
  const block = getTopLevelBlock(editor, pos);
  if (!block) return;

  const focusPos = Math.min(block.start + 1, editor.state.doc.content.size);
  const chain = editor.chain().focus().setTextSelection(focusPos);

  if (type === 'paragraph') {
    if (editor.can().liftListItem('listItem')) {
      chain.liftListItem('listItem').run();
    } else {
      chain.clearNodes().setParagraph().run();
    }
  } else if (type === 'heading') {
    if (editor.can().liftListItem('listItem')) {
      chain.liftListItem('listItem').setHeading({ level: attrs?.level || 2 }).run();
    } else {
      chain.clearNodes().setHeading({ level: attrs?.level || 2 }).run();
    }
  } else if (type === 'bulletList') {
    chain.clearNodes().toggleBulletList().run();
  } else if (type === 'orderedList') {
    chain.clearNodes().toggleOrderedList().run();
  } else if (type === 'callout') {
    chain.clearNodes().toggleCallout({ type: attrs?.calloutType || 'info' }).run();
  }
}
