'use client';

// Layer 4 (Presentation): Notion-Style Gutter Badges & Multi-Comment Stacked Cards
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { ClinicalCommentItem } from './clinical-comment-types';
import {
  ClinicalGutterStackedCards,
  BlockCommentMeta,
} from './clinical-gutter-stacked-cards';
import { ClinicalGutterBadgesColumn } from './clinical-gutter-badges-column';

export interface ClinicalBlockGutterCommentsProps {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  commentsMap: Record<string, ClinicalCommentItem>;
  onOpenComment: (commentId: string, coords: { top: number; left: number }, quotedText: string) => void;
  onAddCommentForBlock: (pos: number, text: string) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  readOnly?: boolean;
}

export function ClinicalBlockGutterComments({
  editor,
  containerRef,
  commentsMap,
  onOpenComment,
  onAddCommentForBlock,
  onResolveComment,
  onDeleteComment,
  readOnly = false,
}: ClinicalBlockGutterCommentsProps) {
  const [blocks, setBlocks] = useState<BlockCommentMeta[]>([]);
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
  const [isWideMode, setIsWideMode] = useState(false);
  const [containerRight, setContainerRight] = useState(0);
  const [spaceToRight, setSpaceToRight] = useState(0);
  const [elevatedCommentId, setElevatedCommentId] = useState<string | null>(null);

  const blocksRef = useRef<BlockCommentMeta[]>([]);
  const measureBlocksRef = useRef<(() => void) | null>(null);
  const targetElementsRef = useRef<HTMLElement[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ clientX: number; clientY: number; target: HTMLElement } | null>(null);

  const handleHoverBlock = (index: number | null) => {
    if (index !== null) {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
      setHoveredBlockIndex(index);
    } else {
      leaveTimeoutRef.current = setTimeout(() => {
        setHoveredBlockIndex(null);
      }, 350);
    }
  };

  const measureBlocks = useCallback(() => {
    if (!editor || !containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const availRight = windowWidth - containerRect.right;

    const isWide = availRight >= 220;
    setIsWideMode((prev) => (prev !== isWide ? isWide : prev));
    setContainerRight((prev) => (Math.abs(prev - containerRect.right) > 1 ? containerRect.right : prev));
    setSpaceToRight((prev) => (Math.abs(prev - availRight) > 1 ? availRight : prev));

    const editorDom = editor.view.dom;
    const targetElements: HTMLElement[] = [];
    Array.from(editorDom.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        Array.from(el.children).forEach((li) => targetElements.push(li as HTMLElement));
      } else {
        targetElements.push(el);
      }
    });

    targetElementsRef.current = targetElements;
    const items: BlockCommentMeta[] = [];

    targetElements.forEach((el, index) => {
      try {
        const pos = editor.view.posAtDOM(el, 0);
        const elRect = el.getBoundingClientRect();
        const top = elRect.top - containerRect.top + container.scrollTop;
        const commentSpans = el.querySelectorAll('span[data-comment-id]');
        const blockCommentIds = new Set<string>();
        commentSpans.forEach((s) => {
          const cid = s.getAttribute('data-comment-id');
          if (cid) blockCommentIds.add(cid);
        });

        const activeComments: ClinicalCommentItem[] = Array.from(blockCommentIds).map((cid) => {
          if (commentsMap[cid]) return commentsMap[cid];
          const spanEl = el.querySelector(`span[data-comment-id="${cid}"]`);
          const quoted = spanEl?.textContent || el.textContent || '';
          return {
            id: cid,
            quotedText: quoted.slice(0, 80),
            authorName: 'Consultant Note',
            authorRole: 'consultant',
            comment: '',
            color: 'indigo',
            createdAt: new Date().toISOString(),
          };
        });

        items.push({
          blockIndex: index,
          pos,
          top: Math.max(0, top),
          lineClientTop: elRect.top,
          text: el.textContent || '',
          comments: activeComments,
        });
      } catch {}
    });

    blocksRef.current = items;
    setBlocks((prev) => {
      if (prev.length !== items.length) return items;
      for (let i = 0; i < prev.length; i++) {
        if (
          prev[i].blockIndex !== items[i].blockIndex ||
          prev[i].pos !== items[i].pos ||
          Math.abs(prev[i].top - items[i].top) > 1 ||
          prev[i].comments.length !== items[i].comments.length
        ) {
          return items;
        }
      }
      return prev;
    });
  }, [editor, containerRef, commentsMap]);

  measureBlocksRef.current = measureBlocks;

  useEffect(() => {
    if (!readOnly && editor) {
      measureBlocks();
    }
  }, [commentsMap, readOnly, editor, measureBlocks]);

  useEffect(() => {
    if (readOnly || !editor) return;
    const container = containerRef.current;
    if (!container) return;

    measureBlocks();

    const handleUpdate = () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => {
        measureBlocksRef.current?.();
      }, 80);
    };

    const editorDom = editor.view.dom;

    const processMouseMove = (clientX: number, clientY: number, rawTarget: HTMLElement) => {
      // 1. Keep hovered state alive if cursor is inside a stacked comment card
      if (rawTarget.closest('.clinical-stacked-comment-card')) {
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
          leaveTimeoutRef.current = null;
        }
        return;
      }

      // 2. Direct Right Gutter Hover: Check if mouse is hovering in the right margin/gutter column
      const containerRect = container.getBoundingClientRect();
      const isOverRightGutter = clientX >= containerRect.right - 44 && clientX <= containerRect.right + 20;
      const currentBlocks = blocksRef.current;

      if (isOverRightGutter && currentBlocks.length > 0) {
        const relativeY = clientY - containerRect.top + container.scrollTop;
        for (let i = 0; i < currentBlocks.length; i++) {
          const cur = currentBlocks[i];
          const next = currentBlocks[i + 1];
          const top = cur.top;
          const bottom = next ? next.top : cur.top + 32;
          if (relativeY >= top - 6 && relativeY < bottom - 4) {
            if (leaveTimeoutRef.current) {
              clearTimeout(leaveTimeoutRef.current);
              leaveTimeoutRef.current = null;
            }
            setHoveredBlockIndex(cur.blockIndex);
            return;
          }
        }
      }

      // 3. Text Block Hover: Check if cursor is over a list item or text block
      const targetLi = rawTarget.closest('li');
      const targetBlock = targetLi || rawTarget.closest('p, h1, h2, h3, h4, blockquote, pre');
      if (!targetBlock || !editorDom.contains(targetBlock)) {
        if (!leaveTimeoutRef.current) {
          leaveTimeoutRef.current = setTimeout(() => {
            setHoveredBlockIndex(null);
          }, 350);
        }
        return;
      }

      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }

      let idx = targetElementsRef.current.indexOf(targetBlock as HTMLElement);
      if (idx === -1) {
        idx = targetElementsRef.current.findIndex(
          (el) => el === targetBlock || el.contains(targetBlock)
        );
      }
      if (idx !== -1) {
        setHoveredBlockIndex(idx);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseRef.current = { clientX: e.clientX, clientY: e.clientY, target: e.target as HTMLElement };
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (lastMouseRef.current) {
          processMouseMove(
            lastMouseRef.current.clientX,
            lastMouseRef.current.clientY,
            lastMouseRef.current.target
          );
        }
      });
    };

    const handleMouseLeave = () => {
      leaveTimeoutRef.current = setTimeout(() => {
        setHoveredBlockIndex(null);
      }, 350);
    };

    const handleDocPointerDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.clinical-stacked-comment-card')) {
        setElevatedCommentId(null);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    document.addEventListener('pointerdown', handleDocPointerDown);
    editor.on('update', handleUpdate);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
      document.removeEventListener('pointerdown', handleDocPointerDown);
      editor.off('update', handleUpdate);
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [editor, containerRef, readOnly]);

  if (readOnly || blocks.length === 0) return null;

  return (
    <>
      <ClinicalGutterBadgesColumn
        blocks={blocks}
        hoveredBlockIndex={hoveredBlockIndex}
        onHoverBlock={handleHoverBlock}
        containerRef={containerRef}
        onOpenComment={onOpenComment}
        onAddCommentForBlock={onAddCommentForBlock}
      />

      <ClinicalGutterStackedCards
        isWideMode={isWideMode}
        blocks={blocks}
        spaceToRight={spaceToRight}
        containerRight={containerRight}
        containerRef={containerRef}
        elevatedCommentId={elevatedCommentId}
        setElevatedCommentId={setElevatedCommentId}
        onOpenComment={onOpenComment}
        onResolveComment={onResolveComment}
        onDeleteComment={onDeleteComment}
      />
    </>
  );
}
