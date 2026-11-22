'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/core';
import { moveBlockTo } from './clinical-block-helpers';

export function useBlockHandle(
  editor: Editor | null,
  containerRef: React.RefObject<HTMLDivElement | null>,
  readOnly: boolean,
  menuOpen: boolean
) {
  const [handleState, setHandleState] = useState<{
    visible: boolean;
    top: number;
    pos: number;
  }>({
    visible: false,
    top: 0,
    pos: 0,
  });

  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    targetPos: number;
    insertAfter: boolean;
  } | null>(null);

  const handleRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragSourcePosRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ clientX: number; clientY: number; target: HTMLElement } | null>(null);

  useEffect(() => {
    if (readOnly || !editor) return;
    const container = containerRef.current;
    if (!container) return;

    const processMouseMove = (clientX: number, clientY: number, rawTarget: HTMLElement) => {
      if (menuOpen || dragSourcePosRef.current !== null) return;
      if (handleRef.current?.contains(rawTarget as Node)) {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        return;
      }

      const editorDom = editor.view.dom;
      let target = rawTarget;

      // When hovering over left margin/gutter, detect block to the right of cursor
      if (target === editorDom || target === container) {
        const adjacentEl = document.elementFromPoint(clientX + 35, clientY) as HTMLElement;
        if (adjacentEl && editorDom.contains(adjacentEl)) {
          target = adjacentEl;
        }
      }

      if (!editorDom.contains(target)) {
        if (!hideTimeoutRef.current) {
          hideTimeoutRef.current = setTimeout(() => {
            setHandleState((prev) => ({ ...prev, visible: false }));
          }, 350);
        }
        return;
      }

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

      // If cursor is inside a list item (li), treat that li as the discrete block
      const liEl = target.closest('li');
      let block: HTMLElement | null = null;
      if (liEl && editorDom.contains(liEl)) {
        block = liEl as HTMLElement;
      } else {
        block = target;
        while (block && block.parentElement && block.parentElement !== editorDom) {
          block = block.parentElement;
        }
      }

      if (block && editorDom.contains(block)) {
        try {
          const pos = editor.view.posAtDOM(block, 0);
          const blockRect = block.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop = blockRect.top - containerRect.top + container.scrollTop;

          setHandleState({
            visible: true,
            top: relativeTop + 2,
            pos,
          });
        } catch {}
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (menuOpen || dragSourcePosRef.current !== null) return;
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
      if (menuOpen || dragSourcePosRef.current !== null) return;
      hideTimeoutRef.current = setTimeout(() => {
        setHandleState((prev) => ({ ...prev, visible: false }));
      }, 350);
    };

    const handleDragOver = (e: DragEvent) => {
      if (dragSourcePosRef.current === null) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }

      const editorDom = editor.view.dom;
      let target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target) return;

      const liTarget = target.closest('li');
      if (liTarget && editorDom.contains(liTarget)) {
        target = liTarget as HTMLElement;
      } else {
        while (target && target.parentElement && target.parentElement !== editorDom) {
          target = target.parentElement;
        }
      }

      if (target && editorDom.contains(target)) {
        try {
          const targetPos = editor.view.posAtDOM(target, 0);
          const blockRect = target.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const midY = blockRect.top + blockRect.height / 2;
          const insertAfter = e.clientY > midY;

          const indicatorTop = insertAfter
            ? blockRect.bottom - containerRect.top + container.scrollTop
            : blockRect.top - containerRect.top + container.scrollTop;

          setDropIndicator({
            top: indicatorTop,
            targetPos,
            insertAfter,
          });
        } catch {}
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!container.contains(e.relatedTarget as Node)) {
        setDropIndicator(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const sourcePos = dragSourcePosRef.current;
      if (sourcePos !== null && dropIndicator) {
        moveBlockTo(editor, sourcePos, dropIndicator.targetPos, dropIndicator.insertAfter);
      }
      dragSourcePosRef.current = null;
      setDropIndicator(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [editor, containerRef, readOnly, menuOpen, dropIndicator]);

  const currentPos = handleState.pos;

  const handleDragStart = (e: React.DragEvent) => {
    dragSourcePosRef.current = currentPos;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(currentPos));
  };

  const handleDragEnd = () => {
    dragSourcePosRef.current = null;
    setDropIndicator(null);
  };

  return {
    handleState,
    dropIndicator,
    handleRef,
    hideTimeoutRef,
    currentPos,
    handleDragStart,
    handleDragEnd,
  };
}
