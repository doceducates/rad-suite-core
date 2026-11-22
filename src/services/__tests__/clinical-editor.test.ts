// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ClinicalCalloutExtension } from '@/components/editor/clinical-editor/clinical-callout-extension';
import {
  getTopLevelBlock,
  insertBlockBelow,
  duplicateBlock,
  deleteBlock,
  moveBlockUp,
  moveBlockDown,
  moveBlockTo,
  turnBlockInto,
} from '@/components/editor/clinical-editor/clinical-block-helpers';
import { getClinicalSlashItems } from '@/components/editor/clinical-editor/clinical-slash-items';

describe('Clinical Editor & Notion Block Engine Automated Suite', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        ClinicalCalloutExtension,
      ],
      content: '<p>First line of clinical findings</p><p>Second line of findings</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('1. List Operations (Bullet & Numbered Lists)', () => {
    it('should turn a paragraph into a bullet list and generate genuine <ul> and <li> tags', () => {
      turnBlockInto(editor, 1, 'bulletList');
      const html = editor.getHTML();
      expect(html).toContain('<ul>');
      expect(html).toContain('<li><p>First line of clinical findings</p></li>');
    });

    it('should turn a paragraph into a numbered list and generate genuine <ol> and <li> tags', () => {
      turnBlockInto(editor, 1, 'orderedList');
      const html = editor.getHTML();
      expect(html).toContain('<ol>');
      expect(html).toContain('<li><p>First line of clinical findings</p></li>');
    });

    it('should convert a bullet list item cleanly back into a standard paragraph', () => {
      turnBlockInto(editor, 1, 'bulletList');
      expect(editor.getHTML()).toContain('<ul>');

      // Convert back to paragraph
      turnBlockInto(editor, 1, 'paragraph');
      const html = editor.getHTML();
      expect(html).not.toContain('<ul>');
      expect(html).toContain('<p>First line of clinical findings</p>');
    });

    it('should convert an ordered list into a bullet list without text corruption', () => {
      turnBlockInto(editor, 1, 'orderedList');
      expect(editor.getHTML()).toContain('<ol>');

      turnBlockInto(editor, 1, 'bulletList');
      const html = editor.getHTML();
      expect(html).toContain('<ul>');
      expect(html).not.toContain('<ol>');
      expect(html).toContain('First line of clinical findings');
    });
  });

  describe('2. Heading Operations (H2 & H3)', () => {
    it('should turn a paragraph into a Heading 2 for Organ sections', () => {
      turnBlockInto(editor, 1, 'heading', { level: 2 });
      const html = editor.getHTML();
      expect(html).toContain('<h2>First line of clinical findings</h2>');
    });

    it('should turn a paragraph into a Heading 3 for sub-sections', () => {
      turnBlockInto(editor, 1, 'heading', { level: 3 });
      const html = editor.getHTML();
      expect(html).toContain('<h3>First line of clinical findings</h3>');
    });

    it('should convert a Heading 2 back into a normal paragraph', () => {
      turnBlockInto(editor, 1, 'heading', { level: 2 });
      expect(editor.getHTML()).toContain('<h2>');

      turnBlockInto(editor, 1, 'paragraph');
      expect(editor.getHTML()).toContain('<p>First line of clinical findings</p>');
      expect(editor.getHTML()).not.toContain('<h2>');
    });

    it('should convert a list item into a heading cleanly by lifting out of list', () => {
      turnBlockInto(editor, 1, 'bulletList');
      expect(editor.getHTML()).toContain('<ul>');

      turnBlockInto(editor, 1, 'heading', { level: 2 });
      const html = editor.getHTML();
      expect(html).toContain('<h2>First line of clinical findings</h2>');
    });
  });

  describe('3. Clinical Callout Boxes (Critical & Recommendation Cards)', () => {
    it('should wrap a block into a Critical Finding Callout (red alert box)', () => {
      turnBlockInto(editor, 1, 'callout', { calloutType: 'critical' });
      const html = editor.getHTML();
      expect(html).toContain('data-callout-type="critical"');
      expect(html).toContain('callout-critical');
    });

    it('should wrap a block into a Recommendation Callout (secondary guidance box)', () => {
      turnBlockInto(editor, 1, 'callout', { calloutType: 'recommendation' });
      const html = editor.getHTML();
      expect(html).toContain('data-callout-type="recommendation"');
      expect(html).toContain('callout-recommendation');
    });

    it('should convert a callout box back to a plain paragraph', () => {
      turnBlockInto(editor, 1, 'callout', { calloutType: 'critical' });
      expect(editor.getHTML()).toContain('callout-critical');

      turnBlockInto(editor, 1, 'paragraph');
      const html = editor.getHTML();
      expect(html).not.toContain('callout-critical');
      expect(html).toContain('<p>First line of clinical findings</p>');
    });
  });

  describe('4. Notion Block Structural Helpers', () => {
    it('should resolve top-level block info accurately', () => {
      const block = getTopLevelBlock(editor, 1);
      expect(block).not.toBeNull();
      expect(block?.index).toBe(0);
      expect(block?.node.type.name).toBe('paragraph');
      expect(block?.node.textContent).toBe('First line of clinical findings');
    });

    it('should insert a new block directly below the target block', () => {
      const initialCount = editor.state.doc.childCount;
      insertBlockBelow(editor, 1);
      expect(editor.state.doc.childCount).toBe(initialCount + 1);
      expect(editor.state.doc.child(1).textContent).toBe('');
    });

    it('should duplicate a block with its exact contents', () => {
      const initialCount = editor.state.doc.childCount;
      duplicateBlock(editor, 1);
      expect(editor.state.doc.childCount).toBe(initialCount + 1);
      expect(editor.state.doc.child(1).textContent).toBe('First line of clinical findings');
    });

    it('should delete a block cleanly', () => {
      deleteBlock(editor, 1);
      expect(editor.state.doc.childCount).toBe(1);
      expect(editor.state.doc.child(0).textContent).toBe('Second line of findings');
    });

    it('should reorder blocks using moveBlockDown and moveBlockUp', () => {
      // Initially: [0] = First, [1] = Second
      expect(editor.state.doc.child(0).textContent).toBe('First line of clinical findings');

      moveBlockDown(editor, 1);
      // After moveDown: [0] = Second, [1] = First
      expect(editor.state.doc.child(0).textContent).toBe('Second line of findings');
      expect(editor.state.doc.child(1).textContent).toBe('First line of clinical findings');

      // Now move it back up
      const secondBlockPos = editor.state.doc.child(0).nodeSize + 1;
      moveBlockUp(editor, secondBlockPos);
      expect(editor.state.doc.child(0).textContent).toBe('First line of clinical findings');
      expect(editor.state.doc.child(1).textContent).toBe('Second line of findings');
    });

    it('should move block to target position via moveBlockTo (drag-and-drop)', () => {
      editor.commands.setContent('<p>Alpha</p><p>Beta</p><p>Gamma</p>');
      expect(editor.state.doc.child(0).textContent).toBe('Alpha');

      // Drag Alpha (pos 1) to after Gamma
      const gammaPos = editor.state.doc.child(0).nodeSize + editor.state.doc.child(1).nodeSize + 1;
      const moved = moveBlockTo(editor, 1, gammaPos, true);
      expect(moved).toBe(true);

      // New order should be: Beta, Gamma, Alpha
      expect(editor.state.doc.child(0).textContent).toBe('Beta');
      expect(editor.state.doc.child(1).textContent).toBe('Gamma');
      expect(editor.state.doc.child(2).textContent).toBe('Alpha');
    });
  });

  describe('5. Slash Menu Items Integration', () => {
    it('should include list, heading, callout, and survey commands in slash menu', () => {
      const items = getClinicalSlashItems(editor, 'CT');
      const titles = items.map((i) => i.title);

      expect(titles).toContain('Bulleted List');
      expect(titles).toContain('Numbered Impression List');
      expect(titles).toContain('Heading 2 (Section Title)');
      expect(titles).toContain('Heading 3 (Sub-section)');
      expect(titles).toContain('Critical Finding Callout Box');
      expect(titles).toContain('Recommendation Callout Box');
      expect(titles).toContain('Clinical Note Callout Box');
      expect(titles).toContain('Normal CT Chest Survey');
    });

    it('should include dot-phrase clinical templates for spine, brain, knee, and pulmonary embolism', () => {
      const items = getClinicalSlashItems(editor, 'MRI');
      const titles = items.map((i) => i.title);

      expect(titles).toContain('Normal MRI Lumbar Spine (LS Spine)');
      expect(titles).toContain('Normal MRI Cervical Spine (C-Spine)');
      expect(titles).toContain('Normal MRI Knee Survey');
      expect(titles).toContain('Negative Acute Pulmonary Embolism (CTPA)');
      expect(titles).toContain('Normal Brain Survey Negatives');

      const lsSpine = items.find((i) => i.title === 'Normal MRI Lumbar Spine (LS Spine)');
      expect(lsSpine?.aliases).toContain('normls');
      expect(lsSpine?.aliases).toContain('spine');

      const brain = items.find((i) => i.title === 'Normal Brain Survey Negatives');
      expect(brain?.aliases).toContain('normbrain');

      const pe = items.find((i) => i.title === 'Negative Acute Pulmonary Embolism (CTPA)');
      expect(pe?.aliases).toContain('normpe');
    });

    it('should insert Normal MRI Lumbar Spine content with lordosis and conus medullaris', () => {
      const items = getClinicalSlashItems(editor, 'MRI');
      const lsSpine = items.find((i) => i.title === 'Normal MRI Lumbar Spine (LS Spine)');
      expect(lsSpine).toBeDefined();

      lsSpine?.action(editor);
      const html = editor.getHTML();
      expect(html).toContain('lumbar lordosis');
      expect(html).toContain('Conus Medullaris');
    });

    it('should execute Bulleted List action from slash menu', () => {
      const items = getClinicalSlashItems(editor, 'CT');
      const bulletItem = items.find((i) => i.title === 'Bulleted List');
      expect(bulletItem).toBeDefined();

      bulletItem?.action(editor);
      expect(editor.getHTML()).toContain('<ul>');
    });

    it('should execute Numbered List action from slash menu', () => {
      const items = getClinicalSlashItems(editor, 'CT');
      const numItem = items.find((i) => i.title === 'Numbered Impression List');
      expect(numItem).toBeDefined();

      numItem?.action(editor);
      expect(editor.getHTML()).toContain('<ol>');
    });
  });
});
