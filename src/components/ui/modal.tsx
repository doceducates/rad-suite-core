'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-card w-full rounded-2xl border border-outline-variant/60 shadow-2xl overflow-hidden',
          'flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 text-xs text-on-surface',
          SIZE_CLASSES[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  className,
  onClose,
  showCloseButton = true,
  children,
}: {
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'px-5 py-3.5 border-b border-outline-variant/60 bg-surface-container flex items-center justify-between shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">{children}</div>
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ModalTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={cn('font-bold text-sm text-on-surface truncate', className)}>{children}</h2>;
}

export function ModalDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn('text-[11px] text-secondary truncate', className)}>{children}</p>;
}

export function ModalBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-5 space-y-3.5 overflow-y-auto flex-1', className)}>{children}</div>;
}

export function ModalFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-t border-outline-variant/60 bg-surface-container flex items-center justify-end gap-2 shrink-0',
        className
      )}
    >
      {children}
    </div>
  );
}
